# 🚀 Easy Deployment Guide - Just Copy & Paste

## Step 1: Set Your Stripe Key

```bash
cd /Users/romanpochtman/Developer/esimmain

firebase functions:config:set \
  stripe.secret_key_test="sk_test_51SUc3ZBQMhJ0MGpsJx7mrW9wucwmn81skaKqkd98eX7suPVNkheYGTbMBT1q0Z9YBZjJIj6aICiFTkuZXC9oKODP006z00jHcX" \
  stripe.mode="test"
```

## Step 2: Deploy the Function

```bash
firebase deploy --only functions:stripeWebhook
```

**⏱️ Wait for deployment... (1-2 minutes)**

After deployment, you'll see something like:
```
✔  functions[stripeWebhook(us-central1)] Successful create operation.
Function URL (stripeWebhook): https://us-central1-esimcreator-f00dd.cloudfunctions.net/stripeWebhook
```

**📋 COPY THIS URL!**

## Step 3: Add to Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. Paste your function URL
4. Click **"Select events"**
5. Select these events:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.succeeded`
   - ✅ `charge.refunded`
   - ✅ `charge.dispute.created`
6. Click **"Add endpoint"**

## Step 4: Get Webhook Secret

1. Click on the endpoint you just created
2. Click **"Reveal"** under "Signing secret"
3. Copy the secret (starts with `whsec_`)

## Step 5: Add Webhook Secret & Redeploy

```bash
# Replace whsec_YOUR_SECRET with the actual secret you copied
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_SECRET"

# Redeploy
firebase deploy --only functions:stripeWebhook
```

## ✅ Done!

Your Firebase Function is now receiving Stripe webhooks!

### Test It

1. Go to your app
2. Make a test purchase with card: `4242 4242 4242 4242`
3. Check Firebase logs:
   ```bash
   firebase functions:log --only stripeWebhook
   ```

You should see:
```
📨 Stripe webhook received: checkout.session.completed
✅ Order marked as completed
```

---

## Quick Troubleshooting

### If deployment fails with lint errors:
```bash
cd functions
npx eslint src --fix
cd ..
firebase deploy --only functions:stripeWebhook
```

### View logs:
```bash
firebase functions:log --only stripeWebhook
```

### Check config:
```bash
firebase functions:config:get
```

---

**That's it! Your Stripe webhooks are now handled by Firebase Functions! 🎉**

