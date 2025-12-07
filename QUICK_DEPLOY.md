# 🚀 Quick Deploy - Firebase Functions for Stripe

## Prerequisites

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login
firebase login
```

## Deploy in 3 Steps

### Step 1: Install
```bash
cd /Users/romanpochtman/Developer/esimmain/functions
npm install
```

### Step 2: Configure
```bash
cd /Users/romanpochtman/Developer/esimmain

firebase functions:config:set \
  stripe.secret_key_test="sk_test_YOUR_TEST_KEY" \
  stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET" \
  stripe.mode="test"
```

### Step 3: Deploy
```bash
firebase deploy --only functions:stripeWebhook
```

## After Deployment

1. Copy the function URL from deployment output
2. Add it to Stripe Dashboard → Developers → Webhooks
3. Select these events:
   - checkout.session.completed
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - charge.succeeded
   - charge.refunded
   - charge.dispute.created
4. Get the webhook secret from Stripe
5. Update config:
```bash
firebase functions:config:set stripe.webhook_secret="whsec_NEW_SECRET"
firebase deploy --only functions:stripeWebhook
```

## Test

```bash
# View logs
firebase functions:log --only stripeWebhook

# Or in browser
# https://console.firebase.google.com/project/YOUR_PROJECT/functions/logs
```

Use Stripe test card: `4242 4242 4242 4242`

---

**Done!** Your Stripe webhooks are now handled by Firebase Functions.

For detailed docs, see:
- FIREBASE_FUNCTIONS_READY.md
- FIREBASE_SETUP_COMMANDS.md
- FIREBASE_FUNCTIONS_STRIPE_SETUP.md

