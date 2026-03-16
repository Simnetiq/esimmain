import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, adminKey } = body;

    const expectedAdminKey = process.env.ADMIN_SECRET_KEY;
    if (!expectedAdminKey) return NextResponse.json({ error: 'Server misconfiguration: ADMIN_SECRET_KEY not set' }, { status: 503 });
    const a = Buffer.from(adminKey || '');
    const b = Buffer.from(expectedAdminKey);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data: orderData, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (error || !orderData) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    if (orderData.status === 'completed' && orderData.esim_created) {
      return NextResponse.json({ success: true, message: 'Order already completed', orderData });
    }

    const packageId = orderData.package_id || orderData.plan_id;
    if (!packageId) return NextResponse.json({ error: 'No package ID found in order' }, { status: 400 });

    const airaloMode = process.env.AIRALO_MODE || 'production';
    const isSandbox = airaloMode === 'sandbox' || airaloMode === 'test';
    const clientId = isSandbox ? (process.env.AIRALO_CLIENT_ID_SANDBOX || process.env.AIRALO_CLIENT_ID) : process.env.AIRALO_CLIENT_ID;
    const clientSecret = isSandbox ? (process.env.AIRALO_CLIENT_SECRET_SANDBOX || process.env.AIRALO_CLIENT_SECRET) : process.env.AIRALO_CLIENT_SECRET;
    const airaloBaseUrl = isSandbox ? (process.env.AIRALO_BASE_URL_SANDBOX || 'https://sandbox-partners-api.airalo.com') : (process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com');
    
    if (!clientId || !clientSecret) return NextResponse.json({ error: 'Airalo credentials not configured' }, { status: 500 });

    const authResponse = await fetch(`${airaloBaseUrl}/v2/token`, { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }) });
    if (!authResponse.ok) return NextResponse.json({ error: `Airalo authentication failed: ${await authResponse.text()}` }, { status: 500 });

    const authData = await authResponse.json();
    const accessToken = authData.data?.access_token;
    if (!accessToken) return NextResponse.json({ error: 'No access token received from Airalo' }, { status: 500 });

    const orderResponse = await fetch(`${airaloBaseUrl}/v2/orders`, { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ package_id: packageId, quantity: 1, type: 'sim', description: `Retry order ${orderId}` }) });
    if (!orderResponse.ok) return NextResponse.json({ error: `Airalo order creation failed: ${await orderResponse.text()}` }, { status: 500 });

    const airaloOrderResult = await orderResponse.json();
    const airaloOrder = airaloOrderResult.data;
    const airaloOrderId = airaloOrder?.id;
    const simData = airaloOrder?.sims?.[0];
    if (!airaloOrderId) return NextResponse.json({ error: 'No order ID returned from Airalo' }, { status: 500 });

    const now = new Date().toISOString();
    const lpaString = simData?.qrcode || simData?.lpa;
    
    const esimUpdateData = {
      status: 'completed', airalo_order_id: airaloOrderId, airalo_order_data: airaloOrder,
      order_data: airaloOrder, esim_created: true, esim_created_at: now, completed_at: now,
      updated_at: now, manually_retried: true, retried_at: now
    };

    if (simData) {
      esimUpdateData.iccid = simData.iccid || null;
      esimUpdateData.qr_code = lpaString || null;
      esimUpdateData.qr_code_url = simData.qrcode_url || null;
      esimUpdateData.direct_apple_installation_url = simData.direct_apple_installation_url || simData.qrcode_url || null;
      esimUpdateData.matching_id = simData.matching_id || null;
      esimUpdateData.activation_code = simData.activation_code || simData.matching_id || null;
      esimUpdateData.sim_data = simData;
    }

    await supabase.from('orders').update(esimUpdateData).eq('id', orderId);

    if (orderData.user_id) {
      const { data: existing } = await supabase.from('user_esims').select('id').eq('id', orderId).eq('user_id', orderData.user_id).single();
      if (existing) {
        await supabase.from('user_esims').update(esimUpdateData).eq('id', orderId).eq('user_id', orderData.user_id);
      } else {
        await supabase.from('user_esims').upsert({ ...orderData, ...esimUpdateData, id: orderId, user_id: orderData.user_id });
      }
    }

    return NextResponse.json({ success: true, message: 'Order processed successfully', orderId, airaloOrderId, iccid: simData?.iccid, qrCode: simData?.qrcode || simData?.lpa });
  } catch (error) {
    return NextResponse.json({ error: `Failed to retry order: ${error.message}` }, { status: 500 });
  }
}
