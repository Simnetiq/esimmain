const Stripe = require('stripe');
const paypal = require('@paypal/checkout-server-sdk');
const logger = require('../utils/logger');
const supabase = require('../config/supabase');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// PayPal Configuration
const paypalEnvironment = process.env.PAYPAL_MODE === 'live'
  ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
  : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);

const paypalClient = new paypal.core.PayPalHttpClient(paypalEnvironment);

// ============================================
// SECURITY CONFIGURATION
// ============================================
const SECURITY_CONFIG = {
  MAX_PRICE_TOLERANCE: 0.01,
  AUTO_BLOCK_ON_PRICE_MANIPULATION: true,
  MAX_REQUESTS_PER_IP_PER_HOUR: 50
};

/**
 * CRITICAL: Server-side price validation
 * NEVER trust prices from frontend
 */
async function validateAndGetPrice(packageId, userId, submittedPrice) {
  try {
    const { data: packageData, error: pkgError } = await supabase
      .from('dataplans')
      .select('*')
      .eq('id', packageId)
      .single();

    if (pkgError || !packageData) {
      return { valid: false, error: 'Package not found', code: 'PACKAGE_NOT_FOUND' };
    }

    if (packageData.is_enabled === false || packageData.status === 'disabled') {
      return { valid: false, error: 'Package not available', code: 'PACKAGE_DISABLED' };
    }

    const databasePrice = parseFloat(packageData.price);

    if (isNaN(databasePrice) || databasePrice <= 0) {
      return { valid: false, error: 'Invalid package price', code: 'INVALID_DB_PRICE' };
    }

    // Check referral discount
    let discountPercentage = 0;
    let minimumPrice = 0.5;
    let hasReferralDiscount = false;

    if (userId) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('referral_code_used')
          .eq('id', userId)
          .single();

        if (userData) {
          hasReferralDiscount = userData.referral_code_used || false;
        }

        const { data: settingsData } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'general')
          .single();

        if (settingsData?.value) {
          const settings = settingsData.value;
          discountPercentage = settings.referral?.discountPercentage || 17;
          minimumPrice = settings.referral?.minimumPrice || 0.5;
        }
      } catch (error) {
        logger.error('Error checking referral discount:', error);
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
      logger.error('🚨 PRICE MANIPULATION DETECTED', {
        packageId,
        userId,
        databasePrice,
        expectedPrice: roundedValidPrice,
        submittedPrice: roundedSubmittedPrice,
        difference: priceDifference
      });

      // Log fraud attempt
      await supabase.from('fraud_attempts').insert({
        action: 'price_manipulation',
        package_id: packageId,
        user_id: userId || null,
        amount: roundedSubmittedPrice,
        metadata: {
          type: 'price_manipulation',
          provider: 'server_api',
          databasePrice,
          expectedPrice: roundedValidPrice,
          submittedPrice: roundedSubmittedPrice,
          difference: priceDifference,
        },
        blocked: true,
        created_at: new Date().toISOString()
      });

      // Auto-block attacker
      if (SECURITY_CONFIG.AUTO_BLOCK_ON_PRICE_MANIPULATION && userId) {
        await supabase.from('fraud_blocklist').insert({
          user_id: userId,
          reason: `Auto-blocked: Price manipulation attempt. Tried to pay ${roundedSubmittedPrice} for item priced at ${roundedValidPrice}`,
          active: true,
          is_active: true,
          block_type: 'auto',
          created_by: 'security_system',
          created_at: new Date().toISOString()
        });
      }

      return {
        valid: false,
        error: 'Price validation failed',
        code: 'PRICE_MISMATCH',
        details: { expected: roundedValidPrice, received: roundedSubmittedPrice, databasePrice }
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
  } catch (error) {
    logger.error('Price validation error:', error);
    return { valid: false, error: 'Validation failed', code: 'VALIDATION_ERROR' };
  }
}

/**
 * Check blocklist
 */
async function checkBlocklist(userId, email) {
  try {
    const queries = [];

    if (userId) {
      queries.push(
        supabase
          .from('fraud_blocklist')
          .select('id')
          .eq('user_id', userId)
          .eq('active', true)
          .limit(1)
      );
    }

    if (email) {
      queries.push(
        supabase
          .from('fraud_blocklist')
          .select('id')
          .eq('email', email.toLowerCase())
          .eq('active', true)
          .limit(1)
      );
    }

    const results = await Promise.all(queries);
    const blocked = results.some(({ data }) => data && data.length > 0);

    if (blocked) {
      return { blocked: true, reason: 'Account blocked. Contact support.' };
    }

    return { blocked: false };
  } catch (error) {
    logger.error('Blocklist check error:', error);
    return { blocked: false };
  }
}

class PaymentService {
  // Stripe Checkout Session
  async createStripeCheckoutSession(orderData) {
    try {
      const {
        order,
        email,
        name,
        total,
        currency = 'usd',
        domain,
        userId
      } = orderData;

      // 1. Check blocklist
      const blocklistCheck = await checkBlocklist(userId, email);
      if (blocklistCheck.blocked) {
        throw new Error(blocklistCheck.reason);
      }

      // 2. PRICE VALIDATION (CRITICAL)
      const priceValidation = await validateAndGetPrice(order, userId, total);

      if (!priceValidation.valid) {
        logger.error('Price validation failed', { order, email, error: priceValidation.error });
        throw new Error('Price validation failed. Please refresh and try again.');
      }

      const validatedPrice = priceValidation.price;
      const packageName = priceValidation.packageData?.name || name || 'eSIM Plan';

      logger.info('Creating Stripe Checkout Session', {
        order,
        email,
        validatedPrice,
        submittedPrice: total
      });

      // 3. Create session with VALIDATED PRICE
      const uniqueOrderId = `${order}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const session = await stripe.checkout.sessions.create({
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
        success_url: `${domain}/payment-success?session_id={CHECKOUT_SESSION_ID}&order_id=${uniqueOrderId}`,
        cancel_url: `${domain}/checkout?canceled=true`,
        customer_email: email,
        metadata: {
          orderId: uniqueOrderId,
          originalOrderId: order,
          planName: packageName,
          validated_price: validatedPrice.toString(),
          database_price: priceValidation.databasePrice.toString()
        },
      });

      logger.info('Stripe Checkout Session created', {
        sessionId: session.id,
        validatedPrice
      });

      return {
        success: true,
        sessionId: session.id,
        sessionUrl: session.url,
        provider: 'stripe',
        total: validatedPrice
      };
    } catch (error) {
      logger.error('Stripe Checkout Session error', error);
      throw error;
    }
  }

  // Stripe Payment Intent
  async createStripePayment(packageId, userId, submittedAmount, currency, metadata) {
    try {
      // 1. Check blocklist
      const blocklistCheck = await checkBlocklist(userId, metadata?.email);
      if (blocklistCheck.blocked) {
        throw new Error(blocklistCheck.reason);
      }

      // 2. PRICE VALIDATION
      const priceValidation = await validateAndGetPrice(packageId, userId, submittedAmount);

      if (!priceValidation.valid) {
        throw new Error('Price validation failed');
      }

      const validatedPrice = priceValidation.price;

      const uniqueOrderId = `${packageId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(validatedPrice * 100), // VALIDATED PRICE
        currency: currency || 'usd',
        metadata: {
          ...metadata,
          orderId: uniqueOrderId,
          originalOrderId: packageId,
          validated_price: validatedPrice.toString(),
          database_price: priceValidation.databasePrice.toString()
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      logger.info('Stripe payment created', {
        paymentId: paymentIntent.id,
        validatedPrice
      });

      return {
        success: true,
        paymentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        provider: 'stripe',
        total: validatedPrice
      };
    } catch (error) {
      logger.error('Stripe payment error', error);
      throw error;
    }
  }

  // PayPal Order
  async createPayPalOrder(packageId, userId, submittedAmount, currency, metadata) {
    try {
      // 1. Check blocklist
      const blocklistCheck = await checkBlocklist(userId, metadata?.email);
      if (blocklistCheck.blocked) {
        throw new Error(blocklistCheck.reason);
      }

      // 2. PRICE VALIDATION
      const priceValidation = await validateAndGetPrice(packageId, userId, submittedAmount);

      if (!priceValidation.valid) {
        throw new Error('Price validation failed');
      }

      const validatedPrice = priceValidation.price;

      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency || 'USD',
            value: validatedPrice.toFixed(2) // VALIDATED PRICE
          },
          description: metadata.description || 'eSIM Purchase'
        }]
      });

      const order = await paypalClient.execute(request);

      logger.info('PayPal order created', {
        orderId: order.result.id,
        validatedPrice
      });

      return {
        success: true,
        orderId: order.result.id,
        provider: 'paypal',
        total: validatedPrice
      };
    } catch (error) {
      logger.error('PayPal order error', error);
      throw error;
    }
  }

  // Capture PayPal Payment
  async capturePayPalPayment(orderId) {
    try {
      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      const capture = await paypalClient.execute(request);

      logger.info('PayPal payment captured', { orderId });

      return {
        success: true,
        captureId: capture.result.id,
        status: capture.result.status
      };
    } catch (error) {
      logger.error('PayPal capture error', error);
      throw error;
    }
  }

  // Verify Stripe Webhook
  async verifyStripeWebhook(payload, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      logger.info('Stripe webhook received', { type: event.type, id: event.id });

      switch (event.type) {
        case 'checkout.session.completed':
          logger.info('Checkout session completed', {
            sessionId: event.data.object.id,
            orderId: event.data.object.metadata?.orderId
          });
          break;

        case 'payment_intent.succeeded':
          logger.info('Payment intent succeeded', {
            paymentIntentId: event.data.object.id
          });
          break;

        case 'payment_intent.payment_failed':
          logger.error('Payment intent failed', {
            paymentIntentId: event.data.object.id
          });
          break;
      }

      return { success: true, event };
    } catch (error) {
      logger.error('Stripe webhook verification error', error);
      throw error;
    }
  }

  // Get Stripe session details
  async getStripeSession(sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      logger.error('Get Stripe session error', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
