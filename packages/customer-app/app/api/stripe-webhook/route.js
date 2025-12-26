import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@esim/shared/firebase/config';
import { doc, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  trackCompletedPurchase,
  trackFailedPurchase
} from '@esim/shared/services/fraudDetectionService';
import {
  recordBlockedPayment,
  syncToStripeRadar
} from '@esim/shared/services/fraudSignalsService';

// Get Stripe secret key based on mode (test or live)
const getStripeSecretKey = () => {
  const stripeMode = process.env.STRIPE_MODE || 'live';

  if (stripeMode === 'test' || stripeMode === 'sandbox') {
    return process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
  } else {
    return process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
  }
};

// Get webhook secret based on mode
const getWebhookSecret = () => {
  const stripeMode = process.env.STRIPE_MODE || 'live';

  if (stripeMode === 'test' || stripeMode === 'sandbox') {
    return process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET;
  } else {
    return process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET;
  }
};

const stripeSecretKey = getStripeSecretKey();
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
}) : null;

/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe events including:
 * - checkout.session.completed (successful payment)
 * - payment_intent.succeeded (payment confirmed)
 * - payment_intent.payment_failed (payment failed)
 * - charge.refunded (refund processed)
 * - charge.dispute.created (chargeback/dispute)
 * 
 * Also updates fraud tracking for payment monitoring
 */
export async function POST(request) {
  try {
    const webhookSecret = getWebhookSecret();

    if (!stripe || !stripeSecretKey) {
      console.error('Stripe not configured');
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      );
    }

    // Get the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    let event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return NextResponse.json(
          { error: `Webhook Error: ${err.message}` },
          { status: 400 }
        );
      }
    } else {
      // No signature verification (not recommended for production)
      event = JSON.parse(body);
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object);
        break;

      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object);
        break;

      // NEW: Handle Radar blocked payments
      case 'charge.blocked':
        await handleChargeBlocked(event.data.object);
        break;

      // NEW: Handle early fraud warnings
      case 'radar.early_fraud_warning.created':
        await handleEarlyFraudWarning(event.data.object);
        break;

      // NEW: Handle payment intent requires action (for 3DS failures that might be fraud)
      case 'payment_intent.requires_action':
        await handlePaymentRequiresAction(event.data.object);
        break;

      default:
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: `Webhook handler failed: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout session
 * This is the main handler that creates the Airalo eSIM order after payment
 * 
 * SECURITY: This is the ONLY place eSIMs should be created.
 * Payment is verified by Stripe webhook signature.
 */
async function handleCheckoutSessionCompleted(session) {
  try {
    // ========================================
    // SECURITY: Verify payment was successful
    // ========================================
    if (session.payment_status !== 'paid') {
      console.error('🚨 Payment not completed, status:', session.payment_status);
      return;
    }

    const orderId = session.metadata?.order_id;
    if (!orderId) {
      console.error('No order_id in session metadata');
      return;
    }

    // Get order from Firestore
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      console.error('Order not found:', orderId);
      return;
    }

    const orderData = orderDoc.data();

    // ========================================
    // SECURITY: Prevent duplicate eSIM creation
    // ========================================
    if (orderData.esimCreated || orderData.status === 'completed') {
      return;
    }

    // ========================================
    // SECURITY: Verify payment amount matches order
    // ========================================
    const paidAmount = session.amount_total / 100; // Convert from cents
    const expectedAmount = orderData.amount;

    if (Math.abs(paidAmount - expectedAmount) > 0.01) {
      // Get payment method details to block the card
      let cardFingerprint = null;
      let cardLast4 = null;
      let cardBrand = null;

      try {
        if (session.payment_intent) {
          const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
          if (paymentIntent.payment_method) {
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
            if (paymentMethod.card) {
              cardFingerprint = paymentMethod.card.fingerprint;
              cardLast4 = paymentMethod.card.last4;
              cardBrand = paymentMethod.card.brand;
            }
          }
        }
      } catch (e) {
      }

      // Log fraud attempt with card details
      try {
        const { logPriceManipulationAttempt, addToBlocklist } = await import('@esim/shared/services/fraudDetectionService');

        // Log the fraud attempt
        await logPriceManipulationAttempt(db, {
          packageId: orderData.packageId,
          userId: orderData.userId,
          email: orderData.customerEmail,
          databasePrice: expectedAmount,
          submittedPrice: paidAmount,
          priceDifference: Math.abs(paidAmount - expectedAmount),
          cardFingerprint,
          cardLast4,
          cardBrand,
          sessionId: session.id,
          autoBlock: true,
          metadata: {
            type: 'webhook_payment_amount_mismatch',
            orderId,
            timestamp: new Date().toISOString()
          }
        });

        // CRITICAL: Block the card fingerprint to prevent reuse
        if (cardFingerprint) {
          await addToBlocklist(db, {
            userId: orderData.userId,
            email: orderData.customerEmail,
            cardFingerprint: cardFingerprint,
            cardLast4: cardLast4,
            cardBrand: cardBrand,
            reason: `AUTO-BLOCK: Price manipulation detected in webhook. Paid ${paidAmount} ${orderData.currency}, expected ${expectedAmount}. Card ${cardBrand} ****${cardLast4}`,
            createdBy: 'webhook_fraud_detection',
            metadata: {
              orderId,
              sessionId: session.id,
              paidAmount,
              expectedAmount,
              difference: Math.abs(paidAmount - expectedAmount)
            }
          });

        }
      } catch (e) {
      }

      // Still process if user paid MORE (refund difference manually)
      // Block if user paid LESS
      if (paidAmount < expectedAmount - 0.01) {
        await updateDoc(orderRef, {
          status: 'payment_mismatch',
          paymentStatus: 'failed',
          errorMessage: `Payment amount mismatch: paid ${paidAmount}, expected ${expectedAmount}`,
          fraudBlocked: true,
          blockedCard: cardFingerprint ? `${cardBrand} ****${cardLast4}` : 'unknown',
          updatedAt: serverTimestamp()
        });
        return;
      }
    }

    // Update order to processing status - payment is now complete
    await updateDoc(orderRef, {
      status: 'processing',
      paymentStatus: 'completed',
      paymentCompletedAt: serverTimestamp(), // Track when payment completed
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      updatedAt: serverTimestamp()
    });


    // ========================================
    // CREATE AIRALO eSIM ORDER
    // ========================================
    try {
      const packageId = orderData.packageId || orderData.planId;

      if (!packageId) {
        console.error('❌ No package ID found in order data:', orderData);
        throw new Error('No package ID found in order data');
      }

      // Get Airalo credentials based on mode (sandbox or production)
      const airaloMode = process.env.AIRALO_MODE || 'production';
      const isSandbox = airaloMode === 'sandbox' || airaloMode === 'test';


      // Use sandbox or production credentials
      const clientId = isSandbox
        ? (process.env.AIRALO_CLIENT_ID_SANDBOX || process.env.AIRALO_CLIENT_ID)
        : process.env.AIRALO_CLIENT_ID;
      const clientSecret = isSandbox
        ? (process.env.AIRALO_CLIENT_SECRET_SANDBOX || process.env.AIRALO_CLIENT_SECRET)
        : process.env.AIRALO_CLIENT_SECRET;

      // Airalo sandbox URL: https://sandbox-partners-api.airalo.com
      // Airalo production URL: https://partners-api.airalo.com
      const airaloBaseUrl = isSandbox
        ? (process.env.AIRALO_BASE_URL_SANDBOX || 'https://sandbox-partners-api.airalo.com')
        : (process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com');


      if (!clientId || !clientSecret) {
        throw new Error('Airalo API credentials not configured');
      }

      // Step 1: Authenticate with Airalo OAuth2
      const authResponse = await fetch(`${airaloBaseUrl}/v2/token`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials'
        })
      });

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.error('❌ Airalo auth failed:', errorText);
        throw new Error(`Airalo authentication failed: ${errorText}`);
      }

      const authData = await authResponse.json();
      const accessToken = authData.data?.access_token;

      if (!accessToken) {
        console.error('❌ No access token in response:', authData);
        throw new Error('No access token received from Airalo');
      }

      // Step 2: Create the eSIM order
      const orderResponse = await fetch(`${airaloBaseUrl}/v2/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          package_id: packageId,
          quantity: 1,
          type: 'sim',
          description: `Order ${orderId} for ${orderData.customerEmail || 'customer'}`
        })
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('❌ Airalo order failed:', {
          status: orderResponse.status,
          error: errorText,
          packageId,
          orderId
        });
        throw new Error(`Airalo order creation failed: ${errorText}`);
      }

      const airaloOrderResult = await orderResponse.json();

      const airaloOrder = airaloOrderResult.data;
      const airaloOrderId = airaloOrder?.id;
      const simData = airaloOrder?.sims?.[0];

      if (!airaloOrderId) {
        console.error('❌ No order ID in Airalo response:', airaloOrderResult);
        throw new Error('No order ID returned from Airalo');
      }

      // Step 3: Update order with eSIM data
      // IMPORTANT: We save both snake_case and camelCase for backwards compatibility
      // This ensures all components (old and new) can read the data correctly
      const esimUpdateData = {
        status: 'completed',
        airaloOrderId: airaloOrderId,
        airaloOrderData: airaloOrder,
        orderData: airaloOrder, // Also save as orderData for Dashboard.jsx
        esimCreated: true,
        esimCreatedAt: serverTimestamp(),
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add SIM data if available - save BOTH formats for complete compatibility
      if (simData) {
        const lpaString = simData.qrcode || simData.lpa;

        // snake_case fields (primary storage format)
        esimUpdateData.iccid = simData.iccid || null;
        esimUpdateData.qr_code = lpaString || null;
        esimUpdateData.qr_code_url = simData.qrcode_url || null;
        esimUpdateData.direct_apple_installation_url = simData.direct_apple_installation_url || simData.qrcode_url || null;
        esimUpdateData.matching_id = simData.matching_id || null;
        esimUpdateData.activation_code = simData.activation_code || simData.matching_id || null;
        esimUpdateData.smdp_address = simData.lpa || null;

        // camelCase fields (for backwards compatibility)
        esimUpdateData.lpa = lpaString || null;
        esimUpdateData.qrCode = lpaString || null;
        esimUpdateData.qrCodeUrl = simData.qrcode_url || null;
        esimUpdateData.directAppleInstallationUrl = simData.direct_apple_installation_url || simData.qrcode_url || null;
        esimUpdateData.matchingId = simData.matching_id || null;
        esimUpdateData.activationCode = simData.activation_code || simData.matching_id || null;
        esimUpdateData.smdpAddress = simData.lpa || null;

        esimUpdateData.simData = simData;
      } else {
        console.warn('⚠️ No SIM data in Airalo response');
      }

      await updateDoc(orderRef, esimUpdateData);

      // Also update user's order if userId exists
      // CRITICAL: Use setDoc with merge:true to CREATE the document if it doesn't exist
      // This fixes the bug where updateDoc fails silently if the doc wasn't created
      if (orderData.userId) {
        try {
          const userOrderRef = doc(db, 'users', orderData.userId, 'esims', orderId);

          // First, try to get the existing document to merge data properly
          const userOrderDoc = await getDoc(userOrderRef);

          if (userOrderDoc.exists()) {
            // Document exists, update it
            await updateDoc(userOrderRef, esimUpdateData);
          } else {
            // Document doesn't exist - CREATE it with all order data
            // This handles the case where create-payment-order didn't save to user's collection
            const fullOrderData = {
              ...orderData,  // Include original order data
              ...esimUpdateData,  // Include new eSIM data
              userId: orderData.userId,
              createdAt: orderData.createdAt || serverTimestamp(),
            };
            await setDoc(userOrderRef, fullOrderData);
          }
        } catch (userOrderError) {
          console.error('❌ Error updating/creating user order:', userOrderError);

          // CRITICAL: Try one more time with setDoc to ensure the user gets their eSIM
          try {
            const userOrderRef = doc(db, 'users', orderData.userId, 'esims', orderId);
            const fullOrderData = {
              ...orderData,
              ...esimUpdateData,
              userId: orderData.userId,
              recoveryAttempt: true,
              recoveryAt: serverTimestamp()
            };
            await setDoc(userOrderRef, fullOrderData, { merge: true });
          } catch (recoveryError) {
            console.error('❌ CRITICAL: Failed to recover user order:', recoveryError);
          }
        }
      } else {
        console.warn('⚠️ No userId in order data - user will need to check orders page manually');
      }

    } catch (airaloError) {
      console.error('❌ AIRALO ERROR:', {
        message: airaloError.message,
        stack: airaloError.stack,
        orderId,
        packageId: orderData.packageId || orderData.planId
      });

      // Update order with error status - payment completed but eSIM creation failed
      // Set completedAt to mark when we finished processing (even though it failed)
      // This ensures data consistency for queries filtering by completedAt
      await updateDoc(orderRef, {
        status: 'esim_creation_failed',
        paymentStatus: 'completed',
        esimCreated: false,
        esimError: airaloError.message,
        esimErrorStack: airaloError.stack,
        esimErrorAt: serverTimestamp(),
        completedAt: serverTimestamp(), // Mark processing as complete (with error)
        updatedAt: serverTimestamp()
      });

    }

  } catch (error) {
    
  }
}

/**
 * Handle successful payment intent
 * This is where we track the payment for fraud detection
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    const orderId = paymentIntent.metadata?.order_id;

    if (!orderId) {
      console.warn('No order_id in payment intent metadata');
      return;
    }

    // Get payment method details for fraud tracking
    let paymentMethodFingerprint = null;
    let paymentMethodLast4 = null;
    let paymentMethodBrand = null;

    if (paymentIntent.payment_method) {
      try {
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
        if (paymentMethod.card) {
          paymentMethodFingerprint = paymentMethod.card.fingerprint;
          paymentMethodLast4 = paymentMethod.card.last4;
          paymentMethodBrand = paymentMethod.card.brand;
        }
      } catch (error) {
      }
    }

    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      return;
    }

    const orderData = orderDoc.data();

    // Track completed purchase for fraud detection
    await trackCompletedPurchase(db, {
      orderId,
      userId: orderData.userId,
      email: orderData.customerEmail,
      amount: orderData.amount,
      currency: orderData.currency,
      paymentMethodFingerprint,
      paymentMethodLast4,
      paymentMethodBrand,
      riskScore: orderData.fraudCheck?.riskScore || 0,
      riskFactors: orderData.fraudCheck?.riskFactors || [],
      attemptId: orderData.fraudCheck?.attemptId,
      metadata: {
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId: paymentIntent.latest_charge
      }
    });

    // Update order with payment method info
    await updateDoc(orderRef, {
      'paymentMethod.fingerprint': paymentMethodFingerprint,
      'paymentMethod.last4': paymentMethodLast4,
      'paymentMethod.brand': paymentMethodBrand,
      'paymentMethod.type': 'card',
      stripePaymentIntentId: paymentIntent.id,
      updatedAt: serverTimestamp()
    });

    // ============================================
    // NEW: CREATE ESIM FOR MOBILE PAYMENTS
    // ============================================
    // Check if this is a mobile payment (no checkout session) and eSIM not yet created
    // We check !orderData.esimCreated to avoid duplicates
    if (!orderData.esimCreated && orderData.status !== 'completed') {

      // Verify payment amount
      const paidAmount = paymentIntent.amount / 100;
      const expectedAmount = orderData.amount;

      // Allow small float difference
      if (Math.abs(paidAmount - expectedAmount) > 0.01) {
        // Only fail if paid LESS (block underpayment)
        if (paidAmount < expectedAmount - 0.01) {
          await updateDoc(orderRef, {
            status: 'payment_mismatch',
            paymentStatus: 'failed',
            errorMessage: `Payment amount mismatch: paid ${paidAmount}, expected ${expectedAmount}`,
            updatedAt: serverTimestamp()
          });
          return;
        }
      }

      // Update to processing
      await updateDoc(orderRef, {
        status: 'processing',
        paymentStatus: 'completed',
        paymentCompletedAt: serverTimestamp(),
        stripePaymentIntentId: paymentIntent.id,
        updatedAt: serverTimestamp()
      });

      // Create Airalo eSIM (same logic as handleCheckoutSessionCompleted)
      try {
        const packageId = orderData.packageId || orderData.planId;

        if (!packageId) {
          throw new Error('No package ID found in order data');
        }

        // Get Airalo credentials
        const airaloMode = process.env.AIRALO_MODE || 'production';
        const isSandbox = airaloMode === 'sandbox' || airaloMode === 'test';

        const clientId = isSandbox
          ? (process.env.AIRALO_CLIENT_ID_SANDBOX || process.env.AIRALO_CLIENT_ID)
          : process.env.AIRALO_CLIENT_ID;
        const clientSecret = isSandbox
          ? (process.env.AIRALO_CLIENT_SECRET_SANDBOX || process.env.AIRALO_CLIENT_SECRET)
          : process.env.AIRALO_CLIENT_SECRET;
        const airaloBaseUrl = isSandbox
          ? (process.env.AIRALO_BASE_URL_SANDBOX || 'https://sandbox-partners-api.airalo.com')
          : (process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com');

        if (!clientId || !clientSecret) {
          throw new Error('Airalo API credentials not configured');
        }

        // Authenticate with Airalo
        const authResponse = await fetch(`${airaloBaseUrl}/v2/token`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials'
          })
        });

        if (!authResponse.ok) {
          const errorText = await authResponse.text();
          throw new Error(`Airalo authentication failed: ${errorText}`);
        }

        const authData = await authResponse.json();
        const accessToken = authData.data?.access_token;

        if (!accessToken) {
          throw new Error('No access token received from Airalo');
        }

        // Create eSIM order
        const orderResponse = await fetch(`${airaloBaseUrl}/v2/orders`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            package_id: packageId,
            quantity: 1,
            type: 'sim',
            description: `Order ${orderId} for ${orderData.customerEmail || 'customer'}`
          })
        });

        if (!orderResponse.ok) {
          const errorText = await orderResponse.text();
          throw new Error(`Airalo order creation failed: ${errorText}`);
        }

        const airaloOrderResult = await orderResponse.json();
        const airaloOrder = airaloOrderResult.data;
        const airaloOrderId = airaloOrder?.id;
        const simData = airaloOrder?.sims?.[0];

        if (!airaloOrderId) {
          throw new Error('No order ID returned from Airalo');
        }

        // Update order with eSIM data
        const esimUpdateData = {
          status: 'completed',
          airaloOrderId: airaloOrderId,
          airaloOrderData: airaloOrder,
          orderData: airaloOrder,
          esimCreated: true,
          esimCreatedAt: serverTimestamp(),
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        if (simData) {
          const lpaString = simData.qrcode || simData.lpa;

          // snake_case fields
          esimUpdateData.iccid = simData.iccid || null;
          esimUpdateData.qr_code = lpaString || null;
          esimUpdateData.qr_code_url = simData.qrcode_url || null;
          esimUpdateData.direct_apple_installation_url = simData.direct_apple_installation_url || simData.qrcode_url || null; // Enhanced fallback
          esimUpdateData.matching_id = simData.matching_id || null;
          esimUpdateData.activation_code = simData.activation_code || simData.matching_id || null;
          esimUpdateData.smdp_address = simData.lpa || null;

          // camelCase fields
          esimUpdateData.lpa = lpaString || null;
          esimUpdateData.qrCode = lpaString || null;
          esimUpdateData.qrCodeUrl = simData.qrcode_url || null;
          esimUpdateData.directAppleInstallationUrl = simData.direct_apple_installation_url || simData.qrcode_url || null; // Enhanced fallback
          esimUpdateData.matchingId = simData.matching_id || null;
          esimUpdateData.activationCode = simData.activation_code || simData.matching_id || null;
          esimUpdateData.smdpAddress = simData.lpa || null;

          esimUpdateData.simData = simData;
        }

        await updateDoc(orderRef, esimUpdateData);

        // Update user's esims collection
        if (orderData.userId) {
          try {
            const userOrderRef = doc(db, 'users', orderData.userId, 'esims', orderId);
            const userOrderDoc = await getDoc(userOrderRef);

            if (userOrderDoc.exists()) {
              await updateDoc(userOrderRef, esimUpdateData);
            } else {
              // Ensure we have all necessary fields for a new doc
              const fullOrderData = {
                ...orderData,
                ...esimUpdateData,
                userId: orderData.userId,
                createdAt: orderData.createdAt || serverTimestamp(),
              };
              await setDoc(userOrderRef, fullOrderData);
            }
          } catch (userOrderError) {
            console.error('❌ Error updating user order:', userOrderError);
          }
        }

      } catch (airaloError) {
        await updateDoc(orderRef, {
          status: 'esim_creation_failed',
          paymentStatus: 'completed',
          esimCreated: false,
          esimError: airaloError.message,
          esimErrorAt: serverTimestamp(),
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }

  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

/**
 * Handle failed payment intent
 * Also tracks Radar blocks that come through as failures
 */
async function handlePaymentIntentFailed(paymentIntent) {
  try {

    const orderId = paymentIntent.metadata?.order_id;
    const email = paymentIntent.receipt_email || paymentIntent.metadata?.email;
    const userId = paymentIntent.metadata?.userId;

    // Check if this was blocked by Radar
    const wasBlockedByRadar = paymentIntent.last_payment_error?.type === 'card_error' &&
      (paymentIntent.last_payment_error?.decline_code === 'fraudulent' ||
       paymentIntent.last_payment_error?.decline_code === 'merchant_blacklist' ||
       paymentIntent.charges?.data?.[0]?.outcome?.type === 'blocked');

    // Extract payment method details for fraud tracking
    let cardFingerprint = null;
    let cardLast4 = null;
    let cardBrand = null;

    if (paymentIntent.last_payment_error?.payment_method?.card) {
      cardFingerprint = paymentIntent.last_payment_error.payment_method.card.fingerprint;
      cardLast4 = paymentIntent.last_payment_error.payment_method.card.last4;
      cardBrand = paymentIntent.last_payment_error.payment_method.card.brand;
    } else if (paymentIntent.payment_method) {
      try {
        const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
        if (pm.card) {
          cardFingerprint = pm.card.fingerprint;
          cardLast4 = pm.card.last4;
          cardBrand = pm.card.brand;
        }
      } catch (e) {
      }
    }

    // If blocked by Radar or high-risk decline, record in fraud signals
    if (wasBlockedByRadar || paymentIntent.last_payment_error?.decline_code === 'do_not_honor') {

      await recordBlockedPayment(db, {
        userId,
        email,
        cardFingerprint,
        cardLast4,
        cardBrand,
        stripePaymentIntentId: paymentIntent.id,
        blockReason: paymentIntent.last_payment_error?.decline_code || 'payment_failed',
        riskLevel: wasBlockedByRadar ? 'highest' : 'high',
        riskScore: wasBlockedByRadar ? 100 : 70,
        metadata: {
          orderId,
          errorType: paymentIntent.last_payment_error?.type,
          errorCode: paymentIntent.last_payment_error?.code,
          declineCode: paymentIntent.last_payment_error?.decline_code,
          errorMessage: paymentIntent.last_payment_error?.message
        }
      });
    }

    if (!orderId) {
      console.warn('No order_id in payment intent metadata');
      return;
    }

    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      console.error('Order not found for failed payment:', orderId);
      return;
    }

    const orderData = orderDoc.data();

    // Update order status with more details
    await updateDoc(orderRef, {
      status: wasBlockedByRadar ? 'blocked' : 'failed',
      paymentStatus: wasBlockedByRadar ? 'blocked' : 'failed',
      failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
      failureCode: paymentIntent.last_payment_error?.code,
      declineCode: paymentIntent.last_payment_error?.decline_code,
      wasBlockedByRadar,
      blockedCard: cardFingerprint ? `${cardBrand} ****${cardLast4}` : null,
      updatedAt: serverTimestamp()
    });

    // Track failed purchase for fraud detection
    await trackFailedPurchase(db, {
      attemptId: orderData.fraudCheck?.attemptId,
      failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
      metadata: {
        orderId,
        stripePaymentIntentId: paymentIntent.id,
        failureCode: paymentIntent.last_payment_error?.code,
        wasBlockedByRadar,
        cardFingerprint
      }
    });

  } catch (error) {
  }
}

/**
 * Handle charge succeeded (for 3DS authentication tracking)
 */
async function handleChargeSucceeded(charge) {
  try {

    const orderId = charge.metadata?.order_id;
    if (!orderId) {
      return;
    }

    const orderRef = doc(db, 'orders', orderId);

    // Track 3DS authentication result
    const threeDSecure = charge.payment_method_details?.card?.three_d_secure;

    if (threeDSecure) {
      await updateDoc(orderRef, {
        'authentication.threeDSecure': {
          authenticated: threeDSecure.authenticated,
          result: threeDSecure.result,
          version: threeDSecure.version
        },
        updatedAt: serverTimestamp()
      });

    }

  } catch (error) {
    console.error('Error handling charge succeeded:', error);
  }
}

/**
 * Handle refund
 */
async function handleChargeRefunded(charge) {
  try {

    const orderId = charge.metadata?.order_id;
    if (!orderId) {
      return;
    }

    const orderRef = doc(db, 'orders', orderId);

    await updateDoc(orderRef, {
      status: 'refunded',
      paymentStatus: 'refunded',
      refundedAt: serverTimestamp(),
      refundAmount: charge.amount_refunded / 100, // Convert from cents
      updatedAt: serverTimestamp()
    });


  } catch (error) {
    console.error('Error handling charge refunded:', error);
  }
}

/**
 * Handle dispute/chargeback created
 */
async function handleDisputeCreated(dispute) {
  try {

    const charge = await stripe.charges.retrieve(dispute.charge);
    const orderId = charge.metadata?.order_id;

    if (!orderId) {
      return;
    }

    const orderRef = doc(db, 'orders', orderId);

    await updateDoc(orderRef, {
      status: 'disputed',
      dispute: {
        id: dispute.id,
        amount: dispute.amount / 100,
        reason: dispute.reason,
        status: dispute.status,
        createdAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });

    // Flag user for potential fraud
    const orderDoc = await getDoc(orderRef);
    if (orderDoc.exists()) {
      const orderData = orderDoc.data();

      if (orderData.userId) {
        const userRef = doc(db, 'users', orderData.userId);
        await updateDoc(userRef, {
          'fraudFlags.disputeCount': (orderData.fraudFlags?.disputeCount || 0) + 1,
          'fraudFlags.lastDisputeAt': serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }

  } catch (error) {
    console.error('Error handling dispute created:', error);
  }
}

/**
 * Handle Stripe Radar blocked charge
 * This is triggered when Radar blocks a payment before it reaches the network
 */
async function handleChargeBlocked(charge) {
  try {

    const orderId = charge.metadata?.order_id;
    const email = charge.receipt_email || charge.billing_details?.email || charge.metadata?.email;
    const userId = charge.metadata?.userId;

    // Extract payment method details
    let cardFingerprint = null;
    let cardLast4 = null;
    let cardBrand = null;

    if (charge.payment_method_details?.card) {
      cardFingerprint = charge.payment_method_details.card.fingerprint;
      cardLast4 = charge.payment_method_details.card.last4;
      cardBrand = charge.payment_method_details.card.brand;
    }

    // Get IP and device info from charge
    const ipAddress = charge.billing_details?.address?.country || null;
    const countryCode = charge.payment_method_details?.card?.country;

    // Record the blocked payment in our fraud signals system
    await recordBlockedPayment(db, {
      userId,
      email,
      cardFingerprint,
      cardLast4,
      cardBrand,
      ipAddress,
      stripePaymentIntentId: charge.payment_intent,
      stripeChargeId: charge.id,
      blockReason: charge.outcome?.reason || 'highest_risk_level',
      riskLevel: charge.outcome?.risk_level || 'highest',
      riskScore: charge.outcome?.risk_score || 100,
      countryCode,
      metadata: {
        orderId,
        outcomeType: charge.outcome?.type,
        sellerMessage: charge.outcome?.seller_message,
        networkStatus: charge.outcome?.network_status
      }
    });

    // Update order status if we have an order ID
    if (orderId) {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);

      if (orderDoc.exists()) {
        await updateDoc(orderRef, {
          status: 'blocked',
          paymentStatus: 'blocked',
          blockedAt: serverTimestamp(),
          blockedReason: charge.outcome?.seller_message || 'Blocked by Radar',
          blockedCard: cardFingerprint ? `${cardBrand} ****${cardLast4}` : null,
          riskLevel: charge.outcome?.risk_level,
          updatedAt: serverTimestamp()
        });
      }
    }

  } catch (error) {
    console.error('Error handling charge blocked:', error);
  }
}

/**
 * Handle early fraud warning from Stripe Radar
 * This is triggered when Radar detects a potentially fraudulent payment after it succeeded
 */
async function handleEarlyFraudWarning(warning) {
  try {

    const chargeId = warning.charge;
    
    // Get the charge details
    const charge = await stripe.charges.retrieve(chargeId);
    const orderId = charge.metadata?.order_id;
    const email = charge.receipt_email || charge.billing_details?.email || charge.metadata?.email;
    const userId = charge.metadata?.userId;

    // Extract payment method details
    let cardFingerprint = null;
    let cardLast4 = null;
    let cardBrand = null;

    if (charge.payment_method_details?.card) {
      cardFingerprint = charge.payment_method_details.card.fingerprint;
      cardLast4 = charge.payment_method_details.card.last4;
      cardBrand = charge.payment_method_details.card.brand;
    }

    // Record the fraud warning
    await recordBlockedPayment(db, {
      userId,
      email,
      cardFingerprint,
      cardLast4,
      cardBrand,
      stripePaymentIntentId: charge.payment_intent,
      stripeChargeId: charge.id,
      blockReason: 'early_fraud_warning',
      riskLevel: 'highest',
      riskScore: 100,
      metadata: {
        orderId,
        fraudType: warning.fraud_type,
        actionable: warning.actionable,
        warningId: warning.id
      }
    });

    // Update order status
    if (orderId) {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);

      if (orderDoc.exists()) {
        await updateDoc(orderRef, {
          'fraudWarning.id': warning.id,
          'fraudWarning.fraudType': warning.fraud_type,
          'fraudWarning.createdAt': serverTimestamp(),
          'fraudWarning.actionable': warning.actionable,
          updatedAt: serverTimestamp()
        });
      }
    }

    // Consider auto-refunding if actionable
    if (warning.actionable) {
      
      // Log for manual review
      await setDoc(doc(db, 'fraud_warnings', warning.id), {
        warningId: warning.id,
        chargeId,
        orderId,
        userId,
        email,
        cardFingerprint,
        cardLast4,
        cardBrand,
        fraudType: warning.fraud_type,
        actionable: warning.actionable,
        createdAt: serverTimestamp(),
        reviewed: false,
        action: null
      });
    }


  } catch (error) {
    console.error('Error handling early fraud warning:', error);
  }
}

/**
 * Handle payment intent requires action (3DS challenges)
 * Track failed 3DS as potential fraud signal
 */
async function handlePaymentRequiresAction(paymentIntent) {
  try {
    // Only log if this is a repeated 3DS challenge (potential fraud pattern)
    const orderId = paymentIntent.metadata?.order_id;
    const email = paymentIntent.receipt_email || paymentIntent.metadata?.email;
    const userId = paymentIntent.metadata?.userId;

    // Get the order to check how many times 3DS has been triggered
    if (orderId) {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);

      if (orderDoc.exists()) {
        const orderData = orderDoc.data();
        const threeDSAttempts = (orderData.threeDSAttempts || 0) + 1;

        await updateDoc(orderRef, {
          threeDSAttempts,
          lastThreeDSAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // If multiple 3DS failures, this is suspicious
        if (threeDSAttempts >= 3) {
          
          await recordBlockedPayment(db, {
            userId,
            email,
            stripePaymentIntentId: paymentIntent.id,
            blockReason: 'repeated_3ds_failures',
            riskLevel: 'high',
            riskScore: 60,
            metadata: {
              orderId,
              threeDSAttempts
            }
          });
        }
      }
    }

  } catch (error) {
  }
}

