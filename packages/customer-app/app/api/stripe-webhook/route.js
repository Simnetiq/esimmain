import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import {
  trackCompletedPurchase,
  trackFailedPurchase
} from '@esim/shared/services/fraudDetectionService';
import {
  recordBlockedPayment,
  syncToStripeRadar
} from '@esim/shared/services/fraudSignalsService';
import {
  confirmPromoRedemption,
  releasePromoReservation,
} from '@esim/shared/services/promoServerService';

// Allow up to 60 s — Airalo auth + order creation requires ~3-8 s.
// Without this, Vercel kills the function at the 10 s default.
export const maxDuration = 60;

const getStripeSecretKey = () => {
  const stripeMode = process.env.STRIPE_MODE || 'live';
  if (stripeMode === 'test' || stripeMode === 'sandbox') return process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
  return process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
};

const getWebhookSecret = () => {
  const stripeMode = process.env.STRIPE_MODE || 'live';
  if (stripeMode === 'test' || stripeMode === 'sandbox') return process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET;
  return process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET;
};

const stripeSecretKey = getStripeSecretKey();
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia',
  timeout: 30000,
}) : null;

function getSupabase() { return getSupabaseAdmin(); }

/** Persist every event to webhook_events for forensic debugging. */
async function logWebhookEvent(supabase, eventId, type, status, orderId, errorMessage, payload) {
  try {
    await supabase.from('webhook_events').upsert({
      id: eventId,
      type,
      status,
      order_id: orderId || null,
      error_message: errorMessage || null,
      raw_payload: payload || null,
      processed_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[stripe-webhook] Failed to log event:', e.message);
  }
}

export async function POST(request) {
  const supabase = getSupabase();
  let event = null;

  try {
    const webhookSecret = getWebhookSecret();
    if (!stripe || !stripeSecretKey) {
      console.error('[stripe-webhook] Stripe not configured — STRIPE_SECRET_KEY_LIVE missing');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    // ── SECURITY: Webhook signature MUST be verified. Never skip. ─────────────
    if (!webhookSecret) {
      console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured — rejecting. STRIPE_MODE =', process.env.STRIPE_MODE);
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[stripe-webhook] Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[stripe-webhook] Signature verification failed:', err.message);
      // Log to DB so we can see it in admin
      await supabase.from('webhook_events').upsert({
        id: `sig_fail_${Date.now()}`,
        type: 'signature_failure',
        status: 'failed',
        error_message: err.message,
        raw_payload: { stripeMode: process.env.STRIPE_MODE || 'live', secretConfigured: !!webhookSecret },
        processed_at: new Date().toISOString(),
      }).catch(() => {});
      return NextResponse.json({ error: `Webhook signature invalid: ${err.message}` }, { status: 400 });
    }

    // Log received event immediately — lets us confirm delivery
    await logWebhookEvent(supabase, event.id, event.type, 'received',
      event.data.object?.metadata?.order_id || null, null, null);

    switch (event.type) {
      case 'checkout.session.completed': await handleCheckoutSessionCompleted(event.data.object); break;
      case 'payment_intent.succeeded': await handlePaymentIntentSucceeded(event.data.object); break;
      case 'payment_intent.payment_failed': await handlePaymentIntentFailed(event.data.object); break;
      case 'charge.refunded': await handleChargeRefunded(event.data.object); break;
      case 'charge.dispute.created': await handleDisputeCreated(event.data.object); break;
      case 'charge.succeeded': await handleChargeSucceeded(event.data.object); break;
      case 'charge.blocked': await handleChargeBlocked(event.data.object); break;
      case 'radar.early_fraud_warning.created': await handleEarlyFraudWarning(event.data.object); break;
      case 'payment_intent.requires_action': await handlePaymentRequiresAction(event.data.object); break;
      default: break;
    }

    await logWebhookEvent(supabase, event.id, event.type, 'processed',
      event.data.object?.metadata?.order_id || null, null, null);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[stripe-webhook] Unhandled error:', error);
    if (event) {
      await logWebhookEvent(supabase, event.id, event.type, 'failed',
        event.data.object?.metadata?.order_id || null, error.message, null).catch(() => {});
    }
    return NextResponse.json({ error: `Webhook handler failed: ${error.message}` }, { status: 500 });
  }
}

async function createAiraloEsim(orderId, orderData, supabase) {
  const packageId = orderData.plan_id;
  if (!packageId) throw new Error('No package ID found in order data');

  const airaloMode = process.env.AIRALO_MODE || 'production';
  const isSandbox = airaloMode === 'sandbox' || airaloMode === 'test';
  const clientId = isSandbox ? (process.env.AIRALO_CLIENT_ID_SANDBOX || process.env.AIRALO_CLIENT_ID) : process.env.AIRALO_CLIENT_ID;
  const clientSecret = isSandbox ? (process.env.AIRALO_CLIENT_SECRET_SANDBOX || process.env.AIRALO_CLIENT_SECRET) : process.env.AIRALO_CLIENT_SECRET;
  const airaloBaseUrl = isSandbox ? (process.env.AIRALO_BASE_URL_SANDBOX || 'https://sandbox-partners-api.airalo.com') : (process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com');

  if (!clientId || !clientSecret) throw new Error('Airalo API credentials not configured');

  const authResponse = await fetch(`${airaloBaseUrl}/v2/token`, { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }) });
  if (!authResponse.ok) throw new Error(`Airalo authentication failed: ${await authResponse.text()}`);
  const authData = await authResponse.json();
  const accessToken = authData.data?.access_token;
  if (!accessToken) throw new Error('No access token received from Airalo');

  // Airalo requires multipart/form-data for order submission
  const orderFormData = new FormData();
  orderFormData.append('package_id', packageId);
  orderFormData.append('quantity', '1');
  orderFormData.append('type', 'sim');
  orderFormData.append('description', `Order ${orderId} for ${orderData.customer_email || 'customer'}`);
  const orderResponse = await fetch(`${airaloBaseUrl}/v2/orders`, { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }, body: orderFormData });
  if (!orderResponse.ok) throw new Error(`Airalo order creation failed: ${await orderResponse.text()}`);

  const airaloOrderResult = await orderResponse.json();
  const airaloOrder = airaloOrderResult.data;
  if (!airaloOrder?.id) throw new Error('No order ID returned from Airalo');

  const simData = airaloOrder.sims?.[0];
  const now = new Date().toISOString();
  const lpaString = simData?.qrcode || simData?.lpa;

  const esimUpdateData = {
    status: 'completed',
    airalo_order_id: airaloOrder.id,
    airalo_order_data: airaloOrder,
    order_data: airaloOrder,
    esim_created: true,
    esim_created_at: now,
    completed_at: now,
    updated_at: now
  };

  if (simData) {
    esimUpdateData.iccid = simData.iccid || null;
    esimUpdateData.qr_code = lpaString || null;
    esimUpdateData.qr_code_url = simData.qrcode_url || null;
    esimUpdateData.direct_apple_installation_url = simData.direct_apple_installation_url || simData.qrcode_url || null;
    esimUpdateData.matching_id = simData.matching_id || null;
    esimUpdateData.activation_code = simData.activation_code || simData.matching_id || null;
    esimUpdateData.smdp_address = simData.lpa || null;
    esimUpdateData.sim_data = simData;
  }

  const { error: orderUpdateErr } = await supabase.from('orders').update(esimUpdateData).eq('id', orderId);
  if (orderUpdateErr) console.error('[webhook] orders update failed:', orderUpdateErr);

  if (orderData.user_id) {
    // user_esims doesn't have 'order_data' column — exclude it
    const { order_data: _od, ...userEsimUpdateData } = esimUpdateData;
    const { data: existing } = await supabase.from('user_esims').select('id').eq('id', orderId).eq('user_id', orderData.user_id).maybeSingle();
    if (existing) {
      const { error: ueErr } = await supabase.from('user_esims').update(userEsimUpdateData).eq('id', orderId).eq('user_id', orderData.user_id);
      if (ueErr) console.error('[webhook] user_esims update failed:', ueErr);
    } else {
      // Whitelist only columns that exist in user_esims
      const USER_ESIM_COLS = new Set([
        'id','user_id','order_id','unique_order_id','original_order_id',
        'plan_id','plan_name','country','country_code','country_region',
        'country_codes','is_regional','amount','currency','customer_email',
        'customer_name','user_email','status','payment_status',
        'payment_completed_at','stripe_session_id','stripe_payment_intent_id',
        'airalo_order_id','airalo_order_data','esim_created','esim_created_at',
        'completed_at','esim_error','iccid','qr_code','qr_code_url',
        'direct_apple_installation_url','matching_id','activation_code',
        'smdp_address','sim_data','language','source','platform',
        'is_test_mode','mode','security','price_validation','fraud_check',
        'metadata','created_at','updated_at'
      ]);
      const merged = { ...orderData, ...userEsimUpdateData, id: orderId, user_id: orderData.user_id };
      const filtered = Object.fromEntries(
        Object.entries(merged).filter(([k]) => USER_ESIM_COLS.has(k))
      );
      const { error: ueErr } = await supabase.from('user_esims').upsert(filtered);
      if (ueErr) console.error('[webhook] user_esims upsert failed:', ueErr);
    }
  }

  return { airaloOrder, simData, esimUpdateData };
}

async function handleTopupPayment(metadata, paidAmountCents, stripeObjectId, stripeObjectType, supabase) {
  const topupId = metadata.topup_id;
  if (!topupId) return;

  const now = new Date().toISOString();

  // Fetch topup record
  const { data: topup, error: fetchErr } = await supabase
    .from('esim_topups')
    .select('*')
    .eq('id', topupId)
    .single();

  if (fetchErr || !topup) {
    console.error(`[webhook-topup] Topup ${topupId} not found:`, fetchErr?.message);
    return;
  }

  // Idempotency guard: only process if still pending payment
  if (topup.status !== 'topup_pending_payment') {
    console.info(`[webhook-topup] Topup ${topupId} already processed (status: ${topup.status})`);
    return;
  }

  // Verify paid amount matches expected
  const paidAmount = paidAmountCents / 100;
  if (Math.abs(paidAmount - parseFloat(topup.price)) > 0.01) {
    console.error(`[webhook-topup] Amount mismatch: paid ${paidAmount}, expected ${topup.price}`);
    await supabase.from('esim_topups').update({
      status: 'topup_failed',
      error_message: `Payment amount mismatch: paid ${paidAmount}, expected ${topup.price}`,
      updated_at: now,
    }).eq('id', topupId);
    return;
  }

  // Atomic status transition: pending_payment -> submitting_to_airalo
  const stripeColumn = stripeObjectType === 'session' ? 'stripe_session_id' : 'stripe_payment_intent_id';
  const { data: claimed, error: claimErr } = await supabase
    .from('esim_topups')
    .update({
      status: 'topup_submitting_to_airalo',
      [stripeColumn]: stripeObjectId,
      updated_at: now,
    })
    .eq('id', topupId)
    .eq('status', 'topup_pending_payment')
    .select('id')
    .single();

  if (claimErr || !claimed) {
    console.warn(`[webhook-topup] Topup ${topupId} claim failed — already processing`);
    return;
  }

  // ── Submit top-up to Airalo ─────────────────────────────────────────────
  try {
    const airaloMode = process.env.AIRALO_MODE || 'production';
    const isSandbox = airaloMode === 'sandbox' || airaloMode === 'test';
    const clientId = isSandbox ? (process.env.AIRALO_CLIENT_ID_SANDBOX || process.env.AIRALO_CLIENT_ID) : process.env.AIRALO_CLIENT_ID;
    const clientSecret = isSandbox ? (process.env.AIRALO_CLIENT_SECRET_SANDBOX || process.env.AIRALO_CLIENT_SECRET) : process.env.AIRALO_CLIENT_SECRET;
    const airaloBaseUrl = isSandbox ? (process.env.AIRALO_BASE_URL_SANDBOX || 'https://sandbox-partners-api.airalo.com') : (process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com');

    if (!clientId || !clientSecret) throw new Error('Airalo API credentials not configured');

    // Authenticate
    const authResponse = await fetch(`${airaloBaseUrl}/v2/token`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
    });
    if (!authResponse.ok) throw new Error(`Airalo auth failed: ${await authResponse.text()}`);
    const authData = await authResponse.json();
    const accessToken = authData.data?.access_token;
    if (!accessToken) throw new Error('No access token from Airalo');

    // Submit top-up order — Airalo uses /v2/orders/topups with multipart/form-data
    const topupFormData = new FormData();
    topupFormData.append('package_id', topup.airalo_package_id);
    topupFormData.append('iccid', topup.iccid);
    topupFormData.append('description', `Top-up for ICCID ${topup.iccid}`);
    const orderResponse = await fetch(`${airaloBaseUrl}/v2/orders/topups`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' },
      body: topupFormData,
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      throw new Error(`Airalo top-up order failed (${orderResponse.status}): ${errorText}`);
    }

    const airaloResult = await orderResponse.json();
    const airaloOrder = airaloResult.data;

    if (!airaloOrder?.id) throw new Error('No order ID returned from Airalo');

    // Success
    await supabase.from('esim_topups').update({
      status: 'topup_success',
      airalo_order_id: String(airaloOrder.id),
      updated_at: new Date().toISOString(),
    }).eq('id', topupId);

    console.info(`[webhook-topup] Top-up ${topupId} succeeded. Airalo order: ${airaloOrder.id}`);
  } catch (airaloError) {
    console.error(`[webhook-topup] Airalo error for topup ${topupId}:`, airaloError.message);
    await supabase.from('esim_topups').update({
      status: 'topup_failed',
      error_message: airaloError.message,
      updated_at: new Date().toISOString(),
    }).eq('id', topupId);
  }
}

async function handleCheckoutSessionCompleted(session) {
  try {
    if (session.payment_status !== 'paid') return;

    // ── Top-up handling ─────────────────────────────────────────────────────
    if (session.metadata?.type === 'topup') {
      const supabase = getSupabase();
      await handleTopupPayment(session.metadata, session.amount_total, session.id, 'session', supabase);
      return;
    }

    const orderId = session.metadata?.order_id;
    if (!orderId) return;

    const supabase = getSupabase();
    const now = new Date().toISOString();
    const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (!orderData) return;
    if (orderData.esim_created || orderData.status === 'completed') return;

    const paidAmount = session.amount_total / 100;
    const expectedAmount = orderData.amount;

    if (Math.abs(paidAmount - expectedAmount) > 0.01) {
      let cardFingerprint = null, cardLast4 = null, cardBrand = null;
      try {
        if (session.payment_intent) {
          const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
          if (pi.payment_method) {
            const pm = await stripe.paymentMethods.retrieve(pi.payment_method);
            if (pm.card) { cardFingerprint = pm.card.fingerprint; cardLast4 = pm.card.last4; cardBrand = pm.card.brand; }
          }
        }
      } catch (e) { /* ignore */ }

      try {
        const { logPriceManipulationAttempt, addToBlocklist } = await import('@esim/shared/services/fraudDetectionService');
        await logPriceManipulationAttempt(supabase, { packageId: orderData.package_id, userId: orderData.user_id, email: orderData.customer_email, databasePrice: expectedAmount, submittedPrice: paidAmount, priceDifference: Math.abs(paidAmount - expectedAmount), cardFingerprint, cardLast4, cardBrand, sessionId: session.id, autoBlock: true, metadata: { type: 'webhook_payment_amount_mismatch', orderId, timestamp: now } });
        if (cardFingerprint) {
          await addToBlocklist(supabase, { userId: orderData.user_id, email: orderData.customer_email, cardFingerprint, cardLast4, cardBrand, reason: `AUTO-BLOCK: Price manipulation detected. Paid ${paidAmount}, expected ${expectedAmount}. Card ${cardBrand} ****${cardLast4}`, createdBy: 'webhook_fraud_detection', metadata: { orderId, sessionId: session.id, paidAmount, expectedAmount } });
        }
      } catch (e) { /* ignore */ }

      if (paidAmount < expectedAmount - 0.01) {
        await supabase.from('orders').update({ status: 'payment_mismatch', payment_status: 'failed', error_message: `Payment amount mismatch: paid ${paidAmount}, expected ${expectedAmount}`, fraud_blocked: true, updated_at: now }).eq('id', orderId);
        return;
      }
    }

    // ── Atomic mutex: only one process creates the eSIM ──────────────────────
    // UPDATE returns the row ONLY if status is still 'pending'/'processing' AND
    // esim_created is false. If two webhooks race, only one wins this UPDATE.
    const { data: claimed, error: claimErr } = await supabase
      .from('orders')
      .update({ status: 'creating_esim', payment_status: 'completed', payment_completed_at: now, stripe_session_id: session.id, stripe_payment_intent_id: session.payment_intent, updated_at: now })
      .eq('id', orderId)
      .eq('esim_created', false)
      .not('status', 'in', '(creating_esim,completed,esim_creation_failed)')
      .select('id')
      .single();

    if (claimErr || !claimed) {
      // Another process already claimed this order — idempotent, do nothing
      console.warn(`[webhook] Order ${orderId} claim failed — already processed or not found. claimErr:`, claimErr?.message);
      return;
    }

    // Confirm promo reservation — payment is good, slot is officially consumed
    await confirmPromoRedemption(supabase, orderId);

    try {
      await createAiraloEsim(orderId, orderData, supabase);
    } catch (airaloError) {
      console.error('❌ AIRALO ERROR:', airaloError.message);
      await supabase.from('orders').update({ status: 'esim_creation_failed', payment_status: 'completed', esim_created: false, esim_error: airaloError.message, esim_error_at: now, completed_at: now, updated_at: now }).eq('id', orderId);
    }
  } catch (error) { console.error('Error in handleCheckoutSessionCompleted:', error); }
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    // ── Top-up handling ─────────────────────────────────────────────────────
    if (paymentIntent.metadata?.type === 'topup') {
      const supabase = getSupabase();
      await handleTopupPayment(paymentIntent.metadata, paymentIntent.amount, paymentIntent.id, 'payment_intent', supabase);
      return;
    }

    const orderId = paymentIntent.metadata?.order_id;
    if (!orderId) return;

    const supabase = getSupabase();
    const now = new Date().toISOString();

    let pmFingerprint = null, pmLast4 = null, pmBrand = null;
    if (paymentIntent.payment_method) {
      try {
        const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
        if (pm.card) { pmFingerprint = pm.card.fingerprint; pmLast4 = pm.card.last4; pmBrand = pm.card.brand; }
      } catch (e) { /* ignore */ }
    }

    const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (!orderData) return;

    await trackCompletedPurchase(supabase, { orderId, userId: orderData.user_id, email: orderData.customer_email, amount: orderData.amount, currency: orderData.currency, paymentMethodFingerprint: pmFingerprint, paymentMethodLast4: pmLast4, paymentMethodBrand: pmBrand, riskScore: orderData.fraud_check?.riskScore || 0, riskFactors: orderData.fraud_check?.riskFactors || [], attemptId: orderData.fraud_check?.attemptId, metadata: { stripePaymentIntentId: paymentIntent.id, stripeChargeId: paymentIntent.latest_charge } });

    await supabase.from('orders').update({ 'payment_method_fingerprint': pmFingerprint, 'payment_method_last4': pmLast4, 'payment_method_brand': pmBrand, stripe_payment_intent_id: paymentIntent.id, updated_at: now }).eq('id', orderId);

    // ── Skip if this order came from a Checkout Session ───────────────────────
    // checkout.session.completed is the canonical handler for session-based
    // payments. payment_intent.succeeded fires too, creating a race for eSIM
    // creation. Only process here for direct PaymentIntent flows (mobile).
    if (orderData.stripe_session_id) {
      console.info(`[webhook] payment_intent.succeeded for session-based order ${orderId} — handled by checkout.session.completed`);
      return;
    }

    if (!orderData.esim_created) {
      const paidAmount = paymentIntent.amount / 100;
      if (paidAmount < (orderData.amount ?? 0) - 0.01) {
        await supabase.from('orders').update({ status: 'payment_mismatch', payment_status: 'failed', error_message: 'Payment amount mismatch', updated_at: now }).eq('id', orderId);
        return;
      }

      // Same atomic mutex — prevents duplicate eSIM if both handlers fire
      const { data: claimed } = await supabase
        .from('orders')
        .update({ status: 'creating_esim', payment_status: 'completed', payment_completed_at: now, stripe_payment_intent_id: paymentIntent.id, updated_at: now })
        .eq('id', orderId)
        .eq('esim_created', false)
        .not('status', 'in', '(creating_esim,completed,esim_creation_failed)')
        .select('id')
        .single();

      if (!claimed) return; // Another handler already claimed it

      try {
        await createAiraloEsim(orderId, orderData, supabase);
      } catch (airaloError) {
        await supabase.from('orders').update({ status: 'esim_creation_failed', payment_status: 'completed', esim_created: false, esim_error: airaloError.message, esim_error_at: now, completed_at: now, updated_at: now }).eq('id', orderId);
      }
    }
  } catch (error) { console.error('Error handling payment intent succeeded:', error); }
}

async function handlePaymentIntentFailed(paymentIntent) {
  try {
    const orderId = paymentIntent.metadata?.order_id;
    const email = paymentIntent.receipt_email || paymentIntent.metadata?.email;
    const userId = paymentIntent.metadata?.userId;
    const supabase = getSupabase();
    const now = new Date().toISOString();

    const wasBlockedByRadar = paymentIntent.last_payment_error?.type === 'card_error' && (paymentIntent.last_payment_error?.decline_code === 'fraudulent' || paymentIntent.last_payment_error?.decline_code === 'merchant_blacklist' || paymentIntent.charges?.data?.[0]?.outcome?.type === 'blocked');

    let cardFingerprint = null, cardLast4 = null, cardBrand = null;
    if (paymentIntent.last_payment_error?.payment_method?.card) {
      cardFingerprint = paymentIntent.last_payment_error.payment_method.card.fingerprint;
      cardLast4 = paymentIntent.last_payment_error.payment_method.card.last4;
      cardBrand = paymentIntent.last_payment_error.payment_method.card.brand;
    } else if (paymentIntent.payment_method) {
      try { const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method); if (pm.card) { cardFingerprint = pm.card.fingerprint; cardLast4 = pm.card.last4; cardBrand = pm.card.brand; } } catch (e) { /* ignore */ }
    }

    if (wasBlockedByRadar || paymentIntent.last_payment_error?.decline_code === 'do_not_honor') {
      await recordBlockedPayment(supabase, { userId, email, cardFingerprint, cardLast4, cardBrand, stripePaymentIntentId: paymentIntent.id, blockReason: paymentIntent.last_payment_error?.decline_code || 'payment_failed', riskLevel: wasBlockedByRadar ? 'highest' : 'high', riskScore: wasBlockedByRadar ? 100 : 70, metadata: { orderId, errorType: paymentIntent.last_payment_error?.type, errorCode: paymentIntent.last_payment_error?.code, declineCode: paymentIntent.last_payment_error?.decline_code, errorMessage: paymentIntent.last_payment_error?.message } });
    }

    if (!orderId) return;
    const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (!orderData) return;

    await supabase.from('orders').update({ status: wasBlockedByRadar ? 'blocked' : 'failed', payment_status: wasBlockedByRadar ? 'blocked' : 'failed', failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed', failure_code: paymentIntent.last_payment_error?.code, decline_code: paymentIntent.last_payment_error?.decline_code, was_blocked_by_radar: wasBlockedByRadar, blocked_card: cardFingerprint ? `${cardBrand} ****${cardLast4}` : null, updated_at: now }).eq('id', orderId);

    await trackFailedPurchase(supabase, { attemptId: orderData.fraud_check?.attemptId, failureReason: paymentIntent.last_payment_error?.message || 'Payment failed', metadata: { orderId, stripePaymentIntentId: paymentIntent.id, failureCode: paymentIntent.last_payment_error?.code, wasBlockedByRadar, cardFingerprint } });

    // Release promo reservation — payment failed, return the slot
    await releasePromoReservation(supabase, orderId);
  } catch (error) { console.error('Error handling payment intent failed:', error); }
}

async function handleChargeSucceeded(charge) {
  try {
    const orderId = charge.metadata?.order_id;
    if (!orderId) return;
    const supabase = getSupabase();
    const threeDSecure = charge.payment_method_details?.card?.three_d_secure;
    if (threeDSecure) {
      await supabase.from('orders').update({ authentication_three_d_secure: { authenticated: threeDSecure.authenticated, result: threeDSecure.result, version: threeDSecure.version }, updated_at: new Date().toISOString() }).eq('id', orderId);
    }
  } catch (error) { console.error('Error handling charge succeeded:', error); }
}

async function handleChargeRefunded(charge) {
  try {
    const orderId = charge.metadata?.order_id;
    if (!orderId) return;
    const supabase = getSupabase();
    await supabase.from('orders').update({ status: 'refunded', payment_status: 'refunded', refunded_at: new Date().toISOString(), refund_amount: charge.amount_refunded / 100, updated_at: new Date().toISOString() }).eq('id', orderId);
  } catch (error) { console.error('Error handling charge refunded:', error); }
}

async function handleDisputeCreated(dispute) {
  try {
    const charge = await stripe.charges.retrieve(dispute.charge);
    const orderId = charge.metadata?.order_id;
    if (!orderId) return;
    const supabase = getSupabase();
    const now = new Date().toISOString();
    await supabase.from('orders').update({ status: 'disputed', dispute: { id: dispute.id, amount: dispute.amount / 100, reason: dispute.reason, status: dispute.status, createdAt: now }, updated_at: now }).eq('id', orderId);

    const { data: orderData } = await supabase.from('orders').select('user_id').eq('id', orderId).single();
    if (orderData?.user_id) {
      const { data: userData } = await supabase.from('users').select('fraud_flags').eq('id', orderData.user_id).single();
      const disputeCount = (userData?.fraud_flags?.disputeCount || 0) + 1;
      await supabase.from('users').update({ fraud_flags: { ...(userData?.fraud_flags || {}), disputeCount, lastDisputeAt: now }, updated_at: now }).eq('id', orderData.user_id);
    }
  } catch (error) { console.error('Error handling dispute created:', error); }
}

async function handleChargeBlocked(charge) {
  try {
    const orderId = charge.metadata?.order_id;
    const email = charge.receipt_email || charge.billing_details?.email || charge.metadata?.email;
    const userId = charge.metadata?.userId;
    const supabase = getSupabase();
    const now = new Date().toISOString();

    let cardFingerprint = null, cardLast4 = null, cardBrand = null;
    if (charge.payment_method_details?.card) { cardFingerprint = charge.payment_method_details.card.fingerprint; cardLast4 = charge.payment_method_details.card.last4; cardBrand = charge.payment_method_details.card.brand; }
    const countryCode = charge.payment_method_details?.card?.country;

    await recordBlockedPayment(supabase, { userId, email, cardFingerprint, cardLast4, cardBrand, stripePaymentIntentId: charge.payment_intent, stripeChargeId: charge.id, blockReason: charge.outcome?.reason || 'highest_risk_level', riskLevel: charge.outcome?.risk_level || 'highest', riskScore: charge.outcome?.risk_score || 100, countryCode, metadata: { orderId, outcomeType: charge.outcome?.type, sellerMessage: charge.outcome?.seller_message, networkStatus: charge.outcome?.network_status } });

    if (orderId) {
      const { data: orderDoc } = await supabase.from('orders').select('id').eq('id', orderId).single();
      if (orderDoc) {
        await supabase.from('orders').update({ status: 'blocked', payment_status: 'blocked', blocked_at: now, blocked_reason: charge.outcome?.seller_message || 'Blocked by Radar', blocked_card: cardFingerprint ? `${cardBrand} ****${cardLast4}` : null, risk_level: charge.outcome?.risk_level, updated_at: now }).eq('id', orderId);
      }
    }
  } catch (error) { console.error('Error handling charge blocked:', error); }
}

async function handleEarlyFraudWarning(warning) {
  try {
    const chargeId = warning.charge;
    const charge = await stripe.charges.retrieve(chargeId);
    const orderId = charge.metadata?.order_id;
    const email = charge.receipt_email || charge.billing_details?.email || charge.metadata?.email;
    const userId = charge.metadata?.userId;
    const supabase = getSupabase();
    const now = new Date().toISOString();

    let cardFingerprint = null, cardLast4 = null, cardBrand = null;
    if (charge.payment_method_details?.card) { cardFingerprint = charge.payment_method_details.card.fingerprint; cardLast4 = charge.payment_method_details.card.last4; cardBrand = charge.payment_method_details.card.brand; }

    await recordBlockedPayment(supabase, { userId, email, cardFingerprint, cardLast4, cardBrand, stripePaymentIntentId: charge.payment_intent, stripeChargeId: charge.id, blockReason: 'early_fraud_warning', riskLevel: 'highest', riskScore: 100, metadata: { orderId, fraudType: warning.fraud_type, actionable: warning.actionable, warningId: warning.id } });

    if (orderId) {
      await supabase.from('orders').update({ fraud_warning: { id: warning.id, fraudType: warning.fraud_type, createdAt: now, actionable: warning.actionable }, updated_at: now }).eq('id', orderId);
    }

    if (warning.actionable) {
      await supabase.from('fraud_warnings').upsert({ id: warning.id, warning_id: warning.id, charge_id: chargeId, order_id: orderId, user_id: userId, email, card_fingerprint: cardFingerprint, card_last4: cardLast4, card_brand: cardBrand, fraud_type: warning.fraud_type, actionable: warning.actionable, created_at: now, reviewed: false, action: null });
    }
  } catch (error) { console.error('Error handling early fraud warning:', error); }
}

async function handlePaymentRequiresAction(paymentIntent) {
  try {
    const orderId = paymentIntent.metadata?.order_id;
    if (!orderId) return;
    const supabase = getSupabase();
    const now = new Date().toISOString();

    const { data: orderData } = await supabase.from('orders').select('three_ds_attempts').eq('id', orderId).single();
    if (orderData) {
      const threeDSAttempts = (orderData.three_ds_attempts || 0) + 1;
      await supabase.from('orders').update({ three_ds_attempts: threeDSAttempts, last_three_ds_at: now, updated_at: now }).eq('id', orderId);

      if (threeDSAttempts >= 3) {
        const email = paymentIntent.receipt_email || paymentIntent.metadata?.email;
        const userId = paymentIntent.metadata?.userId;
        await recordBlockedPayment(supabase, { userId, email, stripePaymentIntentId: paymentIntent.id, blockReason: 'repeated_3ds_failures', riskLevel: 'high', riskScore: 60, metadata: { orderId, threeDSAttempts } });
      }
    }
  } catch (error) { /* ignore */ }
}
