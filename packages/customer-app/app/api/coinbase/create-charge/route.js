import { NextResponse } from 'next/server';
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { 
  checkBlocklist,
  logPriceManipulationAttempt,
  checkFraudRules,
  trackPurchaseAttempt
} from '@esim/shared/services/fraudDetectionService';

const COINBASE_API_URL = 'https://api.commerce.coinbase.com';
const COINBASE_API_KEY = process.env.COINBASE_COMMERCE_API_KEY || process.env.NEXT_PUBLIC_COINBASE_COMMERCE_API_KEY;

// ============================================
// SECURITY CONFIGURATION
// ============================================
const SECURITY_CONFIG = {
  MAX_PRICE_TOLERANCE: 0.01,
  MAX_REQUEST_AGE_SECONDS: 300,
  MAX_REQUESTS_PER_IP_PER_HOUR: 50,
  AUTO_BLOCK_ON_PRICE_MANIPULATION: true
};

/**
 * Check rate limiting per IP
 */
async function checkRateLimit(ip) {
  try {
    if (!ip) return { allowed: true };
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const attemptsRef = collection(db, 'payment_attempts');
    const ipQuery = query(
      attemptsRef,
      where('ip', '==', ip),
      where('timestamp', '>=', Timestamp.fromDate(oneHourAgo))
    );
    const ipAttempts = await getDocs(ipQuery);
    
    if (ipAttempts.size >= SECURITY_CONFIG.MAX_REQUESTS_PER_IP_PER_HOUR) {
      return { allowed: false, reason: 'Too many requests. Please try again later.' };
    }
    
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

/**
 * Log payment attempt for audit
 */
async function logPaymentAttempt(data) {
  try {
    await addDoc(collection(db, 'payment_attempts'), {
      provider: 'coinbase',
      ...data,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log payment attempt:', error);
  }
}

/**
 * CRITICAL: Server-side price validation
 */
async function validateAndGetPrice(packageId, userId, submittedPrice) {
  const packageRef = doc(db, 'dataplans', packageId);
  const packageSnap = await getDoc(packageRef);
  
  if (!packageSnap.exists()) {
    return { valid: false, error: 'Package not found', code: 'PACKAGE_NOT_FOUND' };
  }
  
  const packageData = packageSnap.data();
  
  if (packageData.enabled === false || packageData.status === 'disabled') {
    return { valid: false, error: 'This package is not available', code: 'PACKAGE_DISABLED' };
  }
  
  const databasePrice = parseFloat(packageData.price);
  
  if (isNaN(databasePrice) || databasePrice <= 0) {
    return { valid: false, error: 'Invalid package price', code: 'INVALID_DB_PRICE' };
  }
  
  // Check for referral discount
  let discountPercentage = 0;
  let minimumPrice = 0.5;
  let hasReferralDiscount = false;
  
  if (userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        hasReferralDiscount = userData.usedReferralCode || 
                             userData.hasUsedReferralCode || 
                             userData.referralCodeUsed || 
                             false;
      }
      
      const settingsRef = doc(db, 'settings', 'general');
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const settings = settingsSnap.data();
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
      packageId,
      userId,
      databasePrice,
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

/**
 * Create Coinbase Commerce Charge
 */
export async function POST(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    const body = await request.json();
    const {
      orderId,
      userId,
      planId,
      planName,
      amount,
      currency = 'USD',
      customerEmail,
      redirectUrl,
      cancelUrl,
      metadata = {}
    } = body;

    // 1. Input validation
    if (!orderId || !userId || !planId || !amount || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!COINBASE_API_KEY) {
      return NextResponse.json(
        { error: 'Payment service not configured' },
        { status: 503 }
      );
    }

    // 2. Rate limiting
    const rateLimitCheck = await checkRateLimit(ip);
    if (!rateLimitCheck.allowed) {
      await logPaymentAttempt({
        packageId: planId,
        email: customerEmail,
        userId,
        ip,
        userAgent,
        submittedPrice: amount,
        status: 'rate_limited',
        blocked: true
      });
      
      return NextResponse.json(
        { error: rateLimitCheck.reason },
        { status: 429 }
      );
    }

    // 3. Blocklist check
    const blocklistCheck = await checkBlocklist(db, userId, customerEmail);
    if (blocklistCheck.blocked) {
      await logPaymentAttempt({
        packageId: planId,
        email: customerEmail,
        userId,
        ip,
        userAgent,
        submittedPrice: amount,
        status: 'blocklisted',
        blocked: true
      });
      
      return NextResponse.json(
        { error: blocklistCheck.reason },
        { status: 403 }
      );
    }

    // 4. PRICE VALIDATION (CRITICAL)
    const priceValidation = await validateAndGetPrice(planId, userId, amount);
    
    if (!priceValidation.valid) {
      await logPriceManipulationAttempt(db, {
        packageId: planId,
        userId: userId || null,
        email: customerEmail,
        databasePrice: priceValidation.details?.databasePrice,
        submittedPrice: parseFloat(amount),
        priceDifference: priceValidation.details?.difference,
        ipAddress: ip,
        userAgent: userAgent,
        autoBlock: SECURITY_CONFIG.AUTO_BLOCK_ON_PRICE_MANIPULATION,
        metadata: {
          code: priceValidation.code,
          provider: 'coinbase'
        }
      });
      
      await logPaymentAttempt({
        packageId: planId,
        email: customerEmail,
        userId,
        ip,
        userAgent,
        submittedPrice: amount,
        validatedPrice: priceValidation.details?.expected,
        priceMatch: false,
        status: 'price_manipulation',
        blocked: true
      });
      
      return NextResponse.json(
        { error: 'Payment validation failed. Please refresh and try again.', code: priceValidation.code },
        { status: 400 }
      );
    }
    
    const validatedPrice = priceValidation.price;
    const packageName = priceValidation.packageData?.name || planName;

    // 5. Fraud detection
    const fraudCheck = await checkFraudRules(db, userId, customerEmail, {
      amount: validatedPrice,
      currency: currency.toUpperCase(),
      metadata: { orderId, planId, ip, userAgent }
    });

    if (!fraudCheck.allowed) {
      await logPaymentAttempt({
        packageId: planId,
        email: customerEmail,
        userId,
        ip,
        userAgent,
        submittedPrice: amount,
        validatedPrice,
        status: 'fraud_blocked',
        blocked: true
      });
      
      return NextResponse.json(
        { error: fraudCheck.reason },
        { status: 429 }
      );
    }

    // 6. Track attempt
    const attemptId = await trackPurchaseAttempt(db, {
      userId,
      email: customerEmail,
      amount: validatedPrice,
      currency: currency.toUpperCase(),
      metadata: { orderId, planId, ip, userAgent }
    });

    // Extract country info early for metadata
    const pkgData = priceValidation.packageData || {};
    const countryCodeMeta = pkgData.country_code || '';
    const countryNameMeta = pkgData.country_region || '';
    const isRegionalMeta = pkgData.is_regional || false;
    
    // 7. Create charge with VALIDATED PRICE
    const chargeData = {
      name: packageName,
      description: `${packageName} - eSIM Plan`,
      pricing_type: 'fixed_price',
      local_price: {
        amount: validatedPrice.toFixed(2), // VALIDATED PRICE
        currency: currency.toUpperCase()
      },
      metadata: {
        orderId,
        planId,
        userId,
        customerEmail,
        source: 'esim_platform',
        validated_price: validatedPrice.toString(),
        database_price: priceValidation.databasePrice.toString(),
        // Country info for order tracking
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
      return NextResponse.json(
        { error: 'Failed to create charge', details: errorData.error?.message || 'Unknown error' },
        { status: response.status }
      );
    }

    const result = await response.json();
    const charge = result.data;

    // Extract country information from package data
    const packageData = priceValidation.packageData || {};
    const countryCode = packageData.country_code || null;
    const countryName = packageData.country_region || null;
    const countryCodes = packageData.country_codes || (countryCode ? [countryCode] : []);
    const isRegional = packageData.is_regional || false;
    
    // 8. Store pending order with security data
    const pendingOrderData = {
      orderId,
      packageId: planId,
      planId: planId,
      planName: packageName,
      amount: validatedPrice, // VALIDATED PRICE
      currency: currency.toUpperCase(),
      customerEmail,
      userEmail: customerEmail,
      userId,
      paymentProvider: 'coinbase',
      chargeId: charge.id,
      chargeCode: charge.code,
      hostedUrl: charge.hosted_url,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: serverTimestamp(),
      quantity: "1",
      // Country information (CRITICAL for display)
      country_code: countryCode,
      country_region: countryName,
      country_codes: countryCodes,
      is_regional: isRegional,
      security: {
        ip,
        userAgent,
        priceValidatedAt: serverTimestamp(),
        databasePrice: priceValidation.databasePrice,
        submittedPrice: parseFloat(amount)
      },
      priceValidation: {
        databasePrice: priceValidation.databasePrice,
        finalPrice: validatedPrice,
        hasReferralDiscount: priceValidation.hasReferralDiscount || false,
        discountPercentage: priceValidation.discountPercentage || 0,
        submittedPrice: parseFloat(amount),
        validatedAt: serverTimestamp()
      },
      fraudCheck: {
        attemptId,
        riskScore: fraudCheck.riskScore || 0,
        riskFactors: fraudCheck.riskFactors || [],
        checkedAt: serverTimestamp()
      },
      metadata: {
        ...metadata,
        coinbaseChargeId: charge.id,
        coinbaseChargeCode: charge.code
      }
    };
    
    const orderRef = doc(db, 'orders', orderId);
    await setDoc(orderRef, pendingOrderData);
    
    if (userId) {
      const userOrderRef = doc(db, 'users', userId, 'esims', orderId);
      await setDoc(userOrderRef, pendingOrderData);
    }

    await logPaymentAttempt({
      packageId: planId,
      email: customerEmail,
      userId,
      ip,
      userAgent,
      submittedPrice: amount,
      validatedPrice,
      priceMatch: true,
      status: 'validated',
      blocked: false
    });

    return NextResponse.json({
      success: true,
      charge: {
        id: charge.id,
        code: charge.code,
        hosted_url: charge.hosted_url,
        created_at: charge.created_at,
        expires_at: charge.expires_at,
        pricing: charge.pricing,
        addresses: charge.addresses
      },
      paymentUrl: charge.hosted_url,
      orderId,
      total: validatedPrice
    });

  } catch (error) {
    console.error('Coinbase charge error:', error);
    
    try {
      await addDoc(collection(db, 'payment_errors'), {
        provider: 'coinbase',
        error: error.message,
        ip,
        userAgent,
        timestamp: serverTimestamp()
      });
    } catch {
      // Ignore logging errors
    }
    
    return NextResponse.json(
      { error: 'Payment processing failed. Please try again.' },
      { status: 500 }
    );
  }
}
