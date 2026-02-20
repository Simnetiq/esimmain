import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import {
  checkFraudRules,
  trackPurchaseAttempt,
  checkBlocklist,
} from '@esim/shared/services/fraudDetectionService';
import {
  checkUserBlocked,
} from '@esim/shared/services/fraudSignalsService';

const SECURITY_CONFIG = {
  MAX_REQUESTS_PER_IP_PER_HOUR: 50,
};

const getStripeSecretKey = () => {
  const stripeMode = process.env.STRIPE_MODE || 'live';
  if (stripeMode === 'test' || stripeMode === 'sandbox') return process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
  return process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
};

const stripeSecretKey = getStripeSecretKey();
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia',
  timeout: 30000,
}) : null;

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const ip = (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    (() => {
      const fwd = request.headers.get('x-forwarded-for');
      return fwd ? fwd.split(',').pop().trim() : null;
    })() ||
    'unknown'
  );
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const {
      iccid,
      packageId,
      currency = 'usd',
      isMobile,
      platform = 'web',
      language = 'en',
    } = body;

    // ── Auth: require authenticated user ────────────────────────────────────
    let userId = null;
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user }, error: jwtError } = await supabase.auth.getUser(token);
      if (!jwtError && user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    if (!iccid || !packageId) {
      return NextResponse.json({ error: 'Missing required fields (iccid, packageId)', code: 'MISSING_FIELDS' }, { status: 400 });
    }

    if (!stripe || !stripeSecretKey) {
      return NextResponse.json({ error: 'Payment service not configured', code: 'SERVICE_UNAVAILABLE' }, { status: 503 });
    }

    // ── Rate limit ──────────────────────────────────────────────────────────
    if (ip !== 'unknown') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('payment_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('ip', ip)
        .gte('created_at', oneHourAgo);
      if ((count || 0) >= SECURITY_CONFIG.MAX_REQUESTS_PER_IP_PER_HOUR) {
        return NextResponse.json({ error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' }, { status: 429 });
      }
    }

    // ── Blocklist + fraud signals ───────────────────────────────────────────
    const { data: userData } = await supabase.from('users').select('email').eq('id', userId).single();
    const email = userData?.email || '';

    const blocklistCheck = await checkBlocklist(supabase, userId, email);
    if (blocklistCheck.blocked) {
      return NextResponse.json({ error: blocklistCheck.reason, code: 'BLOCKED' }, { status: 403 });
    }

    const fraudSignalsCheck = await checkUserBlocked(supabase, userId, email, null, ip);
    if (fraudSignalsCheck.blocked) {
      return NextResponse.json({ error: fraudSignalsCheck.reason, code: 'FRAUD_BLOCKED' }, { status: 403 });
    }

    // ── Verify ICCID ownership ──────────────────────────────────────────────
    const { data: ownerOrder, error: ownerError } = await supabase
      .from('orders')
      .select('id, plan_id, iccid, customer_email')
      .eq('iccid', iccid)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .limit(1)
      .maybeSingle();

    if (ownerError || !ownerOrder) {
      return NextResponse.json({ error: 'eSIM not found or not owned by you', code: 'ESIM_NOT_FOUND' }, { status: 404 });
    }

    // ── Validate package exists and get server-authoritative price ───────────
    const { data: topupPlan, error: planError } = await supabase
      .from('dataplans')
      .select('*')
      .eq('id', packageId)
      .eq('package_type', 'topup')
      .eq('is_enabled', true)
      .eq('status', 'active')
      .single();

    if (planError || !topupPlan) {
      return NextResponse.json({ error: 'Top-up package not found or unavailable', code: 'PACKAGE_NOT_FOUND' }, { status: 404 });
    }

    const validatedPrice = parseFloat(topupPlan.price);
    if (isNaN(validatedPrice) || validatedPrice <= 0) {
      return NextResponse.json({ error: 'Invalid package price', code: 'INVALID_PRICE' }, { status: 400 });
    }

    // ── Fraud rules check ───────────────────────────────────────────────────
    const fraudCheck = await checkFraudRules(supabase, userId, email, {
      amount: validatedPrice,
      currency: currency.toLowerCase(),
      metadata: { type: 'topup', iccid, packageId, ip, userAgent },
    });
    if (!fraudCheck.allowed) {
      return NextResponse.json({ error: fraudCheck.reason, code: 'FRAUD_BLOCKED' }, { status: 429 });
    }

    await trackPurchaseAttempt(supabase, {
      userId, email, amount: validatedPrice,
      currency: currency.toLowerCase(),
      metadata: { type: 'topup', iccid, packageId, ip, userAgent },
    });

    // ── Create esim_topups record ───────────────────────────────────────────
    const stripeMode = process.env.STRIPE_MODE || 'live';
    const isTestMode = stripeMode === 'test' || stripeMode === 'sandbox';
    const now = new Date().toISOString();

    const topupRecord = {
      user_id: userId,
      order_id: ownerOrder.id,
      iccid,
      airalo_package_id: packageId,
      package_name: topupPlan.name || topupPlan.title || 'Top-Up',
      data_amount: formatDataDisplay(topupPlan.data_amount_mb, topupPlan.is_unlimited),
      validity: `${topupPlan.validity_days} days`,
      price: validatedPrice,
      currency: currency.toUpperCase(),
      status: 'topup_pending_payment',
      platform: platform || 'web',
      is_test_mode: isTestMode,
      security: {
        ip,
        userAgent,
        serverTraceId: `topup_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`,
        createdAt: now,
      },
      created_at: now,
      updated_at: now,
    };

    const { data: insertedTopup, error: insertError } = await supabase
      .from('esim_topups')
      .insert(topupRecord)
      .select('id')
      .single();

    if (insertError || !insertedTopup) {
      console.error('[topup-checkout] Failed to create topup record:', insertError);
      return NextResponse.json({ error: 'Failed to create top-up order', code: 'INSERT_FAILED' }, { status: 500 });
    }

    const topupId = insertedTopup.id;
    const packageName = topupPlan.name || topupPlan.title || 'eSIM Top-Up';

    // ── Stripe payment ──────────────────────────────────────────────────────
    const finalDomain = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';
    const getLocalizedUrl = (path) => language === 'en' ? `${finalDomain}${path}` : `${finalDomain}/${language}${path}`;
    const isMobileRequest = isMobile || platform === 'ios' || platform === 'android';

    const commonMetadata = {
      type: 'topup',
      topup_id: topupId,
      order_id: topupId,  // webhook uses metadata.order_id as primary lookup
      iccid,
      user_id: userId,
      package_id: packageId,
      validated_price: validatedPrice.toString(),
    };

    const idempotencyKey = `topup_${topupId}`;

    if (isMobileRequest) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(validatedPrice * 100),
        currency: currency.toLowerCase(),
        metadata: commonMetadata,
        payment_method_types: ['card'],
      }, { idempotencyKey });

      // Update topup record with Stripe payment intent ID
      await supabase.from('esim_topups').update({
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      }).eq('id', topupId);

      return NextResponse.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        topupId,
        total: validatedPrice,
        currency,
        packageName,
      });
    } else {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Top-Up: ${packageName}`,
              description: `ICCID: ...${iccid.slice(-6)}`,
            },
            unit_amount: Math.round(validatedPrice * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: getLocalizedUrl(`/topup-processing/${topupId}`),
        cancel_url: getLocalizedUrl('/dashboard?topup_canceled=true'),
        customer_email: ownerOrder.customer_email || email,
        metadata: commonMetadata,
      }, { idempotencyKey });

      // Update topup record with Stripe session ID
      await supabase.from('esim_topups').update({
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      }).eq('id', topupId);

      return NextResponse.json({
        success: true,
        sessionUrl: session.url,
        sessionId: session.id,
        topupId,
        total: validatedPrice,
        currency,
        packageName,
      });
    }
  } catch (error) {
    console.error('[topup-checkout] Error:', error);
    return NextResponse.json({ error: 'Payment processing failed', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

function formatDataDisplay(mb, isUnlimited) {
  if (isUnlimited) return 'Unlimited';
  if (!mb) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  return `${mb} MB`;
}
