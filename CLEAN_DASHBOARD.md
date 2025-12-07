# CLEAN YOUR DASHBOARD - REMOVE SANDBOX ORDERS

## THE PROBLEM:

You're seeing orders with "404 Not Found" errors because:
- Those orders were created in **SANDBOX/TEST mode**
- You switched to **PRODUCTION mode**
- The sandbox orders don't exist in the real Airalo system
- They're cluttering your dashboard with fake data

---

## THE FIX: Delete All Sandbox Orders

### Step 1: Open This URL in Browser

```
https://www.simnetiq.store/api/clean-sandbox-orders?key=simnetiq-admin-2024
```

**This will DELETE all test/sandbox orders from your database.**

---

### Step 2: Check Your Dashboard

Go to: https://www.simnetiq.store/dashboard

✅ All sandbox orders will be GONE!
✅ Only REAL production orders will show

---

## What Gets Deleted:

Any order where:
- `isTestMode === true`
- `mode === 'sandbox'`
- `test === true`

These are fake orders that can't be fulfilled because they don't exist in the real Airalo system.

---

## After Cleaning:

1. ✅ Your dashboard will be clean
2. ✅ No more 404 errors
3. ✅ Only real orders with real eSIMs will show
4. ✅ New payments will create REAL orders (already in production mode)

---

## If You Have Real Stuck Orders:

After cleaning, if you have REAL orders (from actual credit card payments) that are stuck:

1. Check Stripe Dashboard for actual payments
2. Use the retry endpoint for those specific order IDs
3. Or resend the Stripe webhook

---

**Run the cleaning URL NOW to fix your dashboard! 🧹**

Last Updated: Dec 7, 2025
