# 🔧 Fix: Webpack Error + Price Issues

## Issue 1: Webpack Runtime Error ❌

```
TypeError: Cannot read properties of undefined (reading 'call')
```

### Root Cause
Next.js cache corruption after code changes to `fraudDetectionService.js`

### Solution
```bash
# Clear Next.js cache
rm -rf packages/customer-app/.next/cache

# Or full rebuild
rm -rf packages/customer-app/.next
cd packages/customer-app
npm run dev
```

**Already fixed!** ✅ Cache has been cleared.

### If Error Persists

The error is in the build cache. Do a full rebuild:

```bash
cd packages/customer-app

# Kill the dev server (Ctrl+C)

# Remove all build artifacts
rm -rf .next node_modules/.cache

# Restart dev server
npm run dev

# Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

---

## Issue 2: Prices Reduced/Hardcoded for Great Britain ⚠️

### What You're Seeing

Prices for Great Britain (and possibly other countries) appear to be hardcoded or reduced incorrectly.

### Possible Causes

#### Cause A: Backfill Script Removed Valid Markup

If you ran `scripts/backfill-remove-markup.js`, it set all prices to `net_price` (wholesale price) and removed the 17% referral discount markup.

**Check if this happened:**
1. Go to Firebase Console → Firestore → `dataplans`
2. Find a Great Britain plan
3. Check these fields:
   ```
   price: 3.83  ← Current selling price
   net_price: 3.83  ← Wholesale price from Airalo
   original_price: 4.5  ← Original retail price
   markup_percentage: 0  ← Was this supposed to be 17?
   ```

**If `markup_percentage = 0`**: The backfill script removed your intended markup!

#### Cause B: Referral Discount Applied Incorrectly

The `create-payment-order` API applies referral discounts:
```javascript
// Line 158 in create-payment-order/route.js
let minimumPrice = 0.5;  // Minimum price floor
let discountPercentage = 17;  // 17% referral discount

// Line 193: Applies discount
validPrice = Math.max(minimumPrice, databasePrice * (100 - discountPercentage) / 100);
```

**This means:**
- Database price: $4.50
- With 17% discount: $4.50 * 0.83 = $3.735 → rounds to $3.74
- If minimum price is $0.50, final price = $3.74

**But if the database price is already $3.83** (from backfill removing markup):
- $3.83 * 0.83 = $3.18
- This is $0.65 less than it should be! ❌

### Solution: Choose Your Pricing Strategy

You need to decide:

#### Option A: Use Airalo Net Prices (No Markup)

If you want to sell at Airalo's wholesale prices:

1. **Keep prices as-is** after backfill (net prices)
2. **Remove referral discount logic** from API
3. **Update frontend** to not show discounts

**Changes needed:**
```javascript
// In create-payment-order/route.js, line 156-195
// REMOVE the discount calculation:
let validPrice = databasePrice;  // No discount applied

// OR keep discount but use it as your margin:
// Store retail price in DB, apply discount for sales
```

#### Option B: Add Markup Back (17% Margin)

If you want a 17% profit margin:

1. **Re-import with markup** or run a script to add markup
2. **Keep referral discount** for users who use referral codes
3. **Non-referral users pay full price**

**Pricing flow:**
```
Airalo Net Price: $3.83
Your Retail Price: $3.83 * 1.17 = $4.48 (17% markup)
Referral Discount: $4.48 * 0.83 = $3.72 (back near net price)
```

#### Option C: Separate Referral Discount from Margin

Most businesses do this:

1. **Cost**: Airalo net price ($3.83)
2. **Your margin**: +17% ($0.65) = $4.48
3. **Retail price**: $4.48 (stored in database)
4. **Referral users**: -10% discount = $4.03
5. **Your profit**: $4.03 - $3.83 = $0.20 (5% margin after discount)

### Recommended Fix

**Run this script to analyze your current prices:**

```javascript
// scripts/analyze-gb-prices.js
const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
}

const db = admin.firestore();

async function analyzeGBPrices() {
  const plansSnapshot = await db.collection('dataplans')
    .where('country_codes', 'array-contains', 'united-kingdom')
    .get();
  
  console.log(`Found ${plansSnapshot.size} Great Britain plans:\n`);
  
  plansSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`${doc.id}:`);
    console.log(`  Price: $${data.price}`);
    console.log(`  Net Price: $${data.net_price}`);
    console.log(`  Original Price: $${data.original_price}`);
    console.log(`  Markup: ${data.markup_percentage}%`);
    console.log(`  Status: ${data.status}`);
    console.log('');
  });
}

analyzeGBPrices().then(() => process.exit(0));
```

Run it:
```bash
node scripts/analyze-gb-prices.js
```

This will show you exactly what prices are stored and help you decide what to fix.

---

## Issue 3: Price Appears "Hardcoded" at $0.50 🤔

If you're seeing prices stuck at $0.50, this is the **minimum price floor**:

```javascript
// create-payment-order/route.js, line 158
let minimumPrice = 0.5;

// Line 193
validPrice = Math.max(minimumPrice, databasePrice * (100 - discountPercentage) / 100);
```

**Why $0.50?**
- Prevents selling at a loss
- Prevents referral discount making price negative or too low
- Default value if settings not configured

**If ALL prices show $0.50**:
- Database prices might be missing or set to 0
- Check Firebase: `dataplans` → find a plan → check `price` field

---

## Quick Diagnosis Commands

### Check if backfill ran:
```bash
# In Firebase Console → Firestore
# Check any dataplan document
# Look for field: backfilled_at
# If exists with recent timestamp, backfill ran
```

### Check actual prices in Firebase:
```javascript
// Browser console on your site
fetch('/api/plans').then(r => r.json()).then(plans => {
  console.table(plans.filter(p => p.country_code === 'united-kingdom').map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    net_price: p.net_price
  })));
});
```

### Check what users are paying:
```bash
# Firebase Console → Firestore → orders
# Find recent Great Britain orders
# Check: amount field
# Compare with dataplan.price
```

---

## Action Plan

### Step 1: Clear Cache (Done ✅)
Already cleared Next.js cache to fix webpack error.

### Step 2: Refresh Browser
Hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)

### Step 3: Diagnose Price Issue
```bash
# Create the analysis script
node scripts/analyze-gb-prices.js
```

### Step 4: Choose Fix Based on Results

**If prices are correct in database but wrong in UI:**
- Clear browser cache
- Check API response
- Verify frontend isn't applying extra transformations

**If prices are wrong in database:**
- Decide on pricing strategy (see Option A/B/C above)
- Run appropriate backfill/fix script
- Re-import from Airalo if needed

### Step 5: Test
1. Go to Great Britain plans
2. Check prices match your intended strategy
3. Try to purchase (test mode)
4. Verify final charge amount is correct

---

## Prevention

### 1. Document Your Pricing Strategy

Create `PRICING_STRATEGY.md`:
```markdown
# Pricing Strategy

## Base Prices
- Source: Airalo Net Prices (wholesale)
- Stored in: dataplans.net_price

## Retail Prices
- Calculation: net_price * 1.17 (17% markup)
- Stored in: dataplans.price
- This covers our costs + profit margin

## Referral Discounts
- Applied to: Users who used a referral code
- Discount: 10% off retail price
- Minimum: $0.50 (never sell below cost)
- Calculation: max(0.50, price * 0.90)
```

### 2. Add Price Validation

In your import script:
```javascript
if (finalPrice < netPrice) {
  throw new Error(`Price $${finalPrice} is below cost $${netPrice}!`);
}
```

### 3. Monitor Prices

Set up alerts for:
- Plans where price < net_price (selling at a loss!)
- Plans where markup_percentage changed unexpectedly
- Countries with unusually low minPrice

---

## Still Having Issues?

### Share This Info:

1. **What you see**: "Great Britain plan shows $X, but I expect $Y"
2. **What's in database**: 
   ```
   Go to Firebase → dataplans → [GB plan ID]
   Share: price, net_price, original_price, markup_percentage
   ```
3. **When it started**: "After running backfill script" or "Suddenly today"
4. **Which countries affected**: "Only GB" or "GB, France, Germany, etc."

This will help diagnose exactly what's wrong!

---

## Summary

**Webpack Error**: ✅ Fixed by clearing cache
**Price Issue**: ⚠️ Need more info - run analysis script
**Next Steps**: 
1. Hard refresh browser
2. Run `node scripts/analyze-gb-prices.js`
3. Share results
4. Choose pricing strategy
5. Apply appropriate fix
