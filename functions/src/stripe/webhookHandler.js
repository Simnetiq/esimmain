const functions = require('firebase-functions');
const stripe = require('stripe');
const {handleCheckoutSessionCompleted} = require('./handlers/checkoutSession');
const {handlePaymentIntentSucceeded, handlePaymentIntentFailed} = require('./handlers/paymentIntent');
const {handleChargeRefunded} = require('./handlers/refunds');
const {handleDisputeCreated} = require('./handlers/disputes');
const {handleChargeSucceeded} = require('./handlers/charge');

// Initialize Stripe with secret key from environment
const getStripeInstance = () => {
  const stripeMode = process.env.STRIPE_MODE || 'test';
  const secretKey = stripeMode === 'test' ?
    functions.config().stripe.secret_key_test :
    functions.config().stripe.secret_key_live;

  return stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
};

/**
 * Stripe Webhook Cloud Function
 *
 * Handles all Stripe webhook events
 * URL: https://us-central1-YOUR_PROJECT.cloudfunctions.net/stripeWebhook
 */
exports.stripeWebhook = functions
    .runWith({
      timeoutSeconds: 300,
      memory: '512MB',
    })
    .https.onRequest(async (req, res) => {
    // Only allow POST requests
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }

      const stripeInstance = getStripeInstance();
      const webhookSecret = functions.config().stripe?.webhook_secret;
      const sig = req.headers['stripe-signature'];

      let event;

      // Verify webhook signature if secret is configured
      if (webhookSecret && sig) {
        try {
          event = stripeInstance.webhooks.constructEvent(
              req.rawBody,
              sig,
              webhookSecret,
          );
        } catch (err) {
          console.error('⚠️ Webhook signature verification failed:', err.message);
          res.status(400).send(`Webhook Error: ${err.message}`);
          return;
        }
      } else {
        // No signature verification (not recommended for production)
        console.warn('⚠️ Webhook signature verification disabled - webhook_secret not configured');
        event = JSON.parse(req.body);
      }

      // Handle different event types
      try {
        switch (event.type) {
          case 'checkout.session.completed':
            await handleCheckoutSessionCompleted(event.data.object, stripeInstance);
            break;

          case 'payment_intent.succeeded':
            await handlePaymentIntentSucceeded(event.data.object, stripeInstance);
            break;

          case 'payment_intent.payment_failed':
            await handlePaymentIntentFailed(event.data.object);
            break;

          case 'charge.refunded':
            await handleChargeRefunded(event.data.object);
            break;

          case 'charge.dispute.created':
            await handleDisputeCreated(event.data.object, stripeInstance);
            break;

          case 'charge.succeeded':
            await handleChargeSucceeded(event.data.object);
            break;

          default:
        }

        res.json({received: true});
      } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({
          error: 'Webhook processing failed',
          message: error.message,
        });
      }
    });
