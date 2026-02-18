import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import { 
  checkBlocklist,
  logPriceManipulationAttempt,
  checkFraudRules,
  trackPurchaseAttempt
} from '@esim/shared/services/fraudDetectionService';

const COINBASE_API_URL = 'https://api.commerce.coinbase.com';
const COINBASE_API_KEY = process.env.COINBASE_COMMERCE_API_KEY || process.env.NEXT_PUBLIC_COINBASE_COMMERCE_API_KEY;

const SECURITY_CONFIG = {
  MAX_PRICE_TOLERANCE: 0.01,
  MAX_REQUEST_AGE_SECONDS: 300,
  MAX_REQUESTS_PER_IP_PER_HOUR: 50,
  AUTO_BLOCK_ON_PRICE_MANIPULATION: true
};

async function checkRateLimit(supabase, ip) {
  try {
    if (!ip) return { allowed: true };
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('payment_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', oneHourAgo);
    
    if ((count || 0) >= SECURITY_CONFIG.MAX_REQUESTS_PER_IP_PER_HOUR) {
      return { allowed: false, reason: 'Too many requests. Please try again later.' };
    }
    
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

async function logPaymentAttempt(supabase, data) {
  try {
    await supabase.from('payment_attempts').insert({
      provider: 'coinbase',
      ...data,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log payment attempt:', error);
  }
}

async function validateAndGetPrice(supabase, packageId, userId, submittedPrice) {
  const { data: packageData, error } = await supabase
    .from('dataplans')
    .select('*')
    .eq('id', packageId)
    .single();
  
  if (error || !packageData) {
    return { valid: false, error: 'Package not found', code: 'PACKAGE_NOT_FOUND' };
  }
  
  if (packageData.enabled === false || packageData.status === 'disabled') {
    return { valid: false, error: 'This package is not available', code: 'PACKAGE_DISABLED' };
  }
  
  const databasePrice = parseFloat(packageData.price);
  
  if (isNaN(databasePrice) || databasePrice <= 0) {
    return { valid: false, error: 'Invalid package price', code: 'INVALID_DB_PRICE' };
  }
  
  let discountPercentage = 0;
  let minimumPrice = 0.5;
  let hasReferralDiscount = false;
  
  if (userId) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (userData) {
        hasReferralDiscount = userData.used_referral_code || 
                             userData.has_used_referral_code || 
                             userData.referral_code_used || 
                             false;
      }
      
      const { data: settings } = await supabase
        .from('app_config')
        .select('*')
        .eq('id', 'general')
        .single();
      
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
  const priceMatches = priceDifference <= SECURITY_CONFIG.MAX_PRICE_TOLERANCE;
  
  if (!priceMatches) {
    console.error('🚨 COINBASE PRICE MANIPULATION DETECTED', {
      packageId, userId, databasePrice,
      expectedPrice: roundedValidPrice,
      submittedPrice: roundedSubmittedPrice,
      difference: priceDifference
    });
    
    return { 
      valid: false, 
      error: 'Price validation failed',
      code: 'PRICE_MISMATCH',
      details: {
        expected: roundedValidPrice,
        received: roundedSubmittedPrice,
        difference: priceDifference,
        databasePrice
      }
    };
  }
  
  return {
    valid: true,
    price: roundedValidPrice,
    packageData,
    hasReferralDiscount,
    discountPercentage,
    databasePrice
  };
}

export async function POST(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const {
      orderId, userId, planId, planName, amount,
      currency = 'USD', customerEmail, redirectUrl,
      cancelUrl, metadata = {}
    } = body;

    if (!orderId || !userId || !planId || !amount || !customerEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!COINBASE_API_KEY) {
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 503 });
    }

    const rateLimitCheck = await checkRateLimit(supabase, ip);
    if (!rateLimitCheck.allowed) {
      await logPaymentAttempt(supabase, { packageId: planId, email: customerEmail, userId, ip, userAgent, submittedPrice: amount, status: 'rate_limited', blocked: true });
      return NextResponse.json({ error: rateLimitCheck.reason }, { status: 429 });
    }

    const blocklistCheck = await checkBlocklist(supabase, userId, customerEmail);
    if (blocklistCheck.blocked) {
      await logPaymentAttempt(supabase, { packageId: planId, email: customerEmail, userId, ip, userAgent, submittedPrice: amount, status: 'blocklisted', blocked: true });
      return NextResponse.json({ error: blocklistCheck.reason }, { status: 403 });
    }

    const priceValidation = await validateAndGetPrice(supabase, planId, userId, amount);
    
    if (!priceValidation.valid) {
      await logPriceManipulationAttempt(supabase, {
        packageId: planId, userId: userId || null, email: customerEmail,
        databasePrice: priceValidation.details?.databasePrice,
        submittedPrice: parseFloat(amount),
        priceDifference: priceValidation.details?.difference,
        ipAddress: ip, userAgent,
        autoBlock: SECURITY_CONFIG.AUTO_BLOCK_ON_PRICE_MANIPULATION,
        metadata: { code: priceValidation.code, provider: 'coinbase' }
      });
      
      await logPaymentAttempt(supabase, { packageId: planId, email: customerEmail, userId, ip, userAgent, submittedPrice: amount, validatedPrice: priceValidation.details?.expected, priceMatch: false, status: 'price_manipulation', blocked: true });
      return NextResponse.json({ error: 'Payment validation failed. Please refresh and try again.', code: priceValidation.code }, { status: 400 });
    }
    
    const validatedPrice = priceValidation.price;
    const packageName = priceValidation.packageData?.name || planName;

    const fraudCheck = await checkFraudRules(supabase, userId, customerEmail, {
      amount: validatedPrice,
      currency: currency.toUpperCase(),
      metadata: { orderId, planId, ip, userAgent }
    });

    if (!fraudCheck.allowed) {
      await logPaymentAttempt(supabase, { packageId: planId, email: customerEmail, userId, ip, userAgent, submittedPrice: amount, validatedPrice, status: 'fraud_blocked', blocked: true });
      return NextResponse.json({ error: fraudCheck.reason }, { status: 429 });
    }

    const attemptId = await trackPurchaseAttempt(supabase, {
      userId, email: customerEmail, amount: validatedPrice,
      currency: currency.toUpperCase(),
      metadata: { orderId, planId, ip, userAgent }
    });

    const pkgData = priceValidation.packageData || {};
    const countryCodeMeta = pkgData.country_code || '';
    const countryNameMeta = pkgData.country_region || '';
    const isRegionalMeta = pkgData.is_regional || false;
    
    const chargeData = {
      name: packageName,
      description: `${packageName} - eSIM Plan`,
      pricing_type: 'fixed_price',
      local_price: { amount: validatedPrice.toFixed(2), currency: currency.toUpperCase() },
      metadata: {
        orderId, planId, userId, customerEmail,
        source: 'esim_platform',
        validated_price: validatedPrice.toString(),
        database_price: priceValidation.databasePrice.toString(),
        country_code: countryCodeMeta,
        country_region: countryNameMeta,
        is_regional: isRegionalMeta ? 'true' : 'false',
        ...metadata
      },
      redirect_url: redirectUrl,
      cancel_url: cancelUrl
    };

    const response = await fetch(`${COINBASE_API_URL}/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': COINBASE_API_KEY,
        'X-CC-Version': '2018-03-22'
      },
      body: JSON.stringify(chargeData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: 'Failed to create charge', details: errorData.error?.message || 'Unknown error' }, { status: response.status });
    }

    const result = await response.json();
    const charge = result.data;

    const packageData = priceValidation.packageData || {};
    const countryCode = packageData.country_code || null;
    const countryName = packageData.country_region || null;
    const countryCodes = packageData.country_codes || (countryCode ? [countryCode] : []);
    const isRegional = packageData.is_regional || false;
    const now = new Date().toISOString();
    
    const pendingOrderData = {
      id: orderId,
      order_id: orderId,
      package_id: planId,
      plan_id: planId,
      plan_name: packageName,
      amount: validatedPrice,
      currency: currency.toUpperCase(),
      customer_email: customerEmail,
      user_email: customerEmail,
      user_id: userId,
      payment_provider: 'coinbase',
      charge_id: charge.id,
      charge_code: charge.code,
      hosted_url: charge.hosted_url,
      status: 'pending',
      payment_status: 'pending',
      created_at: now,
      quantity: '1',
      country_code: countryCode,
      country_region: countryName,
      country_codes: countryCodes,
      is_regional: isRegional,
      security: { ip, userAgent, priceValidatedAt: now, databasePrice: priceValidation.databasePrice, submittedPrice: parseFloat(amount) },
      price_validation: { databasePrice: priceValidation.databasePrice, finalPrice: validatedPrice, hasReferralDiscount: priceValidation.hasReferralDiscount || false, discountPercentage: priceValidation.discountPercentage || 0, submittedPrice: parseFloat(amount), validatedAt: now },
      fraud_check: { attemptId, riskScore: fraudCheck.riskScore || 0, riskFactors: fraudCheck.riskFactors || [], checkedAt: now },
      metadata: { ...metadata, coinbaseChargeId: charge.id, coinbaseChargeCode: charge.code }
    };
    
    await supabase.from('orders').upsert(pendingOrderData);
    
    if (userId) {
      await supabase.from('user_esims').upsert({ ...pendingOrderData, user_id: userId });
    }

    await logPaymentAttempt(supabase, { packageId: planId, email: customerEmail, userId, ip, userAgent, submittedPrice: amount, validatedPrice, priceMatch: true, status: 'validated', blocked: false });

    return NextResponse.json({
      success: true,
      charge: {
        id: charge.id, code: charge.code, hosted_url: charge.hosted_url,
        created_at: charge.created_at, expires_at: charge.expires_at,
        pricing: charge.pricing, addresses: charge.addresses
      },
      paymentUrl: charge.hosted_url,
      orderId,
      total: validatedPrice
    });

  } catch (error) {
    console.error('Coinbase charge error:', error);
    
    try {
      await supabase.from('payment_errors').insert({
        provider: 'coinbase', error: error.message, ip, user_agent: userAgent,
        created_at: new Date().toISOString()
      });
    } catch { /* Ignore */ }
    
    return NextResponse.json({ error: 'Payment processing failed. Please try again.' }, { status: 500 });
  }
}
