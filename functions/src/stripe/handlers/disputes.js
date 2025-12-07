const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Handle dispute/chargeback created event
 */
async function handleDisputeCreated(dispute, stripeInstance) {
  try {

    // Get the charge to find the order
    const charge = await stripeInstance.charges.retrieve(dispute.charge);
    const orderId = charge.metadata?.order_id;

    if (!orderId) {
      console.warn('No order_id in charge metadata for dispute');
      return;
    }

    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.error('Order not found for dispute:', orderId);
      return;
    }

    // Update order with dispute information
    await orderRef.update({
      status: 'disputed',
      dispute: {
        id: dispute.id,
        amount: dispute.amount / 100, // Convert from cents
        reason: dispute.reason,
        status: dispute.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        evidence: {
          dueBy: dispute.evidence_details?.due_by || null,
          hasEvidence: dispute.evidence_details?.has_evidence || false,
          submissionCount: dispute.evidence_details?.submission_count || 0,
        },
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Flag user for potential fraud monitoring
    const orderData = orderDoc.data();

    if (orderData.userId) {
      const userRef = db.collection('users').doc(orderData.userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        const currentDisputeCount = userData.fraudFlags?.disputeCount || 0;

        await userRef.update({
          'fraudFlags.disputeCount': currentDisputeCount + 1,
          'fraudFlags.lastDisputeAt': admin.firestore.FieldValue.serverTimestamp(),
          'fraudFlags.disputes': admin.firestore.FieldValue.arrayUnion({
            disputeId: dispute.id,
            orderId: orderId,
            amount: dispute.amount / 100,
            reason: dispute.reason,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
          'updatedAt': admin.firestore.FieldValue.serverTimestamp(),
        });

      }

      // Also update user's order
      const userOrderRef = db
          .collection('users')
          .doc(orderData.userId)
          .collection('esims')
          .doc(orderId);

      const userOrderDoc = await userOrderRef.get();
      if (userOrderDoc.exists) {
        await userOrderRef.update({
          status: 'disputed',
          dispute: {
            id: dispute.id,
            amount: dispute.amount / 100,
            reason: dispute.reason,
            status: dispute.status,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

  } catch (error) {
    console.error('Error handling dispute created:', error);
    throw error;
  }
}

module.exports = {handleDisputeCreated};

