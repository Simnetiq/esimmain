# FIX YOUR STUCK ORDERS - RIGHT NOW

## Step 1: Deploy the Fix (2 minutes)

```bash
# In Vercel, redeploy your site
# It will automatically pull the latest code from GitHub
```

Or use CLI:
```bash
vercel --prod
```

## Step 2: Fix Your Current Stuck Orders

### Option A: Let Stripe Resend the Webhook (Easiest)

1. Go to: https://dashboard.stripe.com/events
2. Search for your email: `pochtmanrca@gmail.com`
3. Find the `checkout.session.completed` events
4. Click on each one
5. Click **"Send test webhook"**
6. Select your webhook endpoint
7. Click **Send**

✅ **Your eSIM will be created in 30 seconds!**

---

### Option B: Use Manual Retry API

Add this to Vercel Environment Variables first:
- `ADMIN_SECRET_KEY` = `your-secret-password-here`

Then run this command for EACH stuck order:

```bash
curl -X POST https://www.simnetiq.store/api/retry-order \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "kargi-mobile-30days-3gb",
    "adminKey": "your-secret-password-here"
  }'
```

Replace:
- `kargi-mobile-30days-3gb` with your actual order ID
- `your-secret-password-here` with the admin key you set

---

## Step 3: Check Vercel Logs AFTER Deploy

After deploying the fix, when you make a NEW test payment:

1. Vercel Dashboard → Your Project → Logs
2. Filter by `/api/stripe-webhook`
3. You'll now see detailed logs like:
   - ✅ Payment verified for order: xxx
   - 🔐 Authenticating with Airalo...
   - ✅ Airalo authenticated successfully
   - 📦 Creating Airalo order for package: xxx
   - ✅ Airalo order created: xxx
   - ✅ Order updated to completed: xxx

If you see ❌ errors, you'll know EXACTLY what's failing.

---

## What I Fixed:

1. **Added detailed logging** to every step of the Airalo API call
2. **Created a manual retry endpoint** so you can fix stuck orders
3. **Better error messages** that show exactly what failed

---

## Your Current Stuck Orders:

From your dashboard screenshot, these orders need to be processed:
- Georgia 3GB - $13.50
- Georgia 1GB - $4.50

Use Option A (resend webhooks) for these!

---

Last Updated: Dec 7, 2025
Status: IMMEDIATE FIX
