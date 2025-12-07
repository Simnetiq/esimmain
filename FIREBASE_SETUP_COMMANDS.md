# Firebase Functions Setup - Complete Commands

Follow these commands step-by-step to set up and deploy your Firebase Functions for Stripe webhooks.

## ✅ Prerequisites Completed

- ✅ Functions folder structure created
- ✅ All handler files created (checkoutSession, paymentIntent, refunds, disputes, charge)
- ✅ Fraud detection service created
- ✅ package.json configured
- ✅ firebase.json updated

---

## Step 1: Install Dependencies

```bash
# Navigate to functions directory
cd /Users/romanpochtman/Developer/esimmain/functions

# Install all dependencies
npm install

# This will install:
# - firebase-admin
# - firebase-functions
# - stripe
# - eslint (dev)
```

---

## Step 2: Login to Firebase

```bash
# Login to Firebase CLI
firebase login

# This will open a browser window for authentication
```

---

## Step 3: Select Your Firebase Project

```bash
# Navigate back to project root
cd /Users/romanpochtman/Developer/esimmain

# List available projects
firebase projects:list

# Set your project (replace YOUR_PROJECT_ID with your actual project ID)
firebase use YOUR_PROJECT_ID

# Or add an alias
firebase use --add
# Then select your project and give it an alias like "production"
```

---

## Step 4: Configure Environment Variables

### Set Stripe Configuration

```bash
# Set TEST mode Stripe keys
firebase functions:config:set \
  stripe.secret_key_test="sk_test_YOUR_TEST_SECRET_KEY" \
  stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET" \
  stripe.mode="test"

# For LIVE mode (when ready for production):
firebase functions:config:set \
  stripe.secret_key_live="sk_live_YOUR_LIVE_SECRET_KEY" \
  stripe.mode="live"
```

### Verify Configuration

```bash
# View all function configs
firebase functions:config:get

# Expected output:
# {
#   "stripe": {
#     "secret_key_test": "sk_test_...",
#     "webhook_secret": "whsec_...",
#     "mode": "test"
#   }
# }
```

---

## Step 5: Test Locally (Optional but Recommended)

```bash
# Start Firebase emulators
firebase emulators:start --only functions

# Your function will be available at:
# http://localhost:5001/YOUR_PROJECT_ID/us-central1/stripeWebhook

# Keep this running and test with Stripe CLI in another terminal
```

### Test with Stripe CLI (in another terminal)

```bash
# Install Stripe CLI if you haven't
# https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local function
stripe listen --forward-to http://localhost:5001/YOUR_PROJECT_ID/us-central1/stripeWebhook

# In another terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
```

---

## Step 6: Deploy to Firebase

```bash
# Deploy functions (from project root)
cd /Users/romanpochtman/Developer/esimmain

# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:stripeWebhook

# Wait for deployment to complete...
```

### Expected Output

```
✔  functions[us-central1-stripeWebhook] Successful create operation.
Function URL (stripeWebhook): https://us-central1-YOUR_PROJECT.cloudfunctions.net/stripeWebhook
```

**📝 COPY THIS URL** - You'll need it for Stripe webhook configuration!

---

## Step 7: Configure Stripe Webhooks

### In Stripe Dashboard

1. Go to https://dashboard.stripe.com/
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Paste your function URL:
   ```
   https://us-central1-YOUR_PROJECT.cloudfunctions.net/stripeWebhook
   ```

5. Select these events:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.succeeded`
   - ✅ `charge.refunded`
   - ✅ `charge.dispute.created`

6. Click **Add endpoint**

### Get Webhook Signing Secret

1. Click on the endpoint you just created
2. Click **Reveal** under **Signing secret**
3. Copy the secret (starts with `whsec_`)
4. Update Firebase config:

```bash
firebase functions:config:set \
  stripe.webhook_secret="whsec_YOUR_NEW_SECRET"

# Redeploy functions
firebase deploy --only functions:stripeWebhook
```

---

## Step 8: Test End-to-End

### Test Payment Flow

1. Go to your app
2. Create a test order
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete payment

### Monitor Logs

```bash
# Real-time logs
firebase functions:log --only stripeWebhook

# Or view in Firebase Console
# https://console.firebase.google.com/project/YOUR_PROJECT/functions/logs
```

Expected log output:
```
📨 Stripe webhook received: checkout.session.completed
✅ Checkout session completed: cs_test_...
✅ Order ORDER_ID marked as completed

📨 Stripe webhook received: payment_intent.succeeded
💳 Payment intent succeeded: pi_...
✅ Tracked completed purchase: ORDER_ID
```

---

## Step 9: Production Deployment

### Switch to Live Mode

```bash
# Set live mode and keys
firebase functions:config:set \
  stripe.secret_key_live="sk_live_YOUR_LIVE_KEY" \
  stripe.mode="live"

# Deploy
firebase deploy --only functions
```

### Update Stripe Webhook

1. In Stripe Dashboard, switch to **Live mode**
2. Go to **Developers** → **Webhooks**
3. Add the same endpoint URL
4. Get the new webhook secret
5. Update config:

```bash
firebase functions:config:set \
  stripe.webhook_secret="whsec_YOUR_LIVE_SECRET"

firebase deploy --only functions
```

---

## Useful Commands

### View Logs

```bash
# Real-time logs
firebase functions:log

# Filter by function
firebase functions:log --only stripeWebhook

# Last 100 lines
firebase functions:log --limit 100
```

### Update Function Configuration

```bash
# View current config
firebase functions:config:get

# Set new values
firebase functions:config:set key="value"

# Remove a value
firebase functions:config:unset key

# After changing config, always redeploy
firebase deploy --only functions
```

### Delete Function

```bash
# Delete a function
firebase functions:delete stripeWebhook
```

### Check Function Status

```bash
# List all deployed functions
firebase functions:list

# View function details in console
# https://console.firebase.google.com/project/YOUR_PROJECT/functions
```

---

## Troubleshooting

### Issue: "Webhook signature verification failed"

**Solution:**
```bash
# Check webhook secret
firebase functions:config:get stripe.webhook_secret

# Make sure it matches the one in Stripe Dashboard
# Update if needed
firebase functions:config:set stripe.webhook_secret="whsec_CORRECT_SECRET"
firebase deploy --only functions
```

### Issue: "Stripe not configured" error

**Solution:**
```bash
# Check all Stripe config
firebase functions:config:get stripe

# Set missing values
firebase functions:config:set \
  stripe.secret_key_test="sk_test_YOUR_KEY" \
  stripe.mode="test"

firebase deploy --only functions
```

### Issue: Function timeout

**Solution:** The function is already configured with 300 seconds timeout (5 minutes). If you need more:

Edit `functions/src/stripe/webhookHandler.js`:
```javascript
exports.stripeWebhook = functions
  .runWith({
    timeoutSeconds: 540, // Max 9 minutes
    memory: '1GB'
  })
  .https.onRequest(async (req, res) => {
```

Then redeploy:
```bash
firebase deploy --only functions:stripeWebhook
```

### Issue: Permission denied in Firestore

Check your `firestore.rules` allows functions to write. The function runs as admin, so it should have access.

If needed, you can verify the service account has proper permissions in Firebase Console.

---

## Quick Reference

### Deploy Function
```bash
cd /Users/romanpochtman/Developer/esimmain
firebase deploy --only functions:stripeWebhook
```

### View Logs
```bash
firebase functions:log --only stripeWebhook
```

### Update Config
```bash
firebase functions:config:set stripe.mode="test"
firebase deploy --only functions
```

### Test Locally
```bash
firebase emulators:start --only functions
```

---

## Next Steps

1. ✅ **Test with real transactions** using Stripe test mode
2. ✅ **Monitor logs** for any errors
3. ✅ **Set up alerts** in Firebase Console
4. ✅ **Switch to live mode** when ready
5. ✅ **Keep webhook secret secure** - never commit to git

---

## Important Notes

- 🔒 **Never commit** the `.runtimeconfig.json` file (Firebase creates this locally)
- 📧 **Email notifications** are handled by your existing Hostinger email system
- 🔄 **Webhook retries**: Stripe will retry failed webhooks automatically
- 📊 **Monitoring**: Use Firebase Console for metrics and logs
- 💰 **Costs**: Firebase Functions has a generous free tier

---

**Created:** November 2025
**Status:** Ready to deploy

