import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import {
  checkFraudRules,
  trackPurchaseAttempt,
  checkBlocklist,
  logPriceManipulationAttempt
} from '@esim/shared/services/fraudDetectionService';
import {
  checkUserBlocked,
  analyzeIpRisk,
  FRAUD_SIGNALS_CONFIG
} from '@esim/shared/services/fraudSignalsService';
import {
  validatePromoForCheckout,
  reservePromo,
} from '@esim/shared/services/promoServerService';

const SECURITY_CONFIG = {
  MAX_PRICE_TOLERANCE: 0.01,
  MAX_REQUEST_AGE_SECONDS: 300,
  MIN_REQUEST_INTERVAL_MS: 2000,
  MAX_REQUESTS_PER_IP_PER_HOUR: 50,
  AUTO_BLOCK_ON_PRICE_MANIPULATION: true,
  LOG_ALL_REQUESTS: true
};

const getStripeSecretKey = () => {
  const stripeMode = process.env.STRIPE_MODE || 'live';
  if (stripeMode === 'test' || stripeMode === 'sandbox') return process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
  return process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
};

const stripeSecretKey = getStripeSecretKey();
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia',  // latest stable — update periodically
  timeout: 30000,
}) : null;

export const dynamic = 'force-dynamic';

function isRequestFresh(timestamp) {
  if (!timestamp) return true;
  const requestTime = new Date(timestamp).getTime();
  return (Date.now() - requestTime) / 1000 <= SECURITY_CONFIG.MAX_REQUEST_AGE_SECONDS;
}

async function checkRateLimit(supabase, ip) {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    if (ip) {
      const { count } = await supabase
        .from('payment_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('ip', ip)
        .gte('created_at', oneHourAgo);
      if ((count || 0) >= SECURITY_CONFIG.MAX_REQUESTS_PER_IP_PER_HOUR) {
        return { allowed: false, reason: 'Too many requests from this IP. Please try again later.' };
      }
    }
    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true };
  }
}

async function logPaymentAttempt(supabase, data) {
  try {
    await supabase.from('payment_attempts').insert({
      package_id: data.packageId,
      email: data.email,
      user_id: data.userId || null,
      ip: data.ip || null,
      user_agent: data.userAgent || null,
      submitted_price: data.submittedPrice,
      validated_price: data.validatedPrice,
      price_match: data.priceMatch,
      status: data.status,
      created_at: new Date().toISOString(),
      request_timestamp: data.requestTimestamp || null,
      blocked: data.blocked || false,
      block_reason: data.blockReason || null
    });
  } catch (error) { /* ignore */ }
}

/**
 * Compute the server-authoritative price for a package.
 * Does NOT check the submitted price — caller does that after promo is applied.
 *
 * Returns:
 *   { valid: true, basePrice, packageData, hasReferralDiscount,
 *     referralDiscountPct, databasePrice, packageCountryCode }
 *   { valid: false, error, code, details? }
 */
async function validateAndGetPrice(supabase, packageId, userId) {
  const { data: packageData, error } = await supabase
    .from('dataplans')
    .select('*')
    .eq('id', packageId)
    .single();

  if (error || !packageData) return { valid: false, error: 'Package not found', code: 'PACKAGE_NOT_FOUND' };
  if (packageData.is_enabled === false || packageData.status === 'disabled') return { valid: false, error: 'This package is not available', code: 'PACKAGE_DISABLED' };

  const databasePrice = parseFloat(packageData.price);
  if (isNaN(databasePrice) || databasePrice <= 0) return { valid: false, error: 'Invalid package price', code: 'INVALID_DB_PRICE' };

  let referralDiscountPct = 0, minimumPrice = 0.5, hasReferralDiscount = false;

  if (userId) {
    try {
      const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
      if (userData) {
        hasReferralDiscount = userData.used_referral_code || userData.has_used_referral_code || userData.referral_code_used || false;
      }
      const { data: settings } = await supabase.from('app_config').select('*').eq('id', 'general').single();
      if (settings) {
        referralDiscountPct = settings.referral?.discountPercentage || 17;
        minimumPrice = settings.referral?.minimumPrice || 0.5;
      }
    } catch (err) {
      console.error('Error checking referral discount:', err);
    }
  }

  let basePrice = databasePrice;
  if (hasReferralDiscount && referralDiscountPct > 0) {
    basePrice = Math.max(minimumPrice, databasePrice * (100 - referralDiscountPct) / 100);
  }

  return {
    valid: true,
    basePrice: Math.round(basePrice * 100) / 100,
    packageData,
    hasReferralDiscount,
    referralDiscountPct,
    databasePrice,
    packageCountryCode: packageData.country_code || null,
  };
}

/**
 * Check submitted price against expected final price.
 * Logs manipulation attempt and returns error payload if mismatch.
 */
async function checkSubmittedPrice(supabase, {
  packageId, userId, email, ip, userAgent,
  submittedPrice, expectedFinalPrice, databasePrice,
  promoCode,
}) {
  const roundedExpected  = Math.round(expectedFinalPrice * 100) / 100;
  const roundedSubmitted = Math.round(parseFloat(submittedPrice) * 100) / 100;
  const priceDifference  = Math.abs(roundedExpected - roundedSubmitted);

  if (priceDifference > SECURITY_CONFIG.MAX_PRICE_TOLERANCE) {
    console.error('🚨🚨🚨 PRICE MANIPULATION DETECTED 🚨🚨🚨', {
      packageId, userId, databasePrice,
      expectedPrice: roundedExpected,
      submittedPrice: roundedSubmitted,
      difference: priceDifference,
      promoCode: promoCode || 'none',
    });
    return {
      ok: false,
      error: 'Price validation failed',
      code: 'PRICE_MISMATCH',
      details: { expected: roundedExpected, received: roundedSubmitted, difference: priceDifference, databasePrice },
    };
  }

  return { ok: true };
}

export async function POST(request) {
  // On Vercel: x-real-ip is set by the edge and cannot be spoofed by clients.
  // x-forwarded-for CAN be spoofed if taken from the leftmost entry; use the
  // rightmost non-private entry set by the trusted proxy instead.
  // cf-connecting-ip is set by Cloudflare when behind a CF proxy.
  const ip = (
    request.headers.get('x-real-ip') ||           // Vercel edge (trusted)
    request.headers.get('cf-connecting-ip') ||    // Cloudflare (trusted)
    (() => {
      const fwd = request.headers.get('x-forwarded-for');
      // Take last (rightmost) entry — set by the outermost trusted proxy
      return fwd ? fwd.split(',').pop().trim() : null;
    })() ||
    'unknown'
  );
  const userAgent = request.headers.get('user-agent') || 'unknown';

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const {
      order, email, name, total, currency = 'usd',
      userId, language = 'en', radarSessionId, isMobile, platform,
      timestamp, nonce,
      promoCode,  // optional — raw promo code string from client
    } = body;
    // SECURITY: domain is always derived server-side — never trust client value.
    // A client-supplied domain could redirect users to a phishing site.

    if (!order || !email) return NextResponse.json({ error: 'Missing required fields', code: 'MISSING_FIELDS' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Invalid email format', code: 'INVALID_EMAIL' }, { status: 400 });
    if (!stripe || !stripeSecretKey) return NextResponse.json({ error: 'Payment service not configured', code: 'SERVICE_UNAVAILABLE' }, { status: 503 });

    const rateLimitCheck = await checkRateLimit(supabase, ip);
    if (!rateLimitCheck.allowed) {
      await logPaymentAttempt(supabase, { packageId: order, email, userId, ip, userAgent, submittedPrice: total, status: 'rate_limited', blocked: true, blockReason: rateLimitCheck.reason });
      return NextResponse.json({ error: rateLimitCheck.reason, code: 'RATE_LIMITED' }, { status: 429 });
    }

    if (timestamp && !isRequestFresh(timestamp)) {
      await logPaymentAttempt(supabase, { packageId: order, email, userId, ip, userAgent, submittedPrice: total, requestTimestamp: timestamp, status: 'expired_request', blocked: true, blockReason: 'Request timestamp expired' });
      return NextResponse.json({ error: 'Request expired. Please refresh and try again.', code: 'REQUEST_EXPIRED' }, { status: 400 });
    }

    const blocklistCheck = await checkBlocklist(supabase, userId, email);
    if (blocklistCheck.blocked) {
      await logPaymentAttempt(supabase, { packageId: order, email, userId, ip, userAgent, submittedPrice: total, status: 'blocklisted', blocked: true, blockReason: blocklistCheck.reason });
      return NextResponse.json({ error: blocklistCheck.reason, code: 'BLOCKED' }, { status: 403 });
    }

    const ipCountryCode = request.headers.get('cf-ipcountry') || null;
    const fraudSignalsCheck = await checkUserBlocked(supabase, userId, email, null, ip);
    if (fraudSignalsCheck.blocked) {
      await logPaymentAttempt(supabase, { packageId: order, email, userId, ip, userAgent, submittedPrice: total, status: 'fraud_blocked', blocked: true, blockReason: fraudSignalsCheck.reason });
      return NextResponse.json({ error: fraudSignalsCheck.reason, code: 'FRAUD_BLOCKED', blockType: fraudSignalsCheck.blockType, canContactSupport: fraudSignalsCheck.canContactSupport, supportMessage: fraudSignalsCheck.supportMessage, expiresAt: fraudSignalsCheck.expiresAt, remainingHours: fraudSignalsCheck.remainingHours }, { status: 403 });
    }

    // ── Price validation (Step 1): compute server-authoritative base price ──────
    const priceValidation = await validateAndGetPrice(supabase, order, userId);
    if (!priceValidation.valid) {
      await logPaymentAttempt(supabase, { packageId: order, email, userId, ip, userAgent, submittedPrice: total, status: 'price_validation_failed', blocked: true, blockReason: priceValidation.error });
      return NextResponse.json({ error: 'Payment validation failed. Please refresh and try again.', code: priceValidation.code }, { status: 400 });
    }

    // ── Promo validation (Step 2): server-side — client value NEVER trusted ───
    let promoApplied = null; // populated if a valid promo is found
    let finalPrice = priceValidation.basePrice;

    const rawPromo = (promoCode || '').trim().toUpperCase();
    if (rawPromo.length > 0) {
      const promoResult = await validatePromoForCheckout(supabase, {
        code: rawPromo,
        userId: userId || null,
        userEmail: email,
        packageId: order,
        packageCountryCode: priceValidation.packageCountryCode,
        basePrice: priceValidation.basePrice,  // price after referral discount
      });

      if (promoResult.valid) {
        // Anti-stacking: only apply the better of referral vs promo
        if (priceValidation.hasReferralDiscount && promoResult.finalPrice >= priceValidation.basePrice) {
          // Referral is already better — ignore promo silently
          console.info(`[create-payment-order] Promo ${rawPromo} ignored: referral discount is better`);
        } else {
          finalPrice = promoResult.finalPrice;
          promoApplied = {
            promoId:         promoResult.promoId,
            promoCode:       promoResult.promoCode,
            discountType:    promoResult.discountType,
            discountPercent: promoResult.discountPercent,
            discountAmount:  promoResult.discountAmount,
          };
        }
      } else {
        // Promo invalid — don't fail the request, but the submitted price must
        // match the non-discounted price. If client expected a discount and
        // submitted a lower total, the checkSubmittedPrice below will catch it.
        console.info(`[create-payment-order] Promo ${rawPromo} invalid: ${promoResult.errorCode}`);
      }
    }

    // ── Price integrity check (Step 3): submitted price must match server price ─
    const priceCheck = await checkSubmittedPrice(supabase, {
      packageId: order,
      userId,
      email,
      ip,
      userAgent,
      submittedPrice: total || 0,
      expectedFinalPrice: finalPrice,
      databasePrice: priceValidation.databasePrice,
      promoCode: rawPromo || null,
    });

    if (!priceCheck.ok) {
      await logPriceManipulationAttempt(supabase, {
        packageId: order, userId: userId || null, email,
        databasePrice: priceValidation.databasePrice,
        submittedPrice: parseFloat(total),
        priceDifference: priceCheck.details?.difference,
        ipAddress: ip, userAgent,
        autoBlock: SECURITY_CONFIG.AUTO_BLOCK_ON_PRICE_MANIPULATION,
        metadata: { code: priceCheck.code, provider: 'stripe', promoCode: rawPromo || null, timestamp: new Date().toISOString() },
      });
      await logPaymentAttempt(supabase, { packageId: order, email, userId, ip, userAgent, submittedPrice: total, validatedPrice: priceCheck.details?.expected, priceMatch: false, status: 'price_manipulation', blocked: true, blockReason: 'Price manipulation detected' });
      return NextResponse.json({ error: 'Payment validation failed. Please refresh and try again.', code: priceCheck.code }, { status: 400 });
    }

    const validatedPrice = finalPrice;
    const packageName = priceValidation.packageData?.name || name || 'eSIM Plan';

    let accountAge = null;
    if (userId) {
      try {
        const { data: userDoc } = await supabase.from('users').select('created_at').eq('id', userId).single();
        if (userDoc) accountAge = userDoc.created_at ? new Date(userDoc.created_at) : null;
      } catch { /* Continue */ }
    }

    const fraudCheck = await checkFraudRules(supabase, userId, email, { amount: validatedPrice, currency: currency.toLowerCase(), accountAge, metadata: { orderId: order, planName: packageName, ip, userAgent } });
    if (!fraudCheck.allowed) {
      await trackPurchaseAttempt(supabase, { userId, email, amount: validatedPrice, currency: currency.toLowerCase(), status: 'blocked', metadata: { orderId: order, blockedBy: fraudCheck.blockedBy, riskScore: fraudCheck.riskScore, ip, userAgent } });
      await logPaymentAttempt(supabase, { packageId: order, email, userId, ip, userAgent, submittedPrice: total, validatedPrice, priceMatch: true, status: 'fraud_blocked', blocked: true, blockReason: fraudCheck.reason });
      return NextResponse.json({ error: fraudCheck.reason, code: 'FRAUD_BLOCKED' }, { status: 429 });
    }

    const attemptId = await trackPurchaseAttempt(supabase, { userId, email, amount: validatedPrice, currency: currency.toLowerCase(), metadata: { orderId: order, planName: packageName, riskScore: fraudCheck.riskScore, riskFactors: fraudCheck.riskFactors, ip, userAgent } });

    // Always use server-side env — never the client-supplied domain value.
    const finalDomain = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const stripeMode = process.env.STRIPE_MODE || 'live';
    const isTestMode = stripeMode === 'test' || stripeMode === 'sandbox';

    const getLocalizedUrl = (path) => language === 'en' ? `${finalDomain}${path}` : `${finalDomain}/${language}${path}`;

    const packageData = priceValidation.packageData || {};
    const countryCode = packageData.country_code || null;
    const countryName = packageData.country_region || null;
    const countryCodes = packageData.country_codes || (countryCode ? [countryCode] : []);
    const isRegional = packageData.is_regional || false;
    const now = new Date().toISOString();

    const uniqueOrderId = `${order}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const pendingOrderData = {
      id: uniqueOrderId,
      order_id: order,
      package_id: order,
      plan_id: order,
      plan_name: packageName,
      customer_name: name || 'Customer',
      amount: validatedPrice,
      currency: currency.toLowerCase(),
      customer_email: email,
      user_email: email,
      user_id: userId || null,
      status: 'pending',
      payment_status: 'pending',
      language: language || 'en',
      created_at: now,
      mode: stripeMode,
      is_test_mode: isTestMode,
      quantity: '1',
      source: 'web',
      platform: platform || 'web',
      country_code: countryCode,
      country_region: countryName,
      country_codes: countryCodes,
      is_regional: isRegional,
      unique_order_id: uniqueOrderId,
      original_order_id: order,
      security: {
        ip,
        userAgent,
        requestTimestamp: timestamp || null,
        // Client nonce is stored for audit only — NOT used for validation.
        // A client can forge any nonce value; it provides no replay protection here.
        clientNonce: nonce || null,
        // Server-generated trace ID for this specific request
        serverTraceId: `${Date.now()}_${Math.random().toString(36).substr(2, 12)}`,
        priceValidatedAt: now,
        databasePrice: priceValidation.databasePrice,
        submittedPrice: parseFloat(total) || 0,
        priceValidationPassed: true,
      },
      price_validation: {
        databasePrice: priceValidation.databasePrice,
        basePrice: priceValidation.basePrice,
        finalPrice: validatedPrice,
        hasReferralDiscount: priceValidation.hasReferralDiscount || false,
        referralDiscountPct: priceValidation.referralDiscountPct || 0,
        promoCode: promoApplied?.promoCode || null,
        promoDiscountPct: promoApplied?.discountPercent || 0,
        promoDiscountAmount: promoApplied?.discountAmount || 0,
        submittedPrice: parseFloat(total) || 0,
        validatedAt: now,
      },
      fraud_check: { attemptId, riskScore: fraudCheck.riskScore, riskFactors: fraudCheck.riskFactors, requiresReview: fraudCheck.requiresReview || false, checkedAt: now }
    };

    await supabase.from('orders').upsert(pendingOrderData);
    if (userId) {
      await supabase.from('user_esims').upsert({ ...pendingOrderData, user_id: userId });
    }

    await logPaymentAttempt(supabase, { packageId: order, email, userId, ip, userAgent, submittedPrice: total, validatedPrice, priceMatch: true, status: 'validated', blocked: false });

    const isMobileRequest = isMobile || platform === 'ios' || platform === 'android';

    if (isMobileRequest) {
      const paymentIntentConfig = {
        amount: Math.round(validatedPrice * 100),
        currency: currency.toLowerCase(),
        metadata: {
          order_id: uniqueOrderId,
          email,
          name: packageName,
          language: language || 'en',
          userId: userId || '',
          source: 'web',
          platform: platform || 'web',
          validated_price: validatedPrice.toString(),
          database_price: priceValidation.databasePrice.toString(),
          country_code: countryCode || '',
          country_region: countryName || '',
          is_regional: isRegional ? 'true' : 'false',
          promo_code: promoApplied?.promoCode || '',
          promo_discount_pct: promoApplied ? promoApplied.discountPercent.toString() : '0',
        },
        payment_method_types: ['card'],
      };
      if (radarSessionId) paymentIntentConfig.radar_session = radarSessionId;

      // Idempotency key = uniqueOrderId: safe to retry on network error,
      // guaranteed to never create a duplicate PaymentIntent for the same order.
      const paymentIntent = await stripe.paymentIntents.create(
        paymentIntentConfig,
        { idempotencyKey: uniqueOrderId },
      );

      // Reserve promo slot for mobile path as well
      if (promoApplied) {
        const reserveResult = await reservePromo(supabase, {
          promoId:         promoApplied.promoId,
          promoCode:       promoApplied.promoCode,
          userId:          userId || null,
          userEmail:       email,
          orderId:         uniqueOrderId,
          originalPrice:   priceValidation.basePrice,
          discountedPrice: validatedPrice,
          discountPercent: promoApplied.discountPercent,
          discountAmount:  promoApplied.discountAmount,
          metadata: { stripePaymentIntentId: paymentIntent.id, packageId: order, platform },
        });
        if (!reserveResult.success) {
          // Cancel the payment intent — rare race condition
          console.error('[create-payment-order] reservePromo failed (mobile):', reserveResult);
          try { await stripe.paymentIntents.cancel(paymentIntent.id); } catch { /* best-effort */ }
          return NextResponse.json({
            error: reserveResult.error || 'This promo code is no longer available. Please try again without it.',
            code: reserveResult.errorCode || 'PROMO_RESERVATION_FAILED',
          }, { status: 409 });
        }
      }

      return NextResponse.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id, id: paymentIntent.id, orderId: uniqueOrderId, uniqueOrderId, total: validatedPrice, currency, status: 'success', promoApplied: promoApplied ? { code: promoApplied.promoCode, discountPercent: promoApplied.discountPercent, discountAmount: promoApplied.discountAmount } : null });
    } else {
      const sessionConfig = {
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: packageName,
              description: promoApplied
                ? `Promo: ${promoApplied.promoCode} (${promoApplied.discountPercent}% off) | Order: ${order}`
                : `Order ID: ${order}`,
            },
            unit_amount: Math.round(validatedPrice * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        // SECURITY: email removed from URL — exposed in browser history, logs,
        // and referrer headers. Order lookup uses order_id; auth check uses
        // Supabase session (user_id). Email in URL is never reliable anyway.
        success_url: getLocalizedUrl(`/payment-success?order_id=${uniqueOrderId}&plan_id=${order}&currency=${currency}`),
        cancel_url: getLocalizedUrl('/esim-plans?canceled=true'),
        customer_email: email,
        metadata: {
          order_id: uniqueOrderId,
          package_id: order,
          email,
          name: packageName,
          language: language || 'en',
          source: 'web',
          platform: platform || 'web',
          validated_price: validatedPrice.toString(),
          database_price: priceValidation.databasePrice.toString(),
          country_code: countryCode || '',
          country_region: countryName || '',
          is_regional: isRegional ? 'true' : 'false',
          promo_code: promoApplied?.promoCode || '',
          promo_discount_pct: promoApplied ? promoApplied.discountPercent.toString() : '0',
        }
      };
      if (radarSessionId) sessionConfig.metadata.radar_session_id = radarSessionId;

      // Idempotency key = uniqueOrderId: safe to retry, no duplicate sessions.
      const session = await stripe.checkout.sessions.create(
        sessionConfig,
        { idempotencyKey: uniqueOrderId },
      );

      // Reserve promo slot AFTER Stripe session created — roll back on failure
      if (promoApplied) {
        const reserveResult = await reservePromo(supabase, {
          promoId:         promoApplied.promoId,
          promoCode:       promoApplied.promoCode,
          userId:          userId || null,
          userEmail:       email,
          orderId:         uniqueOrderId,
          originalPrice:   priceValidation.basePrice,
          discountedPrice: validatedPrice,
          discountPercent: promoApplied.discountPercent,
          discountAmount:  promoApplied.discountAmount,
          metadata: { stripeSessionId: session.id, packageId: order },
        });
        if (!reserveResult.success) {
          // Reservation failed — the code was just exhausted or already used.
          // The session was created at the discounted price but we can't honour it.
          // Expire the session and return an error. This is rare (concurrent race).
          console.error('[create-payment-order] reservePromo failed after session create:', reserveResult);
          try { await stripe.checkout.sessions.expire(session.id); } catch { /* best-effort */ }
          return NextResponse.json({
            error: reserveResult.error || 'This promo code is no longer available. Please try again without it.',
            code: reserveResult.errorCode || 'PROMO_RESERVATION_FAILED',
          }, { status: 409 });
        }
      }

      return NextResponse.json({ sessionUrl: session.url, sessionId: session.id, total: validatedPrice, currency, status: 'success', promoApplied: promoApplied ? { code: promoApplied.promoCode, discountPercent: promoApplied.discountPercent, discountAmount: promoApplied.discountAmount } : null });
    }

  } catch (error) {
    console.error('❌ Payment error:', error);
    try {
      await supabase.from('payment_errors').insert({
        error:     error.message,
        stack:     error.stack,
        ip,
        user_agent: userAgent,
        context:   { stripeCode: error.code, stripeType: error.type, stripeDeclineCode: error.decline_code },
        created_at: new Date().toISOString(),
      });
    } catch { /* ignore — don't let error logging break the response */ }
    return NextResponse.json({ error: 'Payment processing failed. Please try again.', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
