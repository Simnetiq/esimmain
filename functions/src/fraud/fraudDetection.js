const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Track completed purchase for fraud monitoring
 */
async function trackCompletedPurchase(data) {
  const {
    orderId,
    userId,
    email,
    amount,
    currency,
    paymentMethodFingerprint,
    paymentMethodLast4,
    paymentMethodBrand,
    riskScore,
    riskFactors,
    attemptId,
    metadata,
  } = data;

  try {
    const trackingData = {
      orderId,
      userId,
      email,
      amount,
      currency,
      paymentMethod: {
        fingerprint: paymentMethodFingerprint,
        last4: paymentMethodLast4,
        brand: paymentMethodBrand,
      },
      riskScore,
      riskFactors,
      attemptId,
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata,
    };

    // Store in fraud tracking collection
    await db.collection('fraudTracking').add(trackingData);

    // Update user's purchase stats
    if (userId) {
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        'stats.totalPurchases': admin.firestore.FieldValue.increment(1),
        'stats.totalSpent': admin.firestore.FieldValue.increment(amount),
        'stats.lastPurchaseAt': admin.firestore.FieldValue.serverTimestamp(),
      });
    }


  } catch (error) {
    console.error('Error tracking completed purchase:', error);
    throw error;
  }
}

/**
 * Track failed purchase attempt
 */
async function trackFailedPurchase(data) {
  const {attemptId, failureReason, metadata} = data;

  try {
    await db.collection('fraudTracking').add({
      attemptId,
      status: 'failed',
      failureReason,
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata,
    });

  } catch (error) {
    console.error('Error tracking failed purchase:', error);
    throw error;
  }
}

module.exports = {
  trackCompletedPurchase,
  trackFailedPurchase,
}
