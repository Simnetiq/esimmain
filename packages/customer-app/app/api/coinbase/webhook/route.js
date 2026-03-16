import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import { formatPriceNumber } from '@esim/shared/utils/priceUtils';

const COINBASE_WEBHOOK_SECRET = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;

export async function POST(request) {
  try {
    const signature = request.headers.get('x-cc-webhook-signature');
    const rawBody = await request.text();

    if (!COINBASE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const crypto = await import('crypto');
    const { createHmac, timingSafeEqual } = crypto;
    const computedSignature = createHmac('sha256', COINBASE_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const sigA = Buffer.from(computedSignature);
    const sigB = Buffer.from(signature);
    if (sigA.length !== sigB.length || !timingSafeEqual(sigA, sigB)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const { type, data } = event.event;
    const metadata = data.metadata || {};
    const orderId = metadata.orderId;
    const userId = metadata.userId;
    const customerEmail = metadata.customerEmail;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    let orderStatus = 'pending';
    let shouldProcessOrder = false;

    switch (type) {
      case 'charge:created': orderStatus = 'pending'; break;
      case 'charge:confirmed': orderStatus = 'confirmed'; shouldProcessOrder = true; break;
      case 'charge:failed': orderStatus = 'failed'; break;
      case 'charge:delayed': orderStatus = 'delayed'; break;
      case 'charge:pending': orderStatus = 'pending'; break;
      case 'charge:resolved': orderStatus = 'completed'; shouldProcessOrder = true; break;
      default: break;
    }

    // Update order
    try {
      const { data: orderDoc } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!orderDoc) {
        await supabase.from('orders').upsert({
          id: orderId,
          user_id: userId,
          plan_id: metadata.planId,
          customer_email: customerEmail,
          payment_provider: 'coinbase',
          charge_id: data.id,
          charge_code: data.code,
          status: orderStatus,
          payment_data: data,
          updated_at: now,
          webhook_received_at: now
        });
      } else {
        await supabase
          .from('orders')
          .update({
            status: orderStatus,
            payment_data: data,
            updated_at: now,
            webhook_received_at: now
          })
          .eq('id', orderId);
      }
    } catch {
      return NextResponse.json({ error: 'Database error' });
    }

    if (shouldProcessOrder) {
      try {
        const { data: orderData } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        
        if (!orderData) {
          return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        
        if (orderData.esim_created || orderData.status === 'completed' || orderData.processed) {
          return NextResponse.json({ success: true, message: 'Already processed' });
        }
        
        // Verify payment amount
        const paidAmount = parseFloat(data.pricing?.local?.amount || 0);
        const expectedAmount = orderData.amount;
        
        if (paidAmount > 0 && Math.abs(paidAmount - expectedAmount) > 0.01) {
          try {
            await supabase.from('fraud_attempts').insert({
              type: 'coinbase_payment_mismatch',
              order_id: orderId,
              paid_amount: paidAmount,
              expected_amount: expectedAmount,
              charge_id: data.id,
              customer_email: orderData.customer_email,
              created_at: now
            });
          } catch (e) { /* ignore */ }
          
          if (paidAmount < expectedAmount - 0.01) {
            await supabase.from('orders').update({
              status: 'payment_mismatch',
              payment_status: 'failed',
              error_message: 'Payment amount mismatch',
              updated_at: now
            }).eq('id', orderId);
            return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
          }
        }
        
        // Create eSIM via Airalo
        const airaloMode = process.env.AIRALO_MODE || 'production';
        const isSandbox = airaloMode === 'sandbox' || airaloMode === 'test';
        const clientId = isSandbox ? (process.env.AIRALO_CLIENT_ID_SANDBOX || process.env.AIRALO_CLIENT_ID) : process.env.AIRALO_CLIENT_ID;
        const clientSecret = isSandbox ? (process.env.AIRALO_CLIENT_SECRET_SANDBOX || process.env.AIRALO_CLIENT_SECRET) : process.env.AIRALO_CLIENT_SECRET;
        const airaloBaseUrl = isSandbox ? (process.env.AIRALO_BASE_URL_SANDBOX || 'https://sandbox-partners-api.airalo.com') : (process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com');
        
        if (!clientId || !clientSecret) {
          return NextResponse.json({ error: 'eSIM service not configured' }, { status: 503 });
        }
        
        const authResponse = await fetch(`${airaloBaseUrl}/v2/token`, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' })
        });

        if (!authResponse.ok) throw new Error(`Airalo authentication failed: ${await authResponse.text()}`);

        const authData = await authResponse.json();
        const accessToken = authData.data?.access_token;
        if (!accessToken) throw new Error('No access token received from Airalo');
        
        const orderResponse = await fetch(`${airaloBaseUrl}/v2/orders`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ package_id: orderData.plan_id || orderData.package_id, quantity: 1, type: 'sim', description: `eSIM order ${orderId} for ${customerEmail}` })
        });
        
        if (!orderResponse.ok) throw new Error(`Order creation failed: ${await orderResponse.text()}`);
        
        const orderResult = await orderResponse.json();
        if (!orderResult.data) throw new Error(orderResult.message || 'Unknown error from Airalo API');
        
        const simData = orderResult.data?.sims?.[0];
        const lpaString = simData?.qrcode || simData?.lpa;
        
        const esimUpdateData = {
          status: 'completed',
          payment_status: 'paid',
          airalo_order_id: orderResult.data.id,
          order_data: orderResult.data,
          airalo_order_data: orderResult.data,
          is_test_mode: false,
          processed: true,
          processed_at: now,
          updated_at: now
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
        
        if (userId) {
          const { data: existingUserOrder } = await supabase.from('user_esims').select('id').eq('id', orderId).eq('user_id', userId).single();
          if (existingUserOrder) {
            await supabase.from('user_esims').update(esimUpdateData).eq('id', orderId).eq('user_id', userId);
          } else {
            await supabase.from('user_esims').upsert({ ...orderData, ...esimUpdateData, id: orderId, user_id: userId });
          }
        }
        
        // Send purchase confirmation email
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';
          const userLanguage = orderData.language || 'en';
          const qrCodeUrl = `${baseUrl}/dashboard?order=${orderId}`;
          
          await fetch(`${baseUrl}/api/send-purchase-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: customerEmail,
              name: orderData.customer_name || orderData.plan_name || 'Customer',
              orderNumber: orderId,
              planName: orderData.plan_name || 'eSIM Plan',
              amount: formatPriceNumber(orderData.amount || 0),
              currency: (orderData.currency || 'USD').toUpperCase(),
              qrCodeUrl,
              language: userLanguage
            })
          });
        } catch { /* Don't fail webhook if email fails */ }
        
      } catch (error) {
        try {
          await supabase.from('orders').update({
            processing_error: error.message,
            processing_error_at: now
          }).eq('id', orderId);
        } catch { /* ignore */ }
        
        return NextResponse.json({ error: 'Failed to process order', details: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, orderId, status: orderStatus });

  } catch {
    return NextResponse.json({ error: 'Internal server error' });
  }
}
