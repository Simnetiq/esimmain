import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';

async function processStuckOrder(supabase, orderId, orderData) {
  try {
    const packageId = orderData.package_id || orderData.plan_id;
    if (!packageId) throw new Error('No package ID found');

    const airaloMode = process.env.AIRALO_MODE || 'production';
    const isSandbox = airaloMode === 'sandbox' || airaloMode === 'test';
    const clientId = isSandbox ? (process.env.AIRALO_CLIENT_ID_SANDBOX || process.env.AIRALO_CLIENT_ID) : process.env.AIRALO_CLIENT_ID;
    const clientSecret = isSandbox ? (process.env.AIRALO_CLIENT_SECRET_SANDBOX || process.env.AIRALO_CLIENT_SECRET) : process.env.AIRALO_CLIENT_SECRET;
    const airaloBaseUrl = isSandbox ? (process.env.AIRALO_BASE_URL_SANDBOX || 'https://sandbox-partners-api.airalo.com') : (process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com');
    
    if (!clientId || !clientSecret) throw new Error('Airalo credentials not configured');

    const authResponse = await fetch(`${airaloBaseUrl}/v2/token`, { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }) });
    if (!authResponse.ok) throw new Error(`Auth failed: ${await authResponse.text()}`);
    const authData = await authResponse.json();
    const accessToken = authData.data?.access_token;
    if (!accessToken) throw new Error('No access token received');

    const orderResponse = await fetch(`${airaloBaseUrl}/v2/orders`, { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ package_id: packageId, quantity: 1, type: 'sim', description: `Auto-fix order ${orderId}` }) });
    if (!orderResponse.ok) throw new Error(`Order creation failed: ${await orderResponse.text()}`);

    const airaloOrderResult = await orderResponse.json();
    const airaloOrder = airaloOrderResult.data;
    const airaloOrderId = airaloOrder?.id;
    const simData = airaloOrder?.sims?.[0];
    if (!airaloOrderId) throw new Error('No order ID returned from Airalo');

    const now = new Date().toISOString();
    const esimUpdateData = {
      status: 'completed', airalo_order_id: airaloOrderId, airalo_order_data: airaloOrder,
      esim_created: true, esim_created_at: now, completed_at: now, updated_at: now,
      auto_fixed: true, fixed_at: now
    };

    if (simData) {
      if (simData.iccid) esimUpdateData.iccid = simData.iccid;
      if (simData.lpa) esimUpdateData.lpa = simData.lpa;
      if (simData.matching_id) esimUpdateData.matching_id = simData.matching_id;
      if (simData.qrcode || simData.lpa) esimUpdateData.qr_code = simData.qrcode || simData.lpa;
      if (simData.qrcode_url) esimUpdateData.qr_code_url = simData.qrcode_url;
      if (simData.activation_code) esimUpdateData.activation_code = simData.activation_code;
      esimUpdateData.sim_data = simData;
    }

    await supabase.from('orders').update(esimUpdateData).eq('id', orderId);

    if (orderData.user_id) {
      try { await supabase.from('user_esims').update(esimUpdateData).eq('id', orderId).eq('user_id', orderData.user_id); } catch (e) { /* ignore */ }
    }

    return { success: true, orderId, airaloOrderId, iccid: simData?.iccid, packageId };
  } catch (error) {
    return { success: false, orderId, error: error.message };
  }
}

async function handleRequest(adminKey) {
  const expectedAdminKey = process.env.ADMIN_SECRET_KEY || 'change-me-in-production';
  if (adminKey !== expectedAdminKey) {
    return NextResponse.json({ error: 'Unauthorized - Invalid admin key' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data: stuckOrders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('payment_status', 'completed')
    .neq('esim_created', true);

  if (error) throw error;

  if (!stuckOrders || stuckOrders.length === 0) {
    return NextResponse.json({ success: true, message: 'No stuck orders found', fixed: [], failed: [] });
  }

  const results = { fixed: [], failed: [], total: stuckOrders.length };

  for (const order of stuckOrders) {
    if (order.esim_created || order.status === 'completed') continue;
    const result = await processStuckOrder(supabase, order.id, order);
    if (result.success) results.fixed.push(result);
    else results.failed.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return NextResponse.json({
    success: true,
    message: `Processed ${results.total} orders. Fixed: ${results.fixed.length}, Failed: ${results.failed.length}`,
    ...results
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    return await handleRequest(searchParams.get('key'));
  } catch (error) {
    return NextResponse.json({ error: `Failed: ${error.message}` }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    return await handleRequest(body.adminKey);
  } catch (error) {
    return NextResponse.json({ error: `Failed: ${error.message}` }, { status: 500 });
  }
}
