const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Handle charge succeeded event
 * This tracks 3DS authentication results
 */
async function handleChargeSucceeded(charge) {
  try {

    const orderId = charge.metadata?.order_id;
    if (!orderId) {
      return;
    }

    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return;
    }

    // Track 3DS authentication result
    const threeDSecure = charge.payment_method_details?.card?.three_d_secure;

    if (threeDSecure) {
      await orderRef.update({
        'authentication.threeDSecure': {
          authenticated: threeDSecure.authenticated,
          result: threeDSecure.result,
          version: threeDSecure.version,
        },
        'updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });

    }

    // Track payment method details
    const card = charge.payment_method_details?.card;
    if (card) {
      await orderRef.update({
        'paymentMethod.network': card.network,
        'paymentMethod.funding': card.funding,
        'paymentMethod.country': card.country,
        'paymentMethod.checks': {
          addressLine1Check: card.checks?.address_line1_check,
          addressPostalCodeCheck: card.checks?.address_postal_code_check,
          cvcCheck: card.checks?.cvc_check,
        },
        'updatedAt': admin.firestore.FieldValue.serverTimestamp(),
      });
    }

  } catch (error) {
    console.error('Error handling charge succeeded:', error);
    throw error;
  }
}

module.exports = {handleChargeSucceeded};

