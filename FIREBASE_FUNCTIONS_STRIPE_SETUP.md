# Firebase Functions for Stripe Activities - Complete Setup Guide

This guide will walk you through setting up Firebase Functions to handle Stripe webhooks and payment processing for your eSIM platform.

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Function Implementation](#function-implementation)
5. [Environment Configuration](#environment-configuration)
6. [Deployment](#deployment)
7. [Stripe Webhook Configuration](#stripe-webhook-configuration)
8. [Testing](#testing)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Why Firebase Functions for Stripe?

Firebase Functions provide a serverless environment perfect for handling Stripe webhooks because:
- **Reliability**: Auto-scaling and redundancy
- **Security**: Isolated environment with secret management
- **Integration**: Direct access to Firestore and other Firebase services
- **No Server Management**: Focus on code, not infrastructure

### What You'll Build

1. **Stripe Webhook Handler**: Process payment events
2. **Order Management**: Update order status based on payments
3. **Fraud Detection**: Track and flag suspicious activity
4. **Email Notifications**: Send purchase confirmations
5. **Refund Processing**: Handle refunds and disputes

---

## Prerequisites

### Required Tools

```bash
# Install Node.js (v18 or later)
# Download from https://nodejs.org/

# Install Firebase CLI
npm install -g firebase-tools

# Verify installation
firebase --version
```

### Required Accounts

- ✅ Firebase Project (already set up)
- ✅ Stripe Account (Test and Live modes)
- ✅ Gmail/SMTP for sending emails

### Project Structure

```
esimmain/
├── functions/                    # Firebase Functions directory
│   ├── src/
│   │   ├── index.js             # Main entry point
│   │   ├── stripe/
│   │   │   ├── webhookHandler.js
│   │   │   └── utils.js
│   │   ├── orders/
│   │   │   └── orderProcessor.js
│   │   └── fraud/
│   │       └── fraudDetection.js
│   ├── package.json
│   └── .env.local               # Local environment variables
├── firebase.json
└── .firebaserc
```

---

## Initial Setup

### Step 1: Initialize Firebase Functions

```bash
# Navigate to your project root
cd /Users/romanpochtman/Developer/esimmain

# Login to Firebase
firebase login

# Initialize Functions (if not already done)
firebase init functions
```

**During initialization, choose:**
- ✅ JavaScript or TypeScript? → **JavaScript**
- ✅ ESLint? → **Yes** (recommended)
- ✅ Install dependencies? → **Yes**

### Step 2: Configure Firebase Project

```bash
# Set your Firebase project
firebase use --add

# Select your project from the list
# Give it an alias like "production" or "default"
```

### Step 3: Update firebase.json

Your `firebase.json` should already have the functions configuration. Update it if needed:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs18",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run lint"
    ]
  },
  "hosting": {
    "public": "build",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

---

## Function Implementation

### Step 1: Create Functions Directory Structure

```bash
# Create the functions directory if it doesn't exist
mkdir -p functions/src/{stripe,orders,fraud,emails}

# Create necessary files
touch functions/src/index.js
touch functions/src/stripe/webhookHandler.js
touch functions/src/stripe/utils.js
touch functions/src/orders/orderProcessor.js
touch functions/src/fraud/fraudDetection.js
touch functions/src/emails/emailService.js
```

### Step 2: Install Dependencies

```bash
cd functions

npm install \
  firebase-admin \
  firebase-functions \
  stripe \
  node-fetch \
  cors \
  express
```

### Step 3: Main Entry Point (`functions/src/index.js`)

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { stripeWebhook } = require('./stripe/webhookHandler');

// Initialize Firebase Admin
admin.initializeApp();

// Export the Stripe webhook function
exports.stripeWebhook = stripeWebhook;

// Export other functions as needed
exports.processOrder = require('./orders/orderProcessor').processOrder;
exports.sendPurchaseConfirmation = require('./emails/emailService').sendPurchaseConfirmation;
```

### Step 4: Stripe Webhook Handler (`functions/src/stripe/webhookHandler.js`)

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe');
const { handleCheckoutSessionCompleted } = require('./handlers/checkoutSession');
const { handlePaymentIntentSucceeded } = require('./handlers/paymentIntent');
const { handlePaymentIntentFailed } = require('./handlers/paymentIntent');
const { handleChargeRefunded } = require('./handlers/refunds');
const { handleDisputeCreated } = require('./handlers/disputes');

// Initialize Stripe with secret key from environment
const getStripeInstance = () => {
  const stripeMode = process.env.STRIPE_MODE || 'test';
  const secretKey = stripeMode === 'test' 
    ? functions.config().stripe.secret_key_test 
    : functions.config().stripe.secret_key_live;
  
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
    const webhookSecret = functions.config().stripe.webhook_secret;
    const sig = req.headers['stripe-signature'];

    let event;

    try {
      // Verify webhook signature
      event = stripeInstance.webhooks.constructEvent(
        req.rawBody,
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    console.log('📨 Stripe webhook received:', event.type);

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
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ 
        error: 'Webhook processing failed',
        message: error.message 
      });
    }
  });
```

### Step 5: Create Webhook Event Handlers

Create `functions/src/stripe/handlers/checkoutSession.js`:

```javascript
const admin = require('firebase-admin');
const { trackCompletedPurchase } = require('../../fraud/fraudDetection');
const { sendPurchaseConfirmation } = require('../../emails/emailService');

const db = admin.firestore();

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(session, stripeInstance) {
  try {
    console.log('✅ Checkout session completed:', session.id);

    const orderId = session.metadata?.order_id;
    if (!orderId) {
      console.error('No order_id in session metadata');
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
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
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
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Send purchase confirmation email
    if (orderData.customerEmail) {
      await sendPurchaseConfirmation({
        email: orderData.customerEmail,
        orderId: orderId,
        packageName: orderData.packageName,
        amount: orderData.amount,
        currency: orderData.currency
      });
    }

    console.log(`✅ Order ${orderId} marked as completed`);

  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
}

module.exports = { handleCheckoutSessionCompleted };
```

Create `functions/src/stripe/handlers/paymentIntent.js`:

```javascript
const admin = require('firebase-admin');
const { trackCompletedPurchase, trackFailedPurchase } = require('../../fraud/fraudDetection');

const db = admin.firestore();

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent, stripeInstance) {
  try {
    console.log('💳 Payment intent succeeded:', paymentIntent.id);

    // Get payment method details
    let paymentMethodFingerprint = null;
    let paymentMethodLast4 = null;
    let paymentMethodBrand = null;

    if (paymentIntent.payment_method) {
      try {
        const paymentMethod = await stripeInstance.paymentMethods.retrieve(
          paymentIntent.payment_method
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
        stripeChargeId: paymentIntent.latest_charge
      }
    });

    // Update order with payment method info
    await orderRef.update({
      'paymentMethod.fingerprint': paymentMethodFingerprint,
      'paymentMethod.last4': paymentMethodLast4,
      'paymentMethod.brand': paymentMethodBrand,
      'paymentMethod.type': 'card',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Tracked completed purchase: ${orderId}`);

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
    console.log('❌ Payment intent failed:', paymentIntent.id);

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
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Track failed purchase for fraud detection
    await trackFailedPurchase({
      attemptId: orderData.fraudCheck?.attemptId,
      failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
      metadata: {
        orderId,
        stripePaymentIntentId: paymentIntent.id,
        failureCode: paymentIntent.last_payment_error?.code
      }
    });

    console.log(`❌ Tracked failed purchase: ${orderId}`);

  } catch (error) {
    console.error('Error handling payment intent failed:', error);
    throw error;
  }
}

module.exports = {
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed
};
```

### Step 6: Fraud Detection (`functions/src/fraud/fraudDetection.js`)

```javascript
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
    metadata
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
        brand: paymentMethodBrand
      },
      riskScore,
      riskFactors,
      attemptId,
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata
    };

    // Store in fraud tracking collection
    await db.collection('fraudTracking').add(trackingData);

    // Update user's purchase stats
    if (userId) {
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        'stats.totalPurchases': admin.firestore.FieldValue.increment(1),
        'stats.totalSpent': admin.firestore.FieldValue.increment(amount),
        'stats.lastPurchaseAt': admin.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log(`✅ Fraud tracking recorded for order: ${orderId}`);
  } catch (error) {
    console.error('Error tracking completed purchase:', error);
    throw error;
  }
}

/**
 * Track failed purchase attempt
 */
async function trackFailedPurchase(data) {
  const { attemptId, failureReason, metadata } = data;

  try {
    await db.collection('fraudTracking').add({
      attemptId,
      status: 'failed',
      failureReason,
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata
    });

    console.log(`❌ Failed purchase tracked: ${attemptId}`);
  } catch (error) {
    console.error('Error tracking failed purchase:', error);
    throw error;
  }
}

module.exports = {
  trackCompletedPurchase,
  trackFailedPurchase
};
```

### Step 7: Email Service (`functions/src/emails/emailService.js`)

```javascript
const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  const emailConfig = functions.config().email;
  
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: emailConfig.user,
      pass: emailConfig.password
    }
  });
};

/**
 * Send purchase confirmation email
 */
async function sendPurchaseConfirmation(data) {
  const { email, orderId, packageName, amount, currency } = data;

  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: functions.config().email.user,
      to: email,
      subject: `Order Confirmation - ${orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Thank you for your purchase!</h2>
          <p>Your order has been confirmed and is being processed.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Package:</strong> ${packageName}</p>
            <p><strong>Amount:</strong> ${amount} ${currency.toUpperCase()}</p>
          </div>
          
          <p>You can view your eSIM details in your dashboard.</p>
          
          <p>If you have any questions, please contact our support team.</p>
          
          <p>Best regards,<br>Simnetiq Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Purchase confirmation email sent to: ${email}`);
  } catch (error) {
    console.error('Error sending purchase confirmation email:', error);
    throw error;
  }
}

module.exports = { sendPurchaseConfirmation };
```

---

## Environment Configuration

### Step 1: Set Firebase Function Config

```bash
# Navigate to functions directory
cd functions

# Set Stripe keys
firebase functions:config:set \
  stripe.secret_key_test="sk_test_YOUR_TEST_KEY" \
  stripe.secret_key_live="sk_live_YOUR_LIVE_KEY" \
  stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET" \
  stripe.mode="test"

# Set email configuration
firebase functions:config:set \
  email.user="your-email@gmail.com" \
  email.password="your-app-password"

# View current config
firebase functions:config:get
```

### Step 2: Create Local Environment File

For local testing, create `functions/.env.local`:

```bash
STRIPE_SECRET_KEY_TEST=sk_test_YOUR_TEST_KEY
STRIPE_SECRET_KEY_LIVE=sk_live_YOUR_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_MODE=test
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Step 3: Update package.json

```json
{
  "name": "functions",
  "description": "Cloud Functions for Firebase",
  "scripts": {
    "serve": "firebase emulators:start --only functions",
    "shell": "firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "18"
  },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.6.0",
    "stripe": "^14.15.0",
    "nodemailer": "^6.9.0",
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "eslint": "^8.15.0",
    "eslint-config-google": "^0.14.0",
    "firebase-functions-test": "^3.1.0"
  },
  "private": true
}
```

---

## Deployment

### Step 1: Test Locally

```bash
# Start Firebase emulators
firebase emulators:start

# Functions will be available at:
# http://localhost:5001/YOUR_PROJECT/us-central1/stripeWebhook
```

### Step 2: Deploy to Firebase

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:stripeWebhook

# View deployment logs
firebase functions:log
```

### Step 3: Get Function URL

After deployment, you'll see output like:

```
✔  functions[stripeWebhook(us-central1)] Successful create operation.
Function URL (stripeWebhook): https://us-central1-YOUR_PROJECT.cloudfunctions.net/stripeWebhook
```

**Copy this URL** - you'll need it for Stripe webhook configuration.

---

## Stripe Webhook Configuration

### Step 1: Add Webhook Endpoint in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter your function URL:
   ```
   https://us-central1-YOUR_PROJECT.cloudfunctions.net/stripeWebhook
   ```

### Step 2: Select Events to Listen

Select these events:
- ✅ `checkout.session.completed`
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `charge.refunded`
- ✅ `charge.dispute.created`
- ✅ `charge.succeeded`

### Step 3: Get Webhook Signing Secret

1. After creating the endpoint, click on it
2. Click **Reveal** under **Signing secret**
3. Copy the secret (starts with `whsec_`)
4. Update your Firebase config:

```bash
firebase functions:config:set \
  stripe.webhook_secret="whsec_YOUR_COPIED_SECRET"

# Redeploy functions
firebase deploy --only functions
```

---

## Testing

### Test with Stripe CLI

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local function
stripe listen --forward-to http://localhost:5001/YOUR_PROJECT/us-central1/stripeWebhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
```

### Test Payment Flow

1. Create a test order in your app
2. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3DS Required: `4000 0025 0000 3155`

3. Monitor function logs:
```bash
firebase functions:log --only stripeWebhook
```

---

## Monitoring

### View Function Logs

```bash
# Real-time logs
firebase functions:log --only stripeWebhook

# View in Firebase Console
# https://console.firebase.google.com/project/YOUR_PROJECT/functions/logs
```

### Set Up Alerts

1. Go to Firebase Console → Functions
2. Click on your function
3. Set up alerts for:
   - Error rate > 5%
   - Execution time > 10s
   - Failed invocations

---

## Troubleshooting

### Common Issues

#### 1. "Webhook signature verification failed"

**Solution:**
```bash
# Make sure webhook secret is correct
firebase functions:config:get stripe.webhook_secret

# Update if needed
firebase functions:config:set stripe.webhook_secret="whsec_NEW_SECRET"
firebase deploy --only functions
```

#### 2. "Stripe not configured"

**Solution:**
```bash
# Check if Stripe keys are set
firebase functions:config:get stripe

# Set keys
firebase functions:config:set \
  stripe.secret_key_test="sk_test_YOUR_KEY" \
  stripe.mode="test"
```

#### 3. "Function timeout"

**Solution:** Increase timeout in function configuration:

```javascript
exports.stripeWebhook = functions
  .runWith({
    timeoutSeconds: 540, // Max 9 minutes
    memory: '1GB'
  })
  .https.onRequest(handler);
```

#### 4. "Permission denied" errors

**Solution:** Check Firestore rules or update them:

```javascript
// firestore.rules
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow functions to write
    match /{document=**} {
      allow read, write: if request.auth != null || request.auth.token.admin == true;
    }
  }
}
```

---

## Migration from Vercel API Routes

If you're currently using Vercel API routes (`packages/customer-app/app/api/stripe-webhook/route.js`), you can:

### Option 1: Keep Both (Recommended during transition)
- Keep Vercel route for backward compatibility
- Gradually migrate to Firebase Functions
- Update Stripe webhooks to point to Firebase

### Option 2: Full Migration
1. Deploy Firebase Functions
2. Update Stripe webhook URL
3. Test thoroughly
4. Remove Vercel API route

---

## Next Steps

✅ **Set up Firebase Functions**
✅ **Deploy to production**
✅ **Configure Stripe webhooks**
✅ **Test with real payments**
✅ **Monitor and optimize**

### Advanced Features to Add

1. **Scheduled Functions**: Clean up old orders
2. **Pub/Sub**: Process orders asynchronously
3. **Firestore Triggers**: Auto-update user stats
4. **Storage Triggers**: Process uploaded documents

---

## Support

- **Firebase Documentation**: https://firebase.google.com/docs/functions
- **Stripe Webhooks Guide**: https://stripe.com/docs/webhooks
- **Firebase Functions Samples**: https://github.com/firebase/functions-samples

---

**Last Updated:** November 2025
**Version:** 1.0.0

