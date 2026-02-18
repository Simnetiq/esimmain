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
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' }) : null;

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

async function validateAndGetPrice(supabase, packageId, userId, submittedPrice) {
  const { data: packageData, error } = await supabase
    .from('dataplans')
    .select('*')
    .eq('id', packageId)
    .single();

  if (error || !packageData) return { valid: false, error: 'Package not found', code: 'PACKAGE_NOT_FOUND' };
  if (packageData.enabled === false || packageData.status === 'disabled') return { valid: false, error: 'This package is not available', code: 'PACKAGE_DISABLED' };

  const databasePrice = parseFloat(packageData.price);
  if (isNaN(databasePrice) || databasePrice <= 0) return { valid: false, error: 'Invalid package price', code: 'INVALID_DB_PRICE' };

  let discountPercentage = 0, minimumPrice = 0.5, hasReferralDiscount = false;

  if (userId) {
    try {
      const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
      if (userData) {
        hasReferralDiscount = userData.used_referral_code || userData.has_used_referral_code || userData.referral_code_used || false;
      }
      const { data: settings } = await supabase.from('app_config').select('*').eq('id', 'general').single();
      if (settings) {
        discountPercentage = settings.referral?.discountPercentage || 17;
        minimumPrice = settings.referral?.minimumPrice || 0.5;
      }
    } catch (error) {
      console.error('Error checking referral discount:', error);
    }
  }

  let validPrice = databasePrice;
  if (hasReferralDiscount && discountPercentage > 0) {
    validPrice = Math.max(minimumPrice, databasePrice * (100 - discountPercentage) / 100);
  }

  const roundedValidPrice = Math.round(validPrice * 100) / 100;
  const roundedSubmittedPrice = Math.round(parseFloat(submittedPrice) * 100) / 100;
  const priceDifference = Math.abs(roundedValidPrice - roundedSubmittedPrice);

  if (priceDifference > SECURITY_CONFIG.MAX_PRICE_TOLERANCE) {
    console.error('🚨🚨🚨 PRICE MANIPULATION DETECTED 🚨🚨🚨', { packageId, userId, databasePrice, expectedPrice: roundedValidPrice, submittedPrice: roundedSubmittedPrice, difference: priceDifference });
    return { valid: false, error: 'Price validation failed', code: 'PRICE_MISMATCH', details: { expected: roundedValidPrice, received: roundedSubmittedPrice, difference: priceDifference, databasePrice } };
  }

  return { valid: true, price: roundedValidPrice, packageData, hasReferralDiscount, discountPercentage, databasePrice };
}

export async function POST(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { order, email, name, total, currency = 'usd', domain, userId, language = 'en', radarSessionId, isMobile, platform, timestamp, nonce } = body;

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

    const priceValidation = await validateAndGetPrice(supabase, order, userId, total || 0);
    if (!priceValidation.valid) {
      await logPriceManipulationAttempt(supabase, { packageId: order, userId: userId || null, email, databasePrice: priceValidation.details?.databasePrice, submittedPrice: parseFloat(total), priceDifference: priceValidation.details?.difference, ipAddress: ip, userAgent, autoBlock: SECURITY_CONFIG.AUTO_BLOCK_ON_PRICE_MANIPULATION, metadata: { code: priceValidation.code, provider: 'stripe', timestamp: new Date().toISOString() } });
      await logPaymentAttempt(supabase, { packageId: order, email, userId, ip, userAgent, submittedPrice: total, validatedPrice: priceValidation.details?.expected, priceMatch: false, status: 'price_manipulation', blocked: true, blockReason: 'Price manipulation detected' });
      return NextResponse.json({ error: 'Payment validation failed. Please refresh and try again.', code: priceValidation.code }, { status: 400 });
    }

    const validatedPrice = priceValidation.price;
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

    const finalDomain = domain || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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
      security: { ip, userAgent, requestTimestamp: timestamp || null, nonce: nonce || null, priceValidatedAt: now, databasePrice: priceValidation.databasePrice, submittedPrice: parseFloat(total) || 0, priceValidationPassed: true },
      price_validation: { databasePrice: priceValidation.databasePrice, finalPrice: validatedPrice, hasReferralDiscount: priceValidation.hasReferralDiscount || false, discountPercentage: priceValidation.discountPercentage || 0, submittedPrice: parseFloat(total) || 0, validatedAt: now },
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
        metadata: { order_id: uniqueOrderId, email, name: packageName, language: language || 'en', userId: userId || '', source: 'web', platform: platform || 'web', validated_price: validatedPrice.toString(), database_price: priceValidation.databasePrice.toString(), country_code: countryCode || '', country_region: countryName || '', is_regional: isRegional ? 'true' : 'false' },
        payment_method_types: ['card'],
      };
      if (radarSessionId) paymentIntentConfig.radar_session = radarSessionId;

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig);
      return NextResponse.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id, id: paymentIntent.id, orderId: uniqueOrderId, uniqueOrderId, total: validatedPrice, currency, status: 'success' });
    } else {
      const sessionConfig = {
        payment_method_types: ['card'],
        line_items: [{ price_data: { currency: currency.toLowerCase(), product_data: { name: packageName, description: `Order ID: ${order}` }, unit_amount: Math.round(validatedPrice * 100) }, quantity: 1 }],
        mode: 'payment',
        success_url: getLocalizedUrl(`/payment-success?order_id=${uniqueOrderId}&plan_id=${order}&email=${email}&total=${validatedPrice}&name=${encodeURIComponent(packageName)}&currency=${currency}`),
        cancel_url: getLocalizedUrl('/esim-plans?canceled=true'),
        customer_email: email,
        metadata: { order_id: uniqueOrderId, package_id: order, email, name: packageName, language: language || 'en', source: 'web', platform: platform || 'web', validated_price: validatedPrice.toString(), database_price: priceValidation.databasePrice.toString(), country_code: countryCode || '', country_region: countryName || '', is_regional: isRegional ? 'true' : 'false' }
      };
      if (radarSessionId) sessionConfig.metadata.radar_session_id = radarSessionId;

      const session = await stripe.checkout.sessions.create(sessionConfig);
      return NextResponse.json({ sessionUrl: session.url, sessionId: session.id, total: validatedPrice, currency, status: 'success' });
    }

  } catch (error) {
    console.error('❌ Payment error:', error);
    try {
      await supabase.from('payment_errors').insert({ error: error.message, stack: error.stack, ip, user_agent: userAgent, created_at: new Date().toISOString() });
    } catch { /* ignore */ }
    return NextResponse.json({ error: 'Payment processing failed. Please try again.', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
