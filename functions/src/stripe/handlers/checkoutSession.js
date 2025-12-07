const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Handle successful checkout session
 * 
 * NOTE: This is a simplified handler used by Firebase Functions.
 * The main webhook handler with full eSIM creation logic is in:
 * packages/customer-app/app/api/stripe-webhook/route.js
 * 
 * This handler includes PRICE VALIDATION and CARD BLOCKING for security.
 */
async function handleCheckoutSessionCompleted(session, stripeInstance) {
  try {
    // Verify payment was successful
    if (session.payment_status !== 'paid') {
      console.error('🚨 Payment not completed, status:', session.payment_status);
      return;
    }

    const orderId = session.metadata?.order_id;
    if (!orderId) {
      return;
    }

    // Get order from Firestore
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.error('Order not found:', orderId);
      return;
    }

    const orderData = orderDoc.data();
    
    // ========================================
    // SECURITY: Verify payment amount matches order
    // ========================================
    const paidAmount = session.amount_total / 100; // Convert from cents
    const expectedAmount = orderData.amount;
    
    if (Math.abs(paidAmount - expectedAmount) > 0.01) {
      console.error('🚨 PAYMENT AMOUNT MISMATCH!', {
        orderId,
        paidAmount,
        expectedAmount,
        difference: Math.abs(paidAmount - expectedAmount)
      });
      
      // Get payment method details to block the card
      let cardFingerprint = null;
      let cardLast4 = null;
      let cardBrand = null;
      
      try {
        if (session.payment_intent && stripeInstance) {
          const paymentIntent = await stripeInstance.paymentIntents.retrieve(session.payment_intent);
          if (paymentIntent.payment_method) {
            const paymentMethod = await stripeInstance.paymentMethods.retrieve(paymentIntent.payment_method);
            if (paymentMethod.card) {
              cardFingerprint = paymentMethod.card.fingerprint;
              cardLast4 = paymentMethod.card.last4;
              cardBrand = paymentMethod.card.brand;
            }
          }
        }
      } catch (e) {
        console.error('Failed to retrieve payment method for blocking:', e);
      }
      
      // Log fraud attempt and block card
      try {
        // Log the fraud attempt
        await db.collection('fraud_attempts').add({
          type: 'payment_amount_mismatch',
          orderId,
          paidAmount,
          expectedAmount,
          sessionId: session.id,
          customerEmail: orderData.customerEmail,
          userId: orderData.userId,
          cardFingerprint,
          cardLast4,
          cardBrand,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // CRITICAL: Block the card fingerprint to prevent reuse
        if (cardFingerprint) {
          const blockId = `block_${Date.now()}`;
          await db.collection('fraud_blocklist').doc(blockId).set({
            userId: orderData.userId || null,
            email: orderData.customerEmail?.toLowerCase() || null,
            cardFingerprint: cardFingerprint,
            cardLast4: cardLast4,
            cardBrand: cardBrand,
            reason: `AUTO-BLOCK: Price manipulation detected in webhook. Paid ${paidAmount} ${orderData.currency}, expected ${expectedAmount}. Card ${cardBrand} ****${cardLast4}`,
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'firebase_webhook_fraud_detection',
            metadata: {
              orderId,
              sessionId: session.id,
              paidAmount,
              expectedAmount,
              difference: Math.abs(paidAmount - expectedAmount)
            }
          });
          
          console.error('🚨 CARD BLOCKED:', {
            cardFingerprint,
            cardLast4,
            cardBrand,
            email: orderData.customerEmail
          });
        }
      } catch (e) {
        console.error('Failed to log fraud attempt and block card:', e);
      }
      
      // Block if user paid LESS
      if (paidAmount < expectedAmount - 0.01) {
        await orderRef.update({
          status: 'payment_mismatch',
          paymentStatus: 'failed',
          errorMessage: `Payment amount mismatch: paid ${paidAmount}, expected ${expectedAmount}`,
          fraudBlocked: true,
          blockedCard: cardFingerprint ? `${cardBrand} ****${cardLast4}` : 'unknown',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }
    }

    // Update order status
    await orderRef.update({
      status: 'completed',
      paymentStatus: 'completed',
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update user's order if userId exists
    if (orderData.userId) {
      const userOrderRef = db
          .collection('users')
          .doc(orderData.userId)
          .collection('esims')
          .doc(orderId);

      await userOrderRef.update({
        status: 'completed',
        paymentStatus: 'completed',
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
}

module.exports = {handleCheckoutSessionCompleted};
