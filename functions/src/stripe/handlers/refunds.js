const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Handle charge refunded event
 */
async function handleChargeRefunded(charge) {
  try {

    const orderId = charge.metadata?.order_id;
    if (!orderId) {
      console.warn('No order_id in charge metadata');
      return;
    }

    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.error('Order not found for refund:', orderId);
      return;
    }

    // Update order status
    await orderRef.update({
      status: 'refunded',
      paymentStatus: 'refunded',
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      refundAmount: charge.amount_refunded / 100, // Convert from cents
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Also update user's order if it exists
    const orderData = orderDoc.data();
    if (orderData.userId) {
      const userOrderRef = db
          .collection('users')
          .doc(orderData.userId)
          .collection('esims')
          .doc(orderId);

      const userOrderDoc = await userOrderRef.get();
      if (userOrderDoc.exists) {
        await userOrderRef.update({
          status: 'refunded',
          paymentStatus: 'refunded',
          refundedAt: admin.firestore.FieldValue.serverTimestamp(),
          refundAmount: charge.amount_refunded / 100,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

  } catch (error) {
    console.error('Error handling charge refunded:', error);
    throw error;
  }
}

module.exports = {handleChargeRefunded};

