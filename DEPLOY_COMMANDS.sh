#!/bin/bash

# Firebase Functions Deployment Commands
# Run these commands to deploy your Stripe webhook function

echo "🚀 Firebase Functions Deployment"
echo "================================="
echo ""

# Step 1: Set Firebase Configuration
echo "Step 1: Setting Firebase configuration..."
echo ""

firebase functions:config:set \
  stripe.secret_key_test="sk_test_51SUc3ZBQMhJ0MGpsJx7mrW9wucwmn81skaKqkd98eX7suPVNkheYGTbMBT1q0Z9YBZjJIj6aICiFTkuZXC9oKODP006z00jHcX" \
  stripe.mode="test"

echo ""
echo "⚠️  IMPORTANT: You need to add your webhook secret!"
echo ""
echo "After deploying, get your webhook secret from Stripe Dashboard:"
echo "1. Deploy the function first (run the deploy command below)"
echo "2. Copy the function URL"
echo "3. Add it to Stripe Dashboard → Developers → Webhooks"
echo "4. Get the webhook secret (whsec_...)"
echo "5. Run this command:"
echo ""
echo "   firebase functions:config:set stripe.webhook_secret=\"whsec_YOUR_SECRET\""
echo "   firebase deploy --only functions:stripeWebhook"
echo ""

# Step 2: Deploy Function
echo "Press Enter to deploy the function..."
read

echo ""
echo "Step 2: Deploying function..."
echo ""

firebase deploy --only functions:stripeWebhook

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Copy the function URL from the output above"
echo "2. Add it to Stripe Dashboard → Developers → Webhooks"
echo "3. Select these events:"
echo "   - checkout.session.completed"
echo "   - payment_intent.succeeded"
echo "   - payment_intent.payment_failed"
echo "   - charge.succeeded"
echo "   - charge.refunded"
echo "   - charge.dispute.created"
echo "4. Get the webhook secret and run:"
echo "   firebase functions:config:set stripe.webhook_secret=\"whsec_YOUR_SECRET\""
echo "   firebase deploy --only functions:stripeWebhook"
echo ""

