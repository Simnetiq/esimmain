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
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' }) : null;

function getSupabase() { return getSupabaseAdmin(); }

export async function POST(request) {
  try {
    const webhookSecret = getWebhookSecret();
    if (!stripe || !stripeSecretKey) { console.error('Stripe not configured'); return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 }); }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    let event;

    if (webhookSecret && signature) {
      try { event = stripe.webhooks.constructEvent(body, signature, webhookSecret); }
      catch (err) { console.error('Webhook signature verification failed:', err.message); return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 }); }
    } else { event = JSON.parse(body); }

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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: `Webhook handler failed: ${error.message}` }, { status: 500 });
  }
}

async function createAiraloEsim(orderId, orderData, supabase) {
  const packageId = orderData.package_id || orderData.plan_id;
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

  const orderResponse = await fetch(`${airaloBaseUrl}/v2/orders`, { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ package_id: packageId, quantity: 1, type: 'sim', description: `Order ${orderId} for ${orderData.customer_email || 'customer'}` }) });
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

  await supabase.from('orders').update(esimUpdateData).eq('id', orderId);

  if (orderData.user_id) {
    const { data: existing } = await supabase.from('user_esims').select('id').eq('id', orderId).eq('user_id', orderData.user_id).single();
    if (existing) {
      await supabase.from('user_esims').update(esimUpdateData).eq('id', orderId).eq('user_id', orderData.user_id);
    } else {
      await supabase.from('user_esims').upsert({ ...orderData, ...esimUpdateData, id: orderId, user_id: orderData.user_id });
    }
  }

  return { airaloOrder, simData, esimUpdateData };
}

async function handleCheckoutSessionCompleted(session) {
  try {
    if (session.payment_status !== 'paid') return;
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

    await supabase.from('orders').update({ status: 'processing', payment_status: 'completed', payment_completed_at: now, stripe_session_id: session.id, stripe_payment_intent_id: session.payment_intent, updated_at: now }).eq('id', orderId);

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

    if (!orderData.esim_created && orderData.status !== 'completed') {
      const paidAmount = paymentIntent.amount / 100;
      if (paidAmount < orderData.amount - 0.01) {
        await supabase.from('orders').update({ status: 'payment_mismatch', payment_status: 'failed', error_message: `Payment amount mismatch`, updated_at: now }).eq('id', orderId);
        return;
      }

      await supabase.from('orders').update({ status: 'processing', payment_status: 'completed', payment_completed_at: now, stripe_payment_intent_id: paymentIntent.id, updated_at: now }).eq('id', orderId);

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
