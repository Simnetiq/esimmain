# 🔍 Code Duplication Analysis

## Summary

After reviewing the codebase, there are **TWO webhook handlers** and some duplication in fraud detection logic. This document outlines the issues and recommendations.

---

## 1. Duplicate Webhook Handlers ⚠️

### Issue

There are TWO Stripe webhook handlers handling the same events:

**Handler 1:** `packages/customer-app/app/api/stripe-webhook/route.js` (Next.js API Route)
- ✅ Full implementation with eSIM creation
- ✅ Price validation
- ✅ Card blocking
- ✅ Comprehensive fraud tracking
- **Used by:** Vercel deployment

**Handler 2:** `functions/src/stripe/webhookHandler.js` (Firebase Cloud Function)
- ⚠️ Simplified implementation
- ✅ Now has price validation and card blocking (updated)
- ❌ Does NOT create eSIM (delegates to main handler)
- **Used by:** Firebase Functions deployment

### Recommendation: Choose ONE

#### Option A: Use Next.js Webhook Only (Recommended)
```bash
# In Stripe Dashboard:
# Set webhook URL to: https://your-domain.vercel.app/api/stripe-webhook

# Disable Firebase webhook function
# Comment out or remove: functions/src/stripe/webhookHandler.js
```

**Pros:**
- ✅ Single source of truth
- ✅ Easier to maintain
- ✅ Full featured
- ✅ Faster (Next.js edge functions)

**Cons:**
- ❌ Requires Vercel/Next.js deployment

#### Option B: Use Firebase Webhook Only
```bash
# In Stripe Dashboard:
# Set webhook URL to: https://us-central1-YOUR_PROJECT.cloudfunctions.net/stripeWebhook

# Remove Next.js webhook:
# Delete: packages/customer-app/app/api/stripe-webhook/route.js
```

**Pros:**
- ✅ Works with Firebase hosting
- ✅ More reliable (Firebase infrastructure)

**Cons:**
- ❌ Need to add eSIM creation logic to Firebase function
- ❌ Firebase function cold starts

#### Option C: Keep Both (Not Recommended)
- Use Next.js for main webhook
- Use Firebase as backup/fallback
- Requires ensuring both stay in sync

**Action Required:**
```bash
# Current Status: BOTH are deployed
# This can cause race conditions and duplicate processing

# Recommended: Disable one in Stripe Dashboard
```

---

## 2. Duplicate Fraud Detection Logic

### Issue

Fraud detection is implemented in TWO places:

**Implementation 1:** `packages/shared/services/fraudDetectionService.js`
- ✅ Full-featured
- ✅ Used by Next.js API routes
- ✅ Client-side compatible (Firebase Web SDK)

**Implementation 2:** `functions/src/fraud/fraudDetection.js`
- ⚠️ Simplified version
- ✅ Used by Firebase Functions
- ✅ Server-side only (Firebase Admin SDK)

### Files Comparison

| Feature | Shared Service | Functions Service |
|---------|---------------|------------------|
| Check fraud rules | ✅ Full | ❌ Missing |
| Track purchase | ✅ Full | ✅ Simple |
| Track failure | ✅ Full | ✅ Simple |
| Blocklist check | ✅ Full | ❌ Missing |
| Card fingerprint | ✅ Full | ⚠️ Partial |
| Price manipulation | ✅ Full | ❌ Missing |

### Recommendation: Consolidate

```javascript
// Option 1: Use shared service everywhere
// In functions/src/stripe/handlers/paymentIntent.js:

// ❌ REMOVE:
const {trackCompletedPurchase} = require('../../fraud/fraudDetection');

// ✅ ADD:
const {trackCompletedPurchase} = require('@esim/shared/services/fraudDetectionService');

// ISSUE: Firebase Functions use Admin SDK, shared service uses Web SDK
// SOLUTION: Create adapter or make shared service support both
```

**Action Required:**
1. Create unified fraud detection service that supports both:
   - Firebase Web SDK (for Next.js)
   - Firebase Admin SDK (for Functions)
2. OR: Standardize on ONE deployment model

---

## 3. Duplicate Checkout Session Handlers

### Issue

Three different implementations of `handleCheckoutSessionCompleted`:

**Handler 1:** `packages/customer-app/app/api/stripe-webhook/route.js` (Lines 130-368)
- ✅ Full eSIM creation
- ✅ Airalo API integration
- ✅ Price validation
- ✅ Card blocking
- **Purpose:** Production webhook handler

**Handler 2:** `functions/src/stripe/handlers/checkoutSession.js`
- ✅ Updated with price validation and card blocking
- ❌ No eSIM creation
- **Purpose:** Firebase Functions webhook (now redundant)

**Handler 3:** Potentially in `server/api/services/paymentService.js`
- ⚠️ Old implementation
- **Purpose:** Legacy server code

### Recommendation

**Keep:** Handler 1 (Next.js webhook) - This is the main production handler

**Remove or Update:** Handler 2 (Firebase Functions)
```bash
# Either:
# A) Delete: functions/src/stripe/handlers/checkoutSession.js
# B) Or make it call the Next.js API as a fallback
```

**Archive:** Handler 3 (server/api)
```bash
# Move server/api to archive/ or remove if not used
```

---

## 4. Payment Service Duplication

### Issue

Multiple payment creation endpoints:

1. **Next.js API:** `packages/customer-app/app/api/create-payment-order/route.js`
   - ✅ Full security
   - ✅ Price validation
   - ✅ Fraud detection
   - **Status:** ACTIVE - This is your main endpoint

2. **Server API:** `server/api/services/paymentService.js`
   - ⚠️ Has price validation
   - ⚠️ Less comprehensive
   - **Status:** UNCLEAR - Is this still used?

3. **Firebase Functions:** Referenced in webhookHandler but no create endpoint
   - **Status:** Webhook only

### Recommendation

**Audit server/api:**
```bash
# Check if server/api is still being used:
git log --follow server/api/services/paymentService.js

# If NOT used, remove:
rm -rf server/

# If used, consolidate with Next.js API
```

---

## 5. Environment Configuration Duplication

### Issue

Multiple places read Stripe keys:

```javascript
// Pattern 1: packages/customer-app
const getStripeSecretKey = () => {
  const stripeMode = process.env.STRIPE_MODE || 'live';
  if (stripeMode === 'test') {
    return process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
  }
  return process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
};

// Pattern 2: functions/src
const secretKey = stripeMode === 'test' 
  ? functions.config().stripe.secret_key_test 
  : functions.config().stripe.secret_key_live;

// Pattern 3: server/api
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
```

### Recommendation

Create shared configuration service:

```javascript
// packages/shared/config/stripe.js
export function getStripeConfig() {
  const mode = process.env.STRIPE_MODE || 'live';
  const isTest = mode === 'test' || mode === 'sandbox';
  
  return {
    secretKey: isTest 
      ? process.env.STRIPE_SECRET_KEY_TEST 
      : process.env.STRIPE_SECRET_KEY_LIVE,
    webhookSecret: isTest
      ? process.env.STRIPE_WEBHOOK_SECRET_TEST
      : process.env.STRIPE_WEBHOOK_SECRET_LIVE,
    mode
  };
}
```

---

## Cleanup Recommendations

### High Priority

1. **✅ DONE: Updated webhook handlers with card blocking**
2. **✅ DONE: Updated fraud detection to support card fingerprints**
3. **⚠️ TODO: Choose ONE webhook handler**
   ```bash
   # In Stripe Dashboard, set webhook URL to ONE of:
   # - https://your-domain.com/api/stripe-webhook (Next.js)
   # - https://us-central1-PROJECT.cloudfunctions.net/stripeWebhook (Firebase)
   ```

### Medium Priority

4. **Consolidate fraud detection:**
   ```bash
   # Create: packages/shared/services/fraudDetection/
   #   - index.js (entry point)
   #   - client.js (Web SDK version)
   #   - server.js (Admin SDK version)
   #   - shared.js (common logic)
   ```

5. **Remove unused code:**
   ```bash
   # If server/api is not used:
   rm -rf server/
   
   # Archive or remove old scripts:
   mkdir archive/
   mv server/ archive/ # if keeping for reference
   ```

### Low Priority

6. **Standardize configuration:**
   - Create shared Stripe config service
   - Create shared Airalo config service
   - Use environment-based config everywhere

7. **Documentation:**
   - ✅ DONE: Created SECURITY.md
   - ✅ DONE: Created sync script for Stripe Radar
   - Document which webhook handler is active
   - Document deployment architecture

---

## Recommended Architecture

### Simplified Single-Stack Architecture

```
┌─────────────────────────────────────────┐
│         Next.js App (Vercel)            │
│  ┌───────────────────────────────────┐  │
│  │  /api/create-payment-order        │  │ ← Client calls this
│  │  - Rate limiting                  │  │
│  │  - Price validation               │  │
│  │  - Fraud detection                │  │
│  │  - Create Stripe payment          │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  /api/stripe-webhook              │  │ ← Stripe calls this
│  │  - Signature verification         │  │
│  │  - Price validation               │  │
│  │  - Card blocking                  │  │
│  │  - Create eSIM (Airalo API)       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│         Firebase (Database)             │
│  - Firestore (orders, blocklist, etc)  │
│  - Authentication                       │
└─────────────────────────────────────────┘
```

**Cleanup:**
- ❌ Remove: `functions/src/stripe/` (if not using Firebase Functions)
- ❌ Remove: `server/` (if not using separate server)
- ✅ Keep: `packages/customer-app/app/api/` (main API)
- ✅ Keep: `packages/shared/services/` (shared logic)

---

## Action Plan

### Immediate Actions (Today)

1. **✅ DONE:** Update webhook handlers with card blocking
2. **✅ DONE:** Update fraud detection with card fingerprint support
3. **⚠️ CRITICAL:** Choose ONE webhook handler
   - Go to Stripe Dashboard > Developers > Webhooks
   - Verify which URL is configured
   - Disable the other handler

### This Week

4. Test card blocking flow:
   ```bash
   # 1. Attempt price manipulation
   # 2. Verify card fingerprint is blocked
   # 3. Try same card with different email
   # 4. Verify still blocked
   ```

5. Set up Stripe Radar:
   ```bash
   node scripts/sync-blocklist-to-stripe-radar.js
   ```

6. Audit `server/` directory:
   - Check if it's used
   - Remove or archive if not

### This Month

7. Consolidate fraud detection code
8. Create shared configuration service
9. Remove duplicate handlers
10. Update documentation

---

## Files to Review

### Keep (Core Logic)
- ✅ `packages/customer-app/app/api/create-payment-order/route.js`
- ✅ `packages/customer-app/app/api/stripe-webhook/route.js`
- ✅ `packages/shared/services/fraudDetectionService.js`
- ✅ `scripts/sync-blocklist-to-stripe-radar.js`
- ✅ `SECURITY.md`

### Review (Potential Duplication)
- ⚠️ `functions/src/stripe/webhookHandler.js` - Duplicate?
- ⚠️ `functions/src/stripe/handlers/checkoutSession.js` - Duplicate?
- ⚠️ `functions/src/fraud/fraudDetection.js` - Duplicate?
- ⚠️ `server/api/services/paymentService.js` - Still used?

### Remove (If Not Used)
- ❌ `server/` - Entire directory if not used
- ❌ Old webhook handlers (after choosing one)

---

## Questions to Answer

1. **Which webhook URL is configured in Stripe?**
   - Check: Stripe Dashboard > Developers > Webhooks
   - Answer: __________________

2. **Is the server/ directory still being used?**
   - Check: Look for references in code
   - Check: Git history
   - Answer: __________________

3. **Are Firebase Functions deployed?**
   - Check: Firebase Console > Functions
   - Answer: __________________

4. **Where is the app hosted?**
   - Next.js: Vercel? Custom server?
   - Answer: __________________

---

**Conclusion:** The core security logic is now in place with card blocking. The main issue is architectural duplication that should be cleaned up to prevent confusion and maintenance issues.

