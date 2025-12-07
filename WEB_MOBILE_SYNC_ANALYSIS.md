# Web & Mobile Synchronization Analysis

## Issues Identified

### 1. ❌ Missing `source` Field
**Problem:** Orders don't have a `source: 'web'` or `source: 'mobile'` field
**Impact:** Cannot distinguish between web and mobile purchases in analytics/dashboard

### 2. ⚠️ Airalo Authentication Failing
**Problem:** `sim-usage` API route authentication fails with "Client authentication failed"
**Cause:** Using wrong environment variable names or sandbox/production mismatch

### 3. ✅ Country Fields (Already Good!)
**Status:** Country fields ARE being saved correctly:
- `country_code` (2-letter ISO)
- `country_region` (full name)
- `country_codes` (array)
- `is_regional` (boolean)

---

## Mobile App Implementation (Reference)

### Mobile: How Orders Are Created

**File:** `[planId].js` (Mobile)

```javascript
const orderData = {
  order: orderId,
  email: currentUser.email,
  name: plan.name || `eSIM Plan - ${planDataStr}`,
  total: chargePrice,
  currency: (plan.currency || 'USD').toLowerCase(),
  userId: currentUser.uid,
  language: 'en',
  platform: Platform.OS, // ✅ 'ios' or 'android'
  planId: plan.id,
  planData: plan,
  timestamp: new Date().toISOString(),
};
```

### Mobile: How Country Data Is Displayed

**File:** `EsimCard.js`

```javascript
const getCountryInfo = (esim) => {
  const orderData = esim.orderData || {};
  
  // Check multiple sources for country name
  let countryName = esim.country_region ||  // ✅ Firebase field
                    esim.countryName || 
                    esim.country_name || 
                    orderData.country_region ||
                    '';
  
  // Check multiple sources for country code (2-letter ISO)
  let countryCode = esim.country_code ||  // ✅ Firebase field  
                    esim.countryCode ||
                    orderData.country_code ||
                    '';
  
  // Country photo URL if available
  const countryPhoto = esim.countryPhoto || esim.country_photo || orderData.country_image || '';
  
  // Check if regional eSIM
  const isRegional = esim.is_regional || esim.isRegional || orderData.is_regional || false;
  
  return { countryCode, countryName, countryPhoto, isRegional };
};
```

**Key Insight:** Mobile app reads `country_region`, `country_code`, and `is_regional` from root level of eSIM document.

---

## Web App Current Implementation

### Web: Order Creation API
**File:** `packages/customer-app/app/api/create-payment-order/route.js`

**Current:**
```javascript
const pendingOrderData = {
  orderId: order,
  packageId: order,
  planId: order,
  customerEmail: email,
  userId: userId || null,
  paymentStatus: 'pending',
  amount: validatedPrice,
  currency: currency,
  packageName: packageName,
  orderDetails: {},
  status: 'pending',
  esimCreated: false,
  createdAt: serverTimestamp(),
  mode: stripeMode,
  isTestMode: isTestMode,
  quantity: "1",
  // ✅ Country information (GOOD!)
  country_code: countryCode,
  country_region: countryName,
  country_codes: countryCodes,
  is_regional: isRegional,
  // ❌ MISSING: source field
};
```

### Web: Dashboard Display
**File:** `packages/customer-app/src/components/Dashboard.jsx`

Similar country extraction logic as mobile - reads:
- `country_region`
- `country_code`
- `is_regional`

---

## Required Changes

### ✅ Fix 1: Add `source` Field to Web Orders

**File:** `packages/customer-app/app/api/create-payment-order/route.js`

**Location:** Line ~530 in `pendingOrderData` object

**Add:**
```javascript
const pendingOrderData = {
  // ... existing fields ...
  
  // ADD THIS:
  source: 'web', // Identifies purchase origin (web vs mobile)
  platform: platform || 'web', // Keep platform for compatibility
  
  // Country information...
  country_code: countryCode,
  country_region: countryName,
  // ... rest of fields
};
```

**Also add to Stripe metadata:**

Line ~609 (Payment Intent):
```javascript
metadata: {
  // ... existing fields ...
  source: 'web',
  platform: platform || 'web',
  // ...
}
```

Line ~658 (Checkout Session):
```javascript
metadata: {
  // ... existing fields ...
  source: 'web',
  platform: platform || 'web',
  // ...
}
```

### ✅ Fix 2: Fix Airalo Authentication

**File:** `packages/customer-app/app/api/airalo/sim-usage/route.js`

**Problem:** Environment variable mismatch or sandbox/production mode confusion

**Current Code (Lines 18-31):**
```javascript
let clientId = process.env.AIRALO_CLIENT_ID;
let clientSecret = process.env.AIRALO_CLIENT_SECRET || process.env.AIRALO_CLIENT_SECRET_PRODUCTION;

// Fallback to Firestore config
if (!clientId || !clientSecret) {
  const airaloConfigRef = doc(db, 'config', 'airalo');
  const airaloConfig = await getDoc(airaloConfigRef);
  
  if (airaloConfig.exists()) {
    const configData = airaloConfig.data();
    clientId = clientId || configData.api_key || configData.client_id;
    clientSecret = clientSecret || configData.client_secret;
  }
}
```

**Issue:** Not checking Airalo mode (sandbox vs production)

**Solution:** Match the webhook's logic:

```javascript
// Determine Airalo mode
const airaloMode = process.env.AIRALO_MODE || 'production'; // 'sandbox' or 'production'
const isSandbox = airaloMode === 'sandbox';

// Select correct credentials based on mode
let clientId = isSandbox
  ? process.env.AIRALO_CLIENT_ID_SANDBOX
  : process.env.AIRALO_CLIENT_ID;
  
let clientSecret = isSandbox
  ? process.env.AIRALO_CLIENT_SECRET_SANDBOX
  : (process.env.AIRALO_CLIENT_SECRET || process.env.AIRALO_CLIENT_SECRET_PRODUCTION);

// Select correct base URL
const baseUrl = isSandbox 
  ? (process.env.AIRALO_BASE_URL_SANDBOX || 'https://sandbox-partners-api.airalo.com')
  : (process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com');

console.log(`[Airalo Usage] Mode: ${airaloMode}, URL: ${baseUrl}`);

// Fallback to Firestore config if env vars not set
if (!clientId || !clientSecret) {
  const airaloConfigRef = doc(db, 'config', 'airalo');
  const airaloConfig = await getDoc(airaloConfigRef);
  
  if (airaloConfig.exists()) {
    const configData = airaloConfig.data();
    clientId = clientId || configData.api_key || configData.client_id;
    clientSecret = clientSecret || configData.client_secret;
  }
}

if (!clientId || !clientSecret) {
  return NextResponse.json({
    success: false,
    error: 'Airalo credentials not found. Please configure AIRALO_CLIENT_ID and AIRALO_CLIENT_SECRET.'
  }, { status: 400 });
}
```

### ✅ Fix 3: Apply Same Fix to Other Airalo Routes

**Files to update:**
- `packages/customer-app/app/api/airalo/sim-details/route.js`
- `packages/customer-app/app/api/airalo/qr-code/route.js`
- Any other Airalo API routes

**Apply the same environment variable logic** to ensure consistent sandbox/production handling.

---

## Environment Variables Checklist

### Required Environment Variables

**Web (.env or Vercel):**
```bash
# Airalo Configuration
AIRALO_MODE=production  # or 'sandbox' for testing
AIRALO_BASE_URL=https://partners-api.airalo.com
AIRALO_BASE_URL_SANDBOX=https://sandbox-partners-api.airalo.com

# Production Credentials
AIRALO_CLIENT_ID=your_production_client_id
AIRALO_CLIENT_SECRET=your_production_client_secret
AIRALO_CLIENT_SECRET_PRODUCTION=your_production_client_secret  # Fallback

# Sandbox Credentials (if using sandbox mode)
AIRALO_CLIENT_ID_SANDBOX=your_sandbox_client_id
AIRALO_CLIENT_SECRET_SANDBOX=your_sandbox_client_secret
```

**Mobile (.env in mobile project):**
```bash
AIRALO_CLIENT_ID=your_client_id
AIRALO_CLIENT_SECRET=your_client_secret
AIRALO_BASE_URL=https://partners-api.airalo.com
```

---

## Testing Checklist

### After Implementing Fixes:

1. **✅ Test Web Purchase**
   - [ ] Purchase an eSIM from web
   - [ ] Check Firebase document has `source: 'web'`
   - [ ] Check `country_region`, `country_code`, `is_regional` are set
   - [ ] Verify dashboard shows correct country name (not code)

2. **✅ Test Mobile Purchase**
   - [ ] Purchase an eSIM from mobile app
   - [ ] Check Firebase document has `source: 'mobile'` or `platform: 'ios'/'android'`
   - [ ] Check country fields are set
   - [ ] Verify mobile dashboard shows correct country

3. **✅ Test Airalo Usage API**
   - [ ] Try to fetch usage data from dashboard
   - [ ] Check terminal logs - should NOT see "Client authentication failed"
   - [ ] Should see successful auth and usage data

4. **✅ Test Both Sandbox and Production**
   - [ ] Set `AIRALO_MODE=sandbox` and test
   - [ ] Set `AIRALO_MODE=production` and test
   - [ ] Verify correct credentials are used for each mode

---

## Summary of Changes

### Files Modified:

1. **`packages/customer-app/app/api/create-payment-order/route.js`**
   - Add `source: 'web'` to `pendingOrderData`
   - Add `source: 'web'` to Stripe Payment Intent metadata
   - Add `source: 'web'` to Stripe Checkout Session metadata

2. **`packages/customer-app/app/api/airalo/sim-usage/route.js`**
   - Add Airalo mode detection (sandbox vs production)
   - Use correct environment variables based on mode
   - Add better logging for debugging

3. **`packages/customer-app/app/api/airalo/sim-details/route.js`**
   - Apply same Airalo mode detection logic

4. **Other Airalo API routes**
   - Apply same pattern consistently

### Fields Already Working:

✅ **Country Fields** - Already correctly saved:
- `country_region` (full name like "Australia", "Austria")
- `country_code` (ISO 2-letter like "AU", "AT")
- `is_regional` (boolean for multi-country plans)

✅ **Dashboard Display** - Already reads country fields correctly in both web and mobile

---

## Mobile vs Web Comparison

| Field | Mobile | Web | Status |
|-------|--------|-----|--------|
| `source` | N/A | ❌ Missing | **Needs Fix** |
| `platform` | ✅ iOS/Android | ⚠️ Optional | **Needs Fix** |
| `country_region` | ✅ Saved | ✅ Saved | **Good!** |
| `country_code` | ✅ Saved | ✅ Saved | **Good!** |
| `is_regional` | ✅ Saved | ✅ Saved | **Good!** |
| Airalo Auth | ✅ Works | ❌ Broken | **Needs Fix** |

---

## Next Steps

1. ✅ Implement `source` field in web order creation
2. ✅ Fix Airalo authentication for all API routes
3. ✅ Test both web and mobile purchases
4. ✅ Verify dashboard displays correctly for both
5. ✅ Check Airalo usage API works
6. ✅ Deploy to production

---

**Status:** Ready for implementation  
**Priority:** High (Airalo auth blocking usage data)  
**Estimated Time:** 30-60 minutes

