const admin = require('firebase-admin');
const {trackCompletedPurchase, trackFailedPurchase} = require('../../fraud/fraudDetection');

const db = admin.firestore();

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent, stripeInstance) {
  try {

    // Get payment method details
    let paymentMethodFingerprint = null;
    let paymentMethodLast4 = null;
    let paymentMethodBrand = null;

    if (paymentIntent.payment_method) {
      try {
        const paymentMethod = await stripeInstance.paymentMethods.retrieve(
            paymentIntent.payment_method,
        );

        if (paymentMethod.card) {
          paymentMethodFingerprint = paymentMethod.card.fingerprint;
          paymentMethodLast4 = paymentMethod.card.last4;
          paymentMethodBrand = paymentMethod.card.brand;
        }
      } catch (error) {
        console.error('Error retrieving payment method:', error);
      }
    }

    const orderId = paymentIntent.metadata?.order_id;
    if (!orderId) {
      console.warn('No order_id in payment intent metadata');
      return;
    }

    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.error('Order not found for payment intent:', orderId);
      return;
    }

    const orderData = orderDoc.data();

    // Track completed purchase for fraud detection
    await trackCompletedPurchase({
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
        stripeChargeId: paymentIntent.latest_charge,
      },
    });

    // Update order with payment method info
    await orderRef.update({
      'paymentMethod.fingerprint': paymentMethodFingerprint,
      'paymentMethod.last4': paymentMethodLast4,
      'paymentMethod.brand': paymentMethodBrand,
      'paymentMethod.type': 'card',
      'updatedAt': admin.firestore.FieldValue.serverTimestamp(),
    });

  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
    throw error;
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent) {
  try {

    const orderId = paymentIntent.metadata?.order_id;
    if (!orderId) {
      console.warn('No order_id in payment intent metadata');
      return;
    }

    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.error('Order not found for failed payment:', orderId);
      return;
    }

    const orderData = orderDoc.data();

    // Update order status
    await orderRef.update({
      status: 'failed',
      paymentStatus: 'failed',
      failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
      failureCode: paymentIntent.last_payment_error?.code,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Track failed purchase for fraud detection
    await trackFailedPurchase({
      attemptId: orderData.fraudCheck?.attemptId,
      failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
      metadata: {
        orderId,
        stripePaymentIntentId: paymentIntent.id,
        failureCode: paymentIntent.last_payment_error?.code,
      },
    });

  } catch (error) {
    console.error('Error handling payment intent failed:', error);
    throw error;
  }
}

module.exports = {
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
};
