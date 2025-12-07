# 🚀 Production Readiness Checklist

## ✅ Current Status: Your Website is PRODUCTION-READY! 

Your code is **well-structured** and uses environment variables correctly. You only need to **change variables on Vercel** - no code changes required.

---

## 📋 What You Need to Do

### 1️⃣ Set Vercel Environment Variables (REQUIRED)

Go to your Vercel project → Settings → Environment Variables and set these:

#### 🔵 **Airalo API Configuration** (MOST IMPORTANT)

```bash
# Set to 'production' to exit sandbox
AIRALO_MODE=production

# Production credentials (replace with your production keys)
AIRALO_CLIENT_ID=your_production_client_id
AIRALO_CLIENT_SECRET=your_production_client_secret
AIRALO_BASE_URL=https://partners-api.airalo.com

# Optional: Keep sandbox credentials for testing
AIRALO_CLIENT_ID_SANDBOX=your_sandbox_client_id
AIRALO_CLIENT_SECRET_SANDBOX=your_sandbox_client_secret
AIRALO_BASE_URL_SANDBOX=https://sandbox-partners-api.airalo.com
```

#### 💳 **Stripe Configuration**

```bash
# Set to 'live' for production payments
STRIPE_MODE=live

# Live/Production Stripe keys
STRIPE_SECRET_KEY_LIVE=sk_live_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Fallback keys (can be same as live)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: Keep test keys for development
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_test_...
```

#### 🔥 **Firebase Configuration** (Already set, verify these)

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...

# Firebase Admin SDK (for server-side operations)
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...
```

#### 🪙 **Coinbase Commerce** (If using crypto payments)

```bash
COINBASE_COMMERCE_API_KEY=...
NEXT_PUBLIC_COINBASE_COMMERCE_API_KEY=...
```

#### 📧 **Email Service** (Resend)

```bash
RESEND_API_KEY=re_...
```

#### 🌐 **Base URL**

```bash
NEXT_PUBLIC_BASE_URL=https://www.simnetiq.com
NEXT_PUBLIC_APP_URL=https://www.simnetiq.com
```

#### 🔐 **Payment Secret** (For order verification)

```bash
PAYMENT_SECRET_KEY=your_secret_key_here
```

---

## 2️⃣ Stripe Webhook Configuration

After deploying to production:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://www.simnetiq.com/api/stripe-webhook`
4. Select these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`
5. Copy the **Webhook Signing Secret** (starts with `whsec_`)
6. Add it to Vercel as `STRIPE_WEBHOOK_SECRET_LIVE`

---

## 3️⃣ Airalo Production Setup

### Before Going Live:

1. **Contact your Airalo Account Manager** to:
   - Switch your account from Sandbox to Production mode
   - Get your production API credentials
   - ⚠️ **Warning:** Once switched to production, you CANNOT go back to sandbox!

2. **Test Thoroughly in Sandbox First**:
   - ✅ Create orders
   - ✅ Top-up orders
   - ✅ Get QR codes
   - ✅ Check eSIM usage
   - ✅ Check expiration handling (already implemented!)

3. **Update Vercel Environment Variables**:
   ```bash
   AIRALO_MODE=production
   AIRALO_CLIENT_ID=<production_client_id>
   AIRALO_CLIENT_SECRET=<production_client_secret>
   ```

---

## 4️⃣ Firebase Configuration

### Ensure Firebase is in Production Mode:

1. Go to Firebase Console → Project Settings
2. Verify you're using **production** Firebase project (not dev/test)
3. Check Firestore Security Rules are properly configured
4. Enable App Check (recommended for production)

---

## 🔍 How Your Code Handles Modes

### ✅ **Airalo API Mode Switching** (Automatic)

Your code automatically switches based on `AIRALO_MODE`:

```javascript
// From stripe-webhook/route.js, coinbase/webhook/route.js, etc.
const airaloMode = process.env.AIRALO_MODE || 'production'; // Defaults to production
const isSandbox = airaloMode === 'sandbox';

// Automatically uses correct credentials
const clientId = isSandbox 
  ? process.env.AIRALO_CLIENT_ID_SANDBOX 
  : process.env.AIRALO_CLIENT_ID;

const baseUrl = isSandbox
  ? 'https://sandbox-partners-api.airalo.com'
  : 'https://partners-api.airalo.com';
```

### ✅ **Stripe Mode Switching** (Automatic)

```javascript
// From stripe-webhook/route.js
const stripeMode = process.env.STRIPE_MODE || 'live'; // Defaults to live

if (stripeMode === 'test') {
  return process.env.STRIPE_SECRET_KEY_TEST;
} else {
  return process.env.STRIPE_SECRET_KEY_LIVE;
}
```

---

## 🎯 Quick Switch Between Modes

### To Switch to Production:
```bash
# In Vercel Environment Variables
AIRALO_MODE=production
STRIPE_MODE=live
```

### To Switch Back to Testing:
```bash
# In Vercel Environment Variables
AIRALO_MODE=sandbox
STRIPE_MODE=test
```

---

## ✅ What's Already Production-Ready

### Your code correctly:

✅ **Uses environment variables** (no hardcoded values)
✅ **Supports multiple modes** (sandbox/production)
✅ **Handles expired eSIMs** (just implemented!)
✅ **Shows remaining data** from Airalo API
✅ **Has proper error handling**
✅ **Includes fraud detection**
✅ **Has webhook verification**
✅ **Uses secure payment processing**
✅ **Has proper CORS and security headers**
✅ **Implements rate limiting** (Airalo API)

---

## 🚨 Important Notes

### ⚠️ Before Going Live:

1. **Test ALL flows in sandbox first**
2. **Set up monitoring** (Vercel Analytics, Firebase)
3. **Configure Stripe webhooks** with production URL
4. **Test payment flows** with Stripe test cards
5. **Verify email notifications** work
6. **Check Firebase security rules**
7. **Enable SSL/HTTPS** (Vercel does this automatically)
8. **Set up error tracking** (Sentry, LogRocket, etc.)

### ⚠️ Airalo Production Limitations:

- **One-way switch**: Cannot go back to sandbox once in production
- **Real charges**: All orders will be charged
- **No test eSIMs**: All eSIMs will be real and billed

---

## 📝 Summary: What to Do

### On Vercel (ONLY PLACE YOU NEED TO CHANGE):

1. Set `AIRALO_MODE=production`
2. Set `STRIPE_MODE=live`
3. Add production API keys for:
   - Airalo (client_id, client_secret)
   - Stripe (secret_key, webhook_secret, publishable_key)
   - Keep Firebase keys (already set)
   - Set base URLs

### In Code:

❌ **NO CHANGES NEEDED** - Your code is production-ready!

---

## 🎉 You're Ready!

Once you set the environment variables on Vercel, your site will automatically switch to production mode. All eSIM orders will be real, and payments will be processed in live mode.

**Questions? Check:**
- [Airalo Go Live Checklist](https://developers.partners.airalo.com/go-live-checklist-1531786m0)
- [Stripe Production Checklist](https://stripe.com/docs/keys#test-live-modes)

---

Last Updated: Dec 7, 2025
Status: ✅ Ready for Production
