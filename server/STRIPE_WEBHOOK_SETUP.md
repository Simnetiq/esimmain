# 🔔 Stripe Webhook Setup Guide

## Overview

Webhooks are essential for receiving real-time payment status updates from Stripe. When a payment succeeds or fails, Stripe will notify your server automatically.

---

## 📋 Why You Need Webhooks

Without webhooks:
- ❌ You won't know when payments complete
- ❌ Orders won't be fulfilled automatically
- ❌ Transaction status won't update in your database
- ❌ Customers won't receive confirmation emails

With webhooks:
- ✅ Automatic payment confirmation
- ✅ Real-time order fulfillment
- ✅ Accurate transaction records
- ✅ Better customer experience

---

## 🚀 Step-by-Step Setup

### Step 1: Access Stripe Dashboard

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Sign in to your account
3. Make sure you're in **Test Mode** (toggle in top right) for testing

### Step 2: Navigate to Webhooks

1. Click **Developers** in the top navigation
2. Click **Webhooks** in the left sidebar
3. Click **Add endpoint** button

### Step 3: Configure Webhook Endpoint

**Endpoint URL:**
```
http://72.61.87.54/api/payment/stripe/webhook
```

**Important Notes:**
- Use `http://` (not `https://`) until you set up SSL
- After SSL setup, change to: `https://your-domain.com/api/payment/stripe/webhook`
- The endpoint must be publicly accessible

### Step 4: Select Events to Listen

Click **Select events** and choose these events:

#### ✅ Required Events:

1. **payment_intent.succeeded**
   - Triggered when payment completes successfully
   - Used to: Update order status, send confirmation email, fulfill order

2. **payment_intent.payment_failed**
   - Triggered when payment fails
   - Used to: Update order status, notify customer, log error

#### 🔔 Recommended Additional Events (Optional):

3. **payment_intent.created**
   - When a payment intent is created
   - Useful for: Tracking payment attempts

4. **payment_intent.canceled**
   - When a payment is canceled
   - Useful for: Cleanup and analytics

5. **charge.refunded**
   - When a refund is processed
   - Useful for: Handling refunds automatically

6. **charge.dispute.created**
   - When a customer disputes a charge
   - Useful for: Fraud prevention and alerts

### Step 5: API Version

- Leave as **Latest API version** (recommended)
- Or select a specific version if needed

### Step 6: Add Endpoint

1. Click **Add endpoint** button
2. Stripe will create the webhook
3. You'll see a success message

### Step 7: Get Webhook Signing Secret

**This is critical!**

1. After creating the webhook, you'll see the webhook details page
2. Look for **Signing secret** section
3. Click **Reveal** to show the secret
4. Copy the secret (starts with `whsec_`)

Example: `whsec_1234567890abcdefghijklmnopqrstuvwxyz`

### Step 8: Add Secret to Server Environment

1. SSH into your server:
```bash
ssh root@72.61.87.54
```

2. Navigate to your server directory:
```bash
cd /opt/esim-service
```

3. Edit the `.env` file:
```bash
nano .env
```

4. Add or update this line:
```env
STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret_here
```

5. Save and exit (Ctrl+X, then Y, then Enter)

6. Restart the services:
```bash
docker-compose restart api
```

---

## 🧪 Testing Your Webhook

### Method 1: Using Stripe CLI (Recommended)

1. Install Stripe CLI:
```bash
# On your local machine or server
curl -s https://packages.stripe.com/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.com/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe
```

2. Login to Stripe:
```bash
stripe login
```

3. Test webhook:
```bash
stripe trigger payment_intent.succeeded
```

4. Check your server logs:
```bash
docker-compose logs -f api
```

You should see: `✅ Webhook received: payment_intent.succeeded`

### Method 2: Using Stripe Dashboard

1. Go to **Developers → Webhooks**
2. Click on your webhook endpoint
3. Click **Send test webhook** button
4. Select `payment_intent.succeeded`
5. Click **Send test webhook**
6. Check the response (should be 200 OK)

### Method 3: Real Payment Test

1. Create a test payment using Stripe test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

2. Complete the payment

3. Check webhook delivery in Stripe Dashboard:
   - Go to **Developers → Webhooks**
   - Click on your endpoint
   - View **Recent deliveries**
   - Should show successful delivery (200 response)

---

## 🔍 Verifying Webhook is Working

### Check 1: Stripe Dashboard

1. Go to **Developers → Webhooks**
2. Click on your endpoint
3. Check **Recent deliveries** tab
4. Look for:
   - ✅ Green checkmark = Success (200 response)
   - ❌ Red X = Failed (check error message)

### Check 2: Server Logs

```bash
# SSH into server
ssh root@72.61.87.54

# Check API logs
cd /opt/esim-service
docker-compose logs -f api | grep webhook
```

You should see:
```
✅ Webhook received: payment_intent.succeeded
✅ Transaction updated: pi_xxxxx
```

### Check 3: Database (Supabase)

1. Go to your Supabase dashboard
2. Open **Table Editor**
3. Check `transactions` table
4. Verify transaction status updated to `completed`

---

## 🐛 Troubleshooting

### Problem: Webhook Returns 404

**Solution:**
- Verify URL is correct: `http://72.61.87.54/api/payment/stripe/webhook`
- Check nginx is routing correctly
- Verify API service is running: `docker-compose ps`

### Problem: Webhook Returns 401/403

**Solution:**
- Check `STRIPE_WEBHOOK_SECRET` is set correctly in `.env`
- Restart API service: `docker-compose restart api`
- Verify secret matches Stripe dashboard

### Problem: Webhook Returns 500

**Solution:**
- Check API logs: `docker-compose logs api`
- Verify Supabase connection is working
- Check all environment variables are set

### Problem: Webhook Shows as Failed in Stripe

**Solution:**
1. Click on the failed webhook in Stripe dashboard
2. View the error message
3. Check response body for details
4. Fix the issue and click **Resend** in Stripe

### Problem: Webhook Receives Event but Doesn't Update Database

**Solution:**
- Check Supabase credentials in `.env`
- Verify `transactions` table exists
- Check API logs for database errors
- Test Supabase connection manually

---

## 🔐 Security Best Practices

### 1. Always Verify Webhook Signatures

Your server already does this automatically:

```javascript
const event = stripe.webhooks.constructEvent(
  payload,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

This prevents fake webhook requests.

### 2. Use HTTPS in Production

Once you have SSL:
1. Update webhook URL to `https://`
2. Update in Stripe dashboard
3. Test again

### 3. Handle Idempotency

Stripe may send the same webhook multiple times. Your code should:
- Check if transaction already processed
- Use unique payment IDs
- Avoid duplicate processing

### 4. Monitor Webhook Health

- Check Stripe dashboard regularly
- Set up alerts for failed webhooks
- Review webhook logs weekly

---

## 📊 Webhook Events Reference

### payment_intent.succeeded
```json
{
  "id": "evt_xxxxx",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_xxxxx",
      "amount": 2999,
      "currency": "usd",
      "status": "succeeded",
      "metadata": {
        "orderId": "12345",
        "userId": "user_123"
      }
    }
  }
}
```

**Your server will:**
1. Update transaction status to `completed`
2. Log completion timestamp
3. Return success response

### payment_intent.payment_failed
```json
{
  "id": "evt_xxxxx",
  "type": "payment_intent.payment_failed",
  "data": {
    "object": {
      "id": "pi_xxxxx",
      "status": "requires_payment_method",
      "last_payment_error": {
        "message": "Your card was declined"
      }
    }
  }
}
```

**Your server will:**
1. Update transaction status to `failed`
2. Log failure reason
3. Return success response

---

## 🚀 Production Checklist

Before going live:

- [ ] Switch Stripe to **Live Mode**
- [ ] Get new Live Mode API keys
- [ ] Create new webhook endpoint for live mode
- [ ] Update `STRIPE_SECRET_KEY` with live key
- [ ] Update `STRIPE_WEBHOOK_SECRET` with live secret
- [ ] Change webhook URL to use HTTPS
- [ ] Test with real (small amount) payment
- [ ] Monitor first few transactions closely
- [ ] Set up webhook failure alerts

---

## 📞 Need Help?

### Stripe Support
- Dashboard: [https://dashboard.stripe.com](https://dashboard.stripe.com)
- Docs: [https://stripe.com/docs/webhooks](https://stripe.com/docs/webhooks)
- Support: [https://support.stripe.com](https://support.stripe.com)

### Check Webhook Status
```bash
# View recent webhook deliveries
curl https://api.stripe.com/v1/webhook_endpoints/we_xxxxx/attempts \
  -u sk_test_xxxxx:

# Test webhook endpoint
curl -X POST http://72.61.87.54/api/payment/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## ✅ Success Checklist

Your webhook is properly configured when:

- ✅ Webhook endpoint shows in Stripe dashboard
- ✅ Test webhook returns 200 OK
- ✅ Server logs show webhook received
- ✅ Transaction status updates in database
- ✅ No errors in Stripe webhook delivery log
- ✅ Real test payment triggers webhook successfully

---

**Last Updated:** November 4, 2025  
**Stripe API Version:** 2024-10-28.acacia

