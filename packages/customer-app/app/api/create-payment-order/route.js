import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@esim/shared/firebase/config';
import { doc, setDoc, serverTimestamp, getDoc, collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import {
  checkFraudRules,
  trackPurchaseAttempt,
  checkBlocklist,
  logPriceManipulationAttempt
} from '@esim/shared/services/fraudDetectionService';

// ============================================
// SECURITY CONFIGURATION
// ============================================
const SECURITY_CONFIG = {
  // Maximum allowed price difference (for floating point tolerance)
  MAX_PRICE_TOLERANCE: 0.01,
  // Maximum request age in seconds (prevent replay attacks)
  MAX_REQUEST_AGE_SECONDS: 300, // 5 minutes
  // Minimum time between requests from same user (rate limiting)
  MIN_REQUEST_INTERVAL_MS: 2000, // 2 seconds
  // Maximum requests per IP per hour
  MAX_REQUESTS_PER_IP_PER_HOUR: 50,
  // Auto-block on price manipulation
  AUTO_BLOCK_ON_PRICE_MANIPULATION: true,
  // Log all requests for audit
  LOG_ALL_REQUESTS: true
};

// Get Stripe secret key based on mode
const getStripeSecretKey = () => {
  const stripeMode = process.env.STRIPE_MODE || 'live';
  if (stripeMode === 'test' || stripeMode === 'sandbox') {
    return process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
  }
  return process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
};

const stripeSecretKey = getStripeSecretKey();
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
}) : null;

export const dynamic = 'force-dynamic';

// ============================================
// SECURITY HELPER FUNCTIONS
// ============================================

/**
 * Generate secure request hash for integrity verification
 * Note: Reserved for future use with request signing
 */
// function generateRequestHash(data) {
//   const secret = process.env.PAYMENT_SECRET_KEY || process.env.STRIPE_SECRET_KEY_LIVE || 'fallback-secret';
//   const payload = JSON.stringify({
//     packageId: data.packageId,
//     email: data.email,
//     userId: data.userId,
//     timestamp: data.timestamp
//   });
//   return crypto.createHmac('sha256', secret).update(payload).digest('hex');
// }

/**
 * Validate request timestamp (prevent replay attacks)
 */
function isRequestFresh(timestamp) {
  if (!timestamp) return true; // Allow requests without timestamp for backwards compatibility
  const requestTime = new Date(timestamp).getTime();
  const now = Date.now();
  const ageSeconds = (now - requestTime) / 1000;
  return ageSeconds <= SECURITY_CONFIG.MAX_REQUEST_AGE_SECONDS;
}

/**
 * Check rate limiting per IP
 * Note: userId and email parameters reserved for future rate limiting by user
 */
async function checkRateLimit(ip) {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const attemptsRef = collection(db, 'payment_attempts');

    // Check by IP
    if (ip) {
      const ipQuery = query(
        attemptsRef,
        where('ip', '==', ip),
        where('timestamp', '>=', Timestamp.fromDate(oneHourAgo))
      );
      const ipAttempts = await getDocs(ipQuery);
      if (ipAttempts.size >= SECURITY_CONFIG.MAX_REQUESTS_PER_IP_PER_HOUR) {
        return { allowed: false, reason: 'Too many requests from this IP. Please try again later.' };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true }; // Allow on error but log
  }
}

/**
 * Log payment attempt for audit trail
 */
async function logPaymentAttempt(data) {
  try {
    await addDoc(collection(db, 'payment_attempts'), {
      packageId: data.packageId,
      email: data.email,
      userId: data.userId || null,
      ip: data.ip || null,
      userAgent: data.userAgent || null,
      submittedPrice: data.submittedPrice,
      validatedPrice: data.validatedPrice,
      priceMatch: data.priceMatch,
      status: data.status,
      timestamp: serverTimestamp(),
      requestTimestamp: data.requestTimestamp || null,
      blocked: data.blocked || false,
      blockReason: data.blockReason || null
    });
  } catch (error) {
    console.error('Failed to log payment attempt:', error);
  }
}

/**
 * CRITICAL: Server-side price validation
 * Fetches the REAL price from database - NEVER trust frontend
 */
async function validateAndGetPrice(packageId, userId, submittedPrice) {
  // 1. Fetch package from database
  const packageRef = doc(db, 'dataplans', packageId);
  const packageSnap = await getDoc(packageRef);

  if (!packageSnap.exists()) {
    return { valid: false, error: 'Package not found', code: 'PACKAGE_NOT_FOUND' };
  }

  const packageData = packageSnap.data();

  // 2. Check if package is enabled
  if (packageData.enabled === false || packageData.status === 'disabled') {
    return { valid: false, error: 'This package is not available', code: 'PACKAGE_DISABLED' };
  }

  const databasePrice = parseFloat(packageData.price);

  if (isNaN(databasePrice) || databasePrice <= 0) {
    return { valid: false, error: 'Invalid package price', code: 'INVALID_DB_PRICE' };
  }

  // 3. Check for referral discount eligibility (SERVER-SIDE ONLY)
  let discountPercentage = 0;
  let minimumPrice = 0.5;
  let hasReferralDiscount = false;

  if (userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        // Check multiple possible fields for referral status
        hasReferralDiscount = userData.usedReferralCode ||
          userData.hasUsedReferralCode ||
          userData.referralCodeUsed ||
          false;
      }

      // Get referral settings from database
      const settingsRef = doc(db, 'settings', 'general');
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const settings = settingsSnap.data();
        discountPercentage = settings.referral?.discountPercentage || 17;
        minimumPrice = settings.referral?.minimumPrice || 0.5;
      }
    } catch (error) {
      console.error('Error checking referral discount:', error);
      // Continue without discount on error - safer
    }
  }

  // 4. Calculate the CORRECT price (server-side)
  let validPrice = databasePrice;
  if (hasReferralDiscount && discountPercentage > 0) {
    validPrice = Math.max(minimumPrice, databasePrice * (100 - discountPercentage) / 100);
  }

  // Round to 2 decimal places
  const roundedValidPrice = Math.round(validPrice * 100) / 100;
  const roundedSubmittedPrice = Math.round(parseFloat(submittedPrice) * 100) / 100;

  // 5. Compare prices
  const priceDifference = Math.abs(roundedValidPrice - roundedSubmittedPrice);
  const priceMatches = priceDifference <= SECURITY_CONFIG.MAX_PRICE_TOLERANCE;

  if (!priceMatches) {
    // SECURITY ALERT - Price manipulation detected
    console.error('🚨🚨🚨 PRICE MANIPULATION DETECTED 🚨🚨🚨', {
      packageId,
      userId,
      databasePrice,
      expectedPrice: roundedValidPrice,
      submittedPrice: roundedSubmittedPrice,
      difference: priceDifference,
      hasReferralDiscount,
      timestamp: new Date().toISOString()
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

// ============================================
// MAIN API HANDLER
// ============================================
export async function POST(request) {
  // Get client info for logging and rate limiting
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const body = await request.json();

    // ============================================
    // 1. INPUT VALIDATION
    // ============================================
    const {
      order,           // Package ID
      email,
      name,
      total,           // Price from frontend (will be validated)
      currency = 'usd',
      domain,
      userId,
      language = 'en',
      radarSessionId,
      isMobile,
      platform,
      timestamp,       // Request timestamp for replay protection
      nonce           // Unique request ID for duplicate prevention
    } = body;

    // Validate required fields
    if (!order || !email) {
      return NextResponse.json(
        { error: 'Missing required fields', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format', code: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    // Validate Stripe is configured
    if (!stripe || !stripeSecretKey) {
      return NextResponse.json(
        { error: 'Payment service not configured', code: 'SERVICE_UNAVAILABLE' },
        { status: 503 }
      );
    }

    // ============================================
    // 2. RATE LIMITING
    // ============================================
    const rateLimitCheck = await checkRateLimit(ip);
    if (!rateLimitCheck.allowed) {
      await logPaymentAttempt({
        packageId: order,
        email,
        userId,
        ip,
        userAgent,
        submittedPrice: total,
        status: 'rate_limited',
        blocked: true,
        blockReason: rateLimitCheck.reason
      });

      return NextResponse.json(
        { error: rateLimitCheck.reason, code: 'RATE_LIMITED' },
        { status: 429 }
      );
    }

    // ============================================
    // 3. REPLAY ATTACK PREVENTION
    // ============================================
    if (timestamp && !isRequestFresh(timestamp)) {
      await logPaymentAttempt({
        packageId: order,
        email,
        userId,
        ip,
        userAgent,
        submittedPrice: total,
        requestTimestamp: timestamp,
        status: 'expired_request',
        blocked: true,
        blockReason: 'Request timestamp expired'
      });

      return NextResponse.json(
        { error: 'Request expired. Please refresh and try again.', code: 'REQUEST_EXPIRED' },
        { status: 400 }
      );
    }

    // ============================================
    // 4. BLOCKLIST CHECK
    // ============================================
    const blocklistCheck = await checkBlocklist(db, userId, email);
    if (blocklistCheck.blocked) {
      await logPaymentAttempt({
        packageId: order,
        email,
        userId,
        ip,
        userAgent,
        submittedPrice: total,
        status: 'blocklisted',
        blocked: true,
        blockReason: blocklistCheck.reason
      });

      return NextResponse.json(
        { error: blocklistCheck.reason, code: 'BLOCKED' },
        { status: 403 }
      );
    }

    // ============================================
    // 5. PRICE VALIDATION (CRITICAL SECURITY)
    // ============================================
    const priceValidation = await validateAndGetPrice(order, userId, total || 0);

    if (!priceValidation.valid) {
      // Log the fraud attempt
      await logPriceManipulationAttempt(db, {
        packageId: order,
        userId: userId || null,
        email: email,
        databasePrice: priceValidation.details?.databasePrice,
        submittedPrice: parseFloat(total),
        priceDifference: priceValidation.details?.difference,
        ipAddress: ip,
        userAgent: userAgent,
        autoBlock: SECURITY_CONFIG.AUTO_BLOCK_ON_PRICE_MANIPULATION,
        metadata: {
          code: priceValidation.code,
          provider: 'stripe',
          timestamp: new Date().toISOString()
        }
      });

      await logPaymentAttempt({
        packageId: order,
        email,
        userId,
        ip,
        userAgent,
        submittedPrice: total,
        validatedPrice: priceValidation.details?.expected,
        priceMatch: false,
        status: 'price_manipulation',
        blocked: true,
        blockReason: 'Price manipulation detected'
      });

      return NextResponse.json(
        { error: 'Payment validation failed. Please refresh and try again.', code: priceValidation.code },
        { status: 400 }
      );
    }

    // USE THE VALIDATED PRICE FROM DATABASE
    const validatedPrice = priceValidation.price;
    const packageName = priceValidation.packageData?.name || name || 'eSIM Plan';

    // ============================================
    // 6. FRAUD DETECTION RULES
    // ============================================
    let accountAge = null;
    if (userId) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          accountAge = userData.createdAt?.toDate() || null;
        }
      } catch {
        // Continue without account age
      }
    }

    const fraudCheck = await checkFraudRules(db, userId, email, {
      amount: validatedPrice,
      currency: currency.toLowerCase(),
      accountAge,
      metadata: {
        orderId: order,
        planName: packageName,
        ip,
        userAgent
      }
    });

    if (!fraudCheck.allowed) {
      await trackPurchaseAttempt(db, {
        userId,
        email,
        amount: validatedPrice,
        currency: currency.toLowerCase(),
        status: 'blocked',
        metadata: {
          orderId: order,
          blockedBy: fraudCheck.blockedBy,
          riskScore: fraudCheck.riskScore,
          ip,
          userAgent
        }
      });

      await logPaymentAttempt({
        packageId: order,
        email,
        userId,
        ip,
        userAgent,
        submittedPrice: total,
        validatedPrice,
        priceMatch: true,
        status: 'fraud_blocked',
        blocked: true,
        blockReason: fraudCheck.reason
      });

      return NextResponse.json(
        { error: fraudCheck.reason, code: 'FRAUD_BLOCKED' },
        { status: 429 }
      );
    }

    // ============================================
    // 7. TRACK PURCHASE ATTEMPT
    // ============================================
    const attemptId = await trackPurchaseAttempt(db, {
      userId,
      email,
      amount: validatedPrice,
      currency: currency.toLowerCase(),
      metadata: {
        orderId: order,
        planName: packageName,
        riskScore: fraudCheck.riskScore,
        riskFactors: fraudCheck.riskFactors,
        ip,
        userAgent
      }
    });

    // ============================================
    // 8. CREATE PENDING ORDER
    // ============================================
    const finalDomain = domain || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const stripeMode = process.env.STRIPE_MODE || 'live';
    const isTestMode = stripeMode === 'test' || stripeMode === 'sandbox';

    const getLocalizedUrl = (path) => {
      if (language === 'en') {
        return `${finalDomain}${path}`;
      }
      return `${finalDomain}/${language}${path}`;
    };

    // Extract country information from package data
    const packageData = priceValidation.packageData || {};
    const countryCode = packageData.country_code || null;
    const countryName = packageData.country_region || null;
    const countryCodes = packageData.country_codes || (countryCode ? [countryCode] : []);
    const isRegional = packageData.is_regional || false;

    const pendingOrderData = {
      orderId: order,
      packageId: order,
      planId: order,
      planName: packageName,
      customerName: name || 'Customer',
      amount: validatedPrice, // VALIDATED PRICE FROM DATABASE
      currency: currency.toLowerCase(),
      customerEmail: email,
      userEmail: email,
      userId: userId || null,
      status: 'pending',
      paymentStatus: 'pending',
      language: language || 'en',
      createdAt: serverTimestamp(),
      mode: stripeMode,
      isTestMode: isTestMode,
      quantity: "1",
      // Source tracking (web vs mobile)
      source: 'web',
      platform: platform || 'web',
      // Country information (CRITICAL for display)
      country_code: countryCode,
      country_region: countryName,
      country_codes: countryCodes,
      is_regional: isRegional,
      // Security audit trail
      security: {
        ip,
        userAgent,
        requestTimestamp: timestamp || null,
        nonce: nonce || null,
        priceValidatedAt: serverTimestamp(),
        databasePrice: priceValidation.databasePrice,
        submittedPrice: parseFloat(total) || 0,
        priceValidationPassed: true
      },
      // Price validation data
      priceValidation: {
        databasePrice: priceValidation.databasePrice,
        finalPrice: validatedPrice,
        hasReferralDiscount: priceValidation.hasReferralDiscount || false,
        discountPercentage: priceValidation.discountPercentage || 0,
        submittedPrice: parseFloat(total) || 0,
        validatedAt: serverTimestamp()
      },
      // Fraud detection data
      fraudCheck: {
        attemptId,
        riskScore: fraudCheck.riskScore,
        riskFactors: fraudCheck.riskFactors,
        requiresReview: fraudCheck.requiresReview || false,
        checkedAt: serverTimestamp()
      }
    };

    // Generate UNIQUE document ID for this order (timestamp + random string)
    // This prevents duplicate package purchases from overwriting each other
    const uniqueOrderId = `${order}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Update orderData with unique ID
    pendingOrderData.uniqueOrderId = uniqueOrderId;
    pendingOrderData.originalOrderId = order;

    // Save to orders collection with UNIQUE ID
    const globalOrderRef = doc(db, 'orders', uniqueOrderId);
    await setDoc(globalOrderRef, pendingOrderData);

    // Save to user's collection if userId is provided
    if (userId) {
      const userOrderRef = doc(db, 'users', userId, 'esims', uniqueOrderId);
      await setDoc(userOrderRef, pendingOrderData);
    }

    // Log successful validation
    await logPaymentAttempt({
      packageId: order,
      email,
      userId,
      ip,
      userAgent,
      submittedPrice: total,
      validatedPrice,
      priceMatch: true,
      status: 'validated',
      blocked: false
    });

    // ============================================
    // 9. CREATE STRIPE SESSION
    // ============================================
    const isMobileRequest = isMobile || platform === 'ios' || platform === 'android';

    if (isMobileRequest) {
      // Create Payment Intent for mobile
      const paymentIntentConfig = {
        amount: Math.round(validatedPrice * 100), // VALIDATED PRICE
        currency: currency.toLowerCase(),
        metadata: {
          order_id: uniqueOrderId, // USE UNIQUE ORDER ID
          email: email,
          name: packageName,
          language: language || 'en',
          userId: userId || '',
          source: 'web',
          platform: platform || 'web',
          validated_price: validatedPrice.toString(),
          database_price: priceValidation.databasePrice.toString(),
          // Country info for order tracking
          country_code: countryCode || '',
          country_region: countryName || '',
          is_regional: isRegional ? 'true' : 'false'
        },
        payment_method_types: ['card'],
      };

      if (radarSessionId) {
        paymentIntentConfig.radar_session = radarSessionId;
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig);

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        id: paymentIntent.id,
        // CRITICAL: Return uniqueOrderId so mobile can poll for correct order
        orderId: uniqueOrderId,
        uniqueOrderId: uniqueOrderId,
        total: validatedPrice,
        currency: currency,
        status: 'success'
      });
    } else {
      // Create Checkout Session for web
      const sessionConfig = {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: packageName,
                description: `Order ID: ${order}`,
              },
              unit_amount: Math.round(validatedPrice * 100), // VALIDATED PRICE
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: getLocalizedUrl(`/payment-success?order_id=${uniqueOrderId}&plan_id=${order}&email=${email}&total=${validatedPrice}&name=${encodeURIComponent(packageName)}&currency=${currency}`),
        cancel_url: getLocalizedUrl('/esim-plans?canceled=true'),
        customer_email: email,
        metadata: {
          order_id: uniqueOrderId,
          package_id: order,
          email: email,
          name: packageName,
          language: language || 'en',
          source: 'web',
          platform: platform || 'web',
          validated_price: validatedPrice.toString(),
          database_price: priceValidation.databasePrice.toString(),
          // Country info for order tracking
          country_code: countryCode || '',
          country_region: countryName || '',
          is_regional: isRegional ? 'true' : 'false'
        }
      };

      if (radarSessionId) {
        sessionConfig.metadata.radar_session_id = radarSessionId;
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      return NextResponse.json({
        sessionUrl: session.url,
        sessionId: session.id,
        total: validatedPrice,
        currency: currency,
        status: 'success'
      });
    }

  } catch (error) {
    console.error('❌ Payment error:', error);

    // Log error for audit
    try {
      await addDoc(collection(db, 'payment_errors'), {
        error: error.message,
        stack: error.stack,
        ip,
        userAgent,
        timestamp: serverTimestamp()
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: 'Payment processing failed. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
