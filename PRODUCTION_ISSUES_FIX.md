# 🚨 Production Issues - IMMEDIATE FIXES

## Issues You're Experiencing:

1. ✅ **401 Stripe Radar Error** - Wrong publishable key
2. ✅ **404 QR Code Not Found** - Sandbox orders don't exist in production
3. ✅ **401 Too Many Requests** - Rate limiting from retries
4. ✅ **500 create-payment-order Error** - Stripe configuration

---

## 🔥 CRITICAL FIX #1: Stripe Keys (Fix 401 Errors)

### The Problem:
Your `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is still using **test mode** key (`pk_test_...`) or not set.

### The Solution:
Go to **Vercel → Settings → Environment Variables** and set:

```bash
# CRITICAL: Set these to LIVE keys
STRIPE_MODE=live
STRIPE_SECRET_KEY_LIVE=sk_live_51...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51...   ← MUST be pk_live_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...

# Fallback keys (same as live)
STRIPE_SECRET_KEY=sk_live_51...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### How to Get Live Keys:
1. Go to https://dashboard.stripe.com/
2. Click **"Developers"** in top right
3. Click **"API keys"**
4. Make sure you're viewing **"Live"** mode (toggle in top left)
5. Copy:
   - **Publishable key** → `pk_live_...`
   - **Secret key** (click "Reveal") → `sk_live_...`

### After Setting:
- Redeploy on Vercel OR
- Wait 2-3 minutes for auto-rebuild

---

## 🔥 CRITICAL FIX #2: Old Sandbox Orders (Fix 404 Errors)

### The Problem:
Your Firebase database has **sandbox eSIM orders** that don't exist in **production Airalo**.

When you switched to `AIRALO_MODE=production`, the code tries to fetch these orders from production Airalo API, but they don't exist there → **404 Not Found**.

### The Solution:

#### **Option A: Hide Sandbox Orders (Quick Fix)**

Add a filter to only show production orders in the dashboard.

1. Mark all sandbox orders in Firebase:
   - Add field: `mode: 'sandbox'` to old orders
   
2. Filter them out in the UI

#### **Option B: Start Fresh (Recommended)**

Create new test orders in production mode:

1. Go to your website checkout
2. Use Stripe test card: `4242 4242 4242 4242`
3. Complete a small test purchase ($1 plan if available)
4. This will create a REAL order in production Airalo

#### **Option C: Keep Both Modes**

Switch back to sandbox temporarily:

```bash
# On Vercel, set:
AIRALO_MODE=sandbox
STRIPE_MODE=test

# Use sandbox credentials
AIRALO_CLIENT_ID=your_sandbox_client_id
AIRALO_CLIENT_SECRET=your_sandbox_secret
```

Then switch to production only when ready to accept real orders.

---

## 🔥 FIX #3: Rate Limiting (Fix 429 Errors)

### The Problem:
Trying to fetch QR codes for multiple orders rapidly hits Airalo's rate limit:
- **100 requests per minute per ICCID**
- **20-minute cache**

### The Solution:

The code already handles this, but the issue is multiple failed retries.

**Quick Fix**: 
1. Clear browser cache
2. Refresh the page ONCE
3. Don't click "View QR" multiple times rapidly

---

## 🎯 COMPLETE CHECKLIST

### Step 1: Verify Stripe Keys

```bash
# Check in Vercel Environment Variables
STRIPE_MODE=live ✓
STRIPE_SECRET_KEY_LIVE=sk_live_... ✓
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... ✓  ← Most Important!
STRIPE_WEBHOOK_SECRET_LIVE=whsec_... ✓
```

### Step 2: Verify Airalo Keys

```bash
AIRALO_MODE=production ✓
AIRALO_CLIENT_ID=<production_client_id> ✓
AIRALO_CLIENT_SECRET=<production_secret> ✓
```

### Step 3: Test New Order

1. Go to your website
2. Select a small plan (cheapest available)
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete checkout
5. Check dashboard - should see new order
6. Click "View QR" - should work!

### Step 4: If Still Getting Errors

**Check Vercel Logs:**
```bash
vercel logs <your-project-url>
```

Look for:
- "Auth failed" → Wrong Airalo credentials
- "Stripe error" → Wrong Stripe keys
- "404 not found" → Order doesn't exist in production Airalo

---

## 🚨 IMPORTANT: Production vs Sandbox

### Sandbox Mode:
- **Orders**: Created in Airalo sandbox (fake eSIMs)
- **Payments**: Stripe test mode (fake payments)
- **Can switch back anytime**

### Production Mode:
- **Orders**: Created in Airalo production (REAL eSIMs, REAL COSTS)
- **Payments**: Stripe live mode (REAL payments)
- **Cannot go back to Airalo sandbox once switched!**

### Current Problem:
You have **sandbox orders in Firebase** but trying to access them with **production Airalo credentials**.

**Solution**: Either:
1. Keep sandbox mode until ready for real orders
2. Delete/hide sandbox orders and create new production orders
3. Use different Firebase collections for sandbox vs production

---

## 🔍 Debug Commands

### Check Current Vercel Environment Variables:
```bash
vercel env ls
```

### Check Vercel Logs:
```bash
vercel logs --follow
```

### Check if Keys are Set:
```bash
# In Vercel dashboard, check if these show masked values:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_live_••••••••
STRIPE_SECRET_KEY_LIVE: sk_live_••••••••
AIRALO_CLIENT_ID: ••••••••
```

---

## ✅ After Fixes:

You should see:
- ✅ Checkout page loads without 401 errors
- ✅ Can complete test payment
- ✅ New orders appear in dashboard
- ✅ "View QR" works for new production orders
- ✅ No 404 errors for new orders

---

## 🆘 If Still Having Issues:

1. **Double-check Stripe keys** - Most common issue
2. **Wait 5 minutes** after setting env vars
3. **Hard refresh** browser (Cmd+Shift+R / Ctrl+Shift+R)
4. **Try incognito mode** to avoid cache
5. **Check Vercel deployment logs** for errors

---

Last Updated: Dec 7, 2025
Status: Quick Fix Guide for Production Issues
