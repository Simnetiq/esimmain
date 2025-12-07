# 🚨 URGENT: Fix Pending Order After Payment

## Your Situation:
- ✅ **Payment successful** - Money charged
- ❌ **eSIM not created** - Order stuck on "Processing"
- 📋 **Order ID**: kargi-mobile-30days-3gb

---

## 🔍 **Root Cause:**

The **Stripe webhook is not configured** or not firing. When you paid:
1. ✅ Stripe charged your card
2. ❌ Webhook should notify your server → Create eSIM in Airalo
3. ❌ Webhook never fired or failed

---

## ⚡ **IMMEDIATE FIX (5 minutes):**

### **Step 1: Configure Stripe Webhook**

1. Go to: https://dashboard.stripe.com/
2. Make sure you're in **LIVE mode** (toggle top-left)
3. Click **Developers** → **Webhooks**
4. Check if you see: `https://www.simnetiq.com/api/stripe-webhook`

#### **If webhook DOES NOT exist:**

1. Click **"+ Add endpoint"**
2. **Endpoint URL**: `https://www.simnetiq.com/api/stripe-webhook`
3. **Events to send**: Click "Select events" and choose:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.succeeded`
   - ✅ `charge.refunded`
   - ✅ `charge.dispute.created`
4. Click **"Add endpoint"**
5. Copy the **"Signing secret"** (starts with `whsec_`)

#### **Step 2: Add Webhook Secret to Vercel**

1. Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
2. Find or add: `STRIPE_WEBHOOK_SECRET_LIVE`
3. Paste the signing secret from Step 1
4. Click **"Save"**

#### **Step 3: Resend the Webhook from Stripe**

This will manually trigger the order processing for your stuck order!

1. In Stripe Dashboard → **Developers** → **Events**
2. Find your recent payment event (should be at the top)
3. Look for `checkout.session.completed` or `payment_intent.succeeded`
4. Click on the event
5. Click **"Send test webhook"** or **"Resend event"**
6. Select your webhook endpoint
7. Click **"Send"**

✅ **Your eSIM should be created within 30 seconds!**

---

## 🔧 **Alternative Fix: Manual Order Processing**

If webhook resend doesn't work, you can manually process the order:

### **Option A: Check Stripe Event ID**

1. Go to Stripe Dashboard → **Payments**
2. Find your payment (search by amount or email)
3. Copy the **Payment Intent ID** (starts with `pi_`)
4. Send this to me and I'll help you manually trigger the order

### **Option B: Check Firebase**

Your order might be in Firebase but not processed. Let me check:

1. Go to Firebase Console: https://console.firebase.google.com/
2. Go to **Firestore Database**
3. Look in collection: `orders`
4. Find your order (search by email or order ID)
5. Check the `status` field - is it `pending`?
6. Check if `esimCreated` is `false` or missing

If you see the order there, send me:
- The document ID
- The email used
- The package ID

---

## 🚨 **Why This Happened:**

When you switched to **production mode**, you need to:
1. ✅ Set production Airalo credentials (you did this)
2. ✅ Set production Stripe keys (you did this)
3. ❌ **Configure production webhook** ← YOU MISSED THIS!

**Test mode** Stripe has different webhooks than **live mode** Stripe!

---

## 📋 **Complete Webhook Setup Checklist:**

### **In Stripe Dashboard:**
- [ ] In LIVE mode (not test mode)
- [ ] Webhook endpoint added: `https://www.simnetiq.com/api/stripe-webhook`
- [ ] Events selected: `checkout.session.completed`, `payment_intent.succeeded`
- [ ] Webhook status: **Enabled**
- [ ] Signing secret copied

### **In Vercel:**
- [ ] `STRIPE_WEBHOOK_SECRET_LIVE` set (starts with `whsec_`)
- [ ] `STRIPE_WEBHOOK_SECRET` set (fallback)
- [ ] `STRIPE_MODE=live`
- [ ] Environment variables saved

### **Test:**
- [ ] Make a test purchase (use small amount)
- [ ] Order processes automatically within seconds
- [ ] eSIM appears in dashboard
- [ ] QR code available

---

## 🔍 **How to Verify Webhook is Working:**

### **After Setting Up:**

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Check **"Recent deliveries"** tab
4. You should see successful events (200 status)

### **If Seeing Errors:**

Common webhook errors:
- **401 Unauthorized** → Wrong signing secret in Vercel
- **404 Not Found** → Wrong endpoint URL
- **500 Server Error** → Check Vercel logs

---

## 💰 **About Your Payment:**

**Don't worry!** Your payment is recorded by Stripe. Once webhook is configured:

1. **Resend the webhook** from Stripe (Step 3 above)
2. Your eSIM will be created automatically
3. You'll receive the QR code immediately

**Or** if that doesn't work:
- I can help you manually process the order
- Or Stripe can refund if eSIM cannot be created

---

## 📞 **Next Steps:**

### **RIGHT NOW:**
1. Set up the Stripe webhook (5 minutes)
2. Resend the webhook event for your order
3. Wait 30 seconds - your eSIM should appear

### **THEN:**
1. Test with a small purchase to verify it works
2. Check that future orders process automatically

### **IF STILL STUCK:**
1. Check Vercel logs: `vercel logs --follow`
2. Check Stripe webhook delivery logs
3. Send me:
   - The Stripe Payment Intent ID
   - Your order email
   - Any error messages from Vercel logs

---

## ✅ **After Fix:**

You should see:
- ✅ Order status changes to "completed"
- ✅ QR code available immediately
- ✅ eSIM in your dashboard
- ✅ Future orders process automatically

---

## 🆘 **Still Need Help?**

Send me these details:
1. **Stripe Payment Intent ID** (from Stripe dashboard)
2. **Email used for order**
3. **Screenshot of Stripe webhook deliveries** (if configured)
4. **Vercel logs** (if you can access them)

I'll help you manually process the order!

---

Last Updated: Dec 7, 2025
Status: URGENT FIX GUIDE

