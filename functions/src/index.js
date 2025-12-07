const admin = require('firebase-admin');
const {stripeWebhook} = require('./stripe/webhookHandler');

// Initialize Firebase Admin
admin.initializeApp();

// Export the Stripe webhook function
exports.stripeWebhook = stripeWebhook;

// Export other functions as needed if required
// exports.processOrder = require('./orders/orderProcessor').processOrder;
