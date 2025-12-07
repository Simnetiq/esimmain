const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(session) {
  try {

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

    // Email notifications are handled by your existing Hostinger email system

  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
}

module.exports = {handleCheckoutSessionCompleted};
