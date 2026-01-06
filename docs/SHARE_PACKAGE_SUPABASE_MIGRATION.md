# Share-Package Supabase Migration Specification

## Overview

This document specifies how the **share-package** (eSIM pre-checkout) page should fetch, display, and validate plan data from **Supabase**, ensuring full consistency with the Plans Selection bottom sheet and compatibility with the existing Firebase anti-fraud checkout protection.

---

## 1. Single Source of Truth

### Principle
- **Supabase `dataplans` table** is the only client-readable source for plan/tariff data
- Client must **NEVER** trust user-modified price, data, validity, or any monetary fields
- All UI displays data fetched from Supabase; checkout validates against server-side source

### Data Authority Hierarchy
```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE                              │
│  share-package → usePackageDataSupabase() → Supabase dataplans  │
│                         (READ ONLY)                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (plan ID only)
┌─────────────────────────────────────────────────────────────────┐
│                       SERVER SIDE                               │
│  /api/create-payment-order → Firebase/Supabase dataplans        │
│                         (AUTHORITATIVE)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Plan Data Fetching Specification

### Input Contract
```typescript
interface FetchPlanInput {
  planId: string;  // The plan ID from URL params (e.g., "connect-cambodia-in-5days-unlimited")
}
```

### Output Contract (Supabase Row → View Model)
Based on the example plans provided, the mapping is:

| Supabase Column        | View Model Field      | Display Usage                          |
|------------------------|-----------------------|----------------------------------------|
| `id`                   | `id`                  | Unique plan identifier                 |
| `name` / `title`       | `name`, `planName`    | Plan display name                      |
| `data_display`         | `data`                | "Unlimited", "200 MB", "10 GB"         |
| `data_amount_mb`       | `dataAmountMb`        | Raw MB value for calculations          |
| `is_unlimited`         | `isUnlimited`         | Boolean - show unlimited badge         |
| `validity_days`        | `validity`, `period`  | "5 days", "30 days"                    |
| `price`                | `price`               | Display price (e.g., 20.5)             |
| `net_price`            | `netPrice`            | Actual cost to provider                |
| `currency`             | `currency`            | "USD" (default)                        |
| `country_id`           | `countryId`           | Country slug (e.g., "cambodia")        |
| `country_name`         | `countryName`         | "Cambodia"                             |
| `country_iso`          | `countryCode`         | "KH"                                   |
| `region_id`            | `region`, `regionSlug`| "asia", "europe", "global"             |
| `is_regional`          | `isRegional`          | Boolean - show coverage count          |
| `covered_countries`    | `countryCodes`        | Array of ISO codes                     |
| `covered_countries_count` | `coveredCountryCount` | Number of countries covered         |
| `has_voice`            | `hasVoice`            | Boolean - show voice minutes           |
| `voice_minutes`        | `voiceMinutes`        | Minutes included                       |
| `has_sms`              | `hasSms`              | Boolean - show SMS count               |
| `sms_count`            | `smsCount`            | SMS messages included                  |
| `operator_id`          | `operatorId`          | Operator reference                     |
| `operator_name`        | `operatorName`        | "Connect Cambodia", "Discover"         |
| `operator_image_url`   | `operatorLogo`        | Operator logo URL                      |
| `operator_style`       | `operatorStyle`       | "light" or "dark"                      |
| `operator_gradient_start` | `gradientStart`    | "#2d2fa0"                              |
| `operator_gradient_end` | `gradientEnd`        | "#157fd5"                              |
| `activation_policy`    | `activationPolicy`    | "first-usage"                          |
| `fair_usage_policy`    | `fairUsagePolicy`     | Speed limit after threshold            |
| `apn_type`             | `apnType`             | "automatic"                            |
| `status`               | `status`              | "active"                               |
| `plan_type`            | `planType`            | "country", "regional"                  |
| `provider`             | `provider`            | "airalo"                               |

### Fetch Implementation

```javascript
// packages/shared/services/plansServiceSupabase.js

/**
 * Fetch a single plan by ID from Supabase
 * @param {string} planId - The plan ID (e.g., "connect-cambodia-in-5days-unlimited")
 * @returns {Promise<PlanViewModel|null>}
 */
export async function fetchPlanById(planId) {
  if (!planId || !isSupabaseAvailable()) {
    return null;
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('dataplans')
    .select('*')
    .eq('id', planId)
    .eq('status', 'active')
    .eq('is_enabled', true)
    .single();

  if (error || !data) {
    console.error('Error fetching plan:', error);
    return null;
  }

  return transformPlanToViewModel(data);
}
```

---

## 3. UI Display Consistency

### Shared Display Logic
The share-package page MUST use the same display functions as `PlanSelectionBottomSheet.jsx`:

```javascript
// Shared formatting functions (packages/shared/utils/planDisplayUtils.js)

/**
 * Format data display with unlimited detection
 * Matches PlanSelectionBottomSheet.formatDataDisplay()
 */
export const formatDataDisplay = (plan) => {
  // Priority 1: Strict boolean check for unlimited
  if (plan.isUnlimited === true || plan.is_unlimited === true) {
    return 'Unlimited';
  }

  // Priority 2: Calculate from dataAmountMb
  const mb = plan.dataAmountMb || plan.data_amount_mb;
  if (mb && mb > 0) {
    if (mb >= 1024) {
      const gb = mb / 1024;
      return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`;
    }
    return `${mb} MB`;
  }

  // Priority 3: Use data_display string
  return plan.data_display || plan.data || 'Data';
};

/**
 * Check if plan has SMS
 */
export const planHasSms = (plan) => {
  return (plan.hasSms === true) || (parseInt(plan.smsCount || plan.sms_count || 0) > 0);
};

/**
 * Check if plan has Voice
 */
export const planHasVoice = (plan) => {
  return (plan.hasVoice === true) || (parseInt(plan.voiceMinutes || plan.voice_minutes || 0) > 0);
};
```

### Required UI Sections in share-package

Based on the example plans, the share-package MUST display:

#### 3.1 Header Section
- **Plan name**: `name` or `title`
- **Country/Region flag/image**: From Firebase countries/regions collection
- **Country/Region name**: Localized from translations

#### 3.2 Package Stats Section (matching PackageStats.jsx)
- **Data**: Formatted via `formatDataDisplay()`
- **Validity**: `{validity_days} days`
- **Price**: `formatPrice(price)` with currency
- **Operator**: Operator name + logo

#### 3.3 Operator/Carrier Section (NEW - Enhanced)
```jsx
{/* Operator Display - Full branding */}
{operatorName && (
  <div className="flex items-center gap-3 p-4 rounded-lg"
       style={{
         background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
       }}>
    {operatorLogo && (
      <Image
        src={operatorLogo}
        alt={operatorName}
        width={48}
        height={48}
        className="rounded-lg object-contain"
      />
    )}
    <div>
      <p className={`font-semibold ${operatorStyle === 'light' ? 'text-white' : 'text-gray-900'}`}>
        {operatorName}
      </p>
      <p className={`text-sm ${operatorStyle === 'light' ? 'text-white/80' : 'text-gray-600'}`}>
        {activationPolicy === 'first-usage' ? 'Activates on first use' : 'Ready to use'}
      </p>
    </div>
  </div>
)}
```

#### 3.4 Coverage Section (for regional/global plans)
```jsx
{isRegional && coveredCountryCount > 0 && (
  <div className="flex items-center gap-2">
    <Globe className="w-4 h-4 text-tufts-blue" />
    <span className="text-sm text-gray-600">
      Coverage: {coveredCountryCount} {coveredCountryCount === 1 ? 'country' : 'countries'}
    </span>
  </div>
)}
```

#### 3.5 Voice & SMS Section (if applicable)
```jsx
{(hasVoice || hasSms) && (
  <div className="flex items-center gap-4 text-sm text-gray-600">
    {hasVoice && (
      <span className="flex items-center gap-1">
        <Phone className="w-4 h-4" />
        {voiceMinutes} min
      </span>
    )}
    {hasSms && (
      <span className="flex items-center gap-1">
        <MessageSquare className="w-4 h-4" />
        {smsCount} SMS
      </span>
    )}
  </div>
)}
```

#### 3.6 Fair Usage Policy (for unlimited plans)
```jsx
{fairUsagePolicy && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
    <p className="text-sm text-amber-700">
      <strong>Fair Usage:</strong> {fairUsagePolicy}
    </p>
  </div>
)}
```

---

## 4. Checkout Handoff Contract

### 4.1 Fields Sent to Firebase (from Client)

**CRITICAL**: Only send minimal identification data. NEVER send trusted monetary values.

```typescript
interface CheckoutPayload {
  // REQUIRED - Identification only
  order: string;           // Plan ID (e.g., "connect-cambodia-in-5days-unlimited")
  email: string;           // User email
  userId: string | null;   // Firebase user ID (if authenticated)

  // INFORMATIONAL - For display/logging only (NOT trusted)
  name: string;            // Plan name (for Stripe description only)
  total: number;           // Submitted price (WILL BE OVERRIDDEN by server)
  currency: string;        // Currency code (server will verify)
  language: string;        // UI language

  // SECURITY
  radarSessionId?: string; // Stripe Radar session
  timestamp?: string;      // Request timestamp (replay protection)
}
```

### 4.2 Fields Firebase MUST Re-Derive

The `/api/create-payment-order` endpoint MUST:

```javascript
// In validateAndGetPrice() function

// 1. Fetch authoritative plan data from database
const packageRef = doc(db, 'dataplans', packageId);
const packageSnap = await getDoc(packageRef);

// 2. Extract ONLY server-side values (NEVER trust client)
const packageData = packageSnap.data();
const databasePrice = parseFloat(packageData.price);       // ← AUTHORITATIVE
const databaseCurrency = packageData.currency || 'USD';    // ← AUTHORITATIVE
const databaseStatus = packageData.status;                 // ← AUTHORITATIVE
const databaseEnabled = packageData.is_enabled;            // ← AUTHORITATIVE

// 3. Server-side referral discount calculation
let validPrice = databasePrice;
if (hasReferralDiscount && discountPercentage > 0) {
  validPrice = Math.max(minimumPrice, databasePrice * (100 - discountPercentage) / 100);
}
```

### 4.3 Migration Note: Firebase to Supabase Backend

During migration, the payment API can be updated to read from Supabase:

```javascript
// Option A: Keep Firebase (current) - No changes needed
const packageRef = doc(db, 'dataplans', packageId);
const packageSnap = await getDoc(packageRef);

// Option B: Migrate to Supabase (future)
// Requires adding Supabase admin client to server
import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(url, serviceRoleKey);

const { data: packageData } = await supabaseAdmin
  .from('dataplans')
  .select('*')
  .eq('id', packageId)
  .single();
```

---

## 5. Anti-Fraud Flow (Security Critical)

### 5.1 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Client Displays Plan (READ-ONLY from Supabase)                      │
│ ─────────────────────────────────────────────────────────────────────────── │
│ share-package page → fetchPlanById(planId) → Supabase dataplans             │
│ UI displays: price=$20.50, data=Unlimited, validity=5 days                  │
│ (This is for DISPLAY ONLY - not trusted for payment)                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: User Clicks "Proceed to Payment"                                    │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Client sends: { order: planId, email, userId, total: 20.50 (NOT trusted) }  │
│ The `total` is ONLY for logging/comparison - NEVER used for actual charge   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Server Validates (Firebase /api/create-payment-order)               │
│ ─────────────────────────────────────────────────────────────────────────── │
│ a) Rate limiting check                                                       │
│ b) Blocklist check (user, email, IP)                                        │
│ c) Fraud signals check                                                      │
│ d) PRICE VALIDATION (CRITICAL):                                             │
│    - Fetch plan from database (Firebase dataplans or Supabase)              │
│    - Extract databasePrice = $20.50                                         │
│    - Calculate referral discount if applicable                              │
│    - Compare: |submittedPrice - validatedPrice| <= $0.01                    │
│    - IF MISMATCH → LOG FRAUD ATTEMPT → BLOCK USER → REJECT                  │
│ e) If valid: Create Stripe session with VALIDATED price                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Stripe Charges Validated Amount                                     │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Stripe session created with: unit_amount = validatedPrice * 100             │
│ User is charged EXACTLY what database says - manipulation impossible        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Price Manipulation Detection

The existing `validateAndGetPrice()` function handles this:

```javascript
// From /api/create-payment-order/route.js

const priceDifference = Math.abs(roundedValidPrice - roundedSubmittedPrice);
const priceMatches = priceDifference <= SECURITY_CONFIG.MAX_PRICE_TOLERANCE; // $0.01

if (!priceMatches) {
  // 🚨 SECURITY ALERT - Price manipulation detected
  console.error('🚨🚨🚨 PRICE MANIPULATION DETECTED 🚨🚨🚨', {
    packageId,
    userId,
    databasePrice,
    expectedPrice: roundedValidPrice,
    submittedPrice: roundedSubmittedPrice,
    difference: priceDifference
  });

  // Log to fraud_attempts collection
  await logPriceManipulationAttempt(db, { ... });

  // Auto-block user if configured
  if (SECURITY_CONFIG.AUTO_BLOCK_ON_PRICE_MANIPULATION) {
    // Block user/email/IP
  }

  return { valid: false, error: 'Price validation failed', code: 'PRICE_MISMATCH' };
}
```

---

## 6. Forbidden Behaviors (Security Rules)

### 6.1 Client-Side FORBIDDEN Actions

| Action | Why Forbidden |
|--------|--------------|
| Sending `price` as trusted value | Attacker can modify to $0.01 |
| Sending `data` as trusted value | Attacker can claim unlimited |
| Sending `validity` as trusted value | Attacker can extend period |
| Storing price in localStorage for checkout | Can be modified via DevTools |
| Using URL params for price | Trivially modified |
| Client-side discount calculation used for charge | Must be server-side only |

### 6.2 Server-Side REQUIRED Validations

| Validation | Implementation |
|------------|----------------|
| Fetch plan from database | `getDoc(db, 'dataplans', planId)` |
| Check plan is active | `if (status !== 'active') reject` |
| Check plan is enabled | `if (is_enabled === false) reject` |
| Get price from database | `const price = packageData.price` |
| Calculate discounts server-side | Check user's referral status from DB |
| Compare submitted vs valid price | `Math.abs(diff) <= 0.01` |
| Log all attempts | Write to `payment_attempts` collection |
| Block on manipulation | Auto-block user on price mismatch |

---

## 7. Implementation Checklist

### 7.1 New Files to Create

- [ ] `packages/shared/hooks/usePlanSupabase.js` - Single plan fetch hook
- [ ] `packages/shared/utils/planDisplayUtils.js` - Shared display formatters

### 7.2 Files to Modify

- [ ] `packages/customer-app/app/share-package/[packageId]/hooks/usePackageData.js`
  - Replace Firebase `getDoc` with Supabase `fetchPlanById`
  - Keep Firebase for images/translations (countries/regions collections)

- [ ] `packages/customer-app/app/share-package/[packageId]/components/PackageStats.jsx`
  - Add operator branding display
  - Add voice/SMS display
  - Add fair usage policy display

- [ ] `packages/customer-app/app/share-package/[packageId]/components/PackageHeader.jsx`
  - Ensure consistent with PlanSelectionBottomSheet header

### 7.3 Security Validation Checklist

Before deployment, verify:

- [ ] Client ONLY sends `planId` as trusted identifier
- [ ] Server re-fetches ALL plan data from database
- [ ] Price comparison tolerance is ≤ $0.01
- [ ] Referral discounts calculated server-side only
- [ ] Price manipulation triggers automatic blocking
- [ ] All payment attempts are logged with full audit trail
- [ ] Rate limiting is active (50 requests/IP/hour)
- [ ] Blocklist check runs before price validation
- [ ] Fraud signals service is integrated

### 7.4 Testing Scenarios

| Test Case | Expected Result |
|-----------|-----------------|
| Normal purchase | Success, price matches |
| Price modified in DevTools | BLOCKED, logged as fraud |
| localStorage price modified | BLOCKED, server uses DB price |
| Disabled plan accessed | Rejected with "not available" |
| Rapid requests (>50/hour) | Rate limited |
| Blocked user attempts | Rejected with block message |
| Invalid plan ID | 404 / "Package not found" |
| Referral discount | Server calculates, matches DB |

---

## 8. Example: Complete Plan Display

Given this Supabase row:
```csv
id,name,price,data_display,validity_days,is_unlimited,operator_name,operator_image_url,operator_gradient_start,operator_gradient_end,fair_usage_policy,has_voice,voice_minutes,has_sms,sms_count,is_regional,covered_countries_count
connect-cambodia-in-5days-unlimited,Unlimited - 5 Days,20.5,Unlimited,5,true,Connect Cambodia,https://cdn.airalo.com/...png,#2d2fa0,#157fd5,Lower speed rate of 1 Mbps after 3 GB usage per day.,false,0,false,0,false,1
```

The share-package page should render:

```
┌──────────────────────────────────────────────────────────────┐
│  🇰🇭 Cambodia                                                 │
│  ───────────────────────────────────────────────────────────│
│  Unlimited - 5 Days                                          │
│                                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────────────────┐│
│  │ Data   │ │Validity│ │ Price  │ │ Operator               ││
│  │Unlimited││ 5 days │ │ $20.50 │ │ [logo] Connect Cambodia││
│  └────────┘ └────────┘ └────────┘ └────────────────────────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ ⚠️ Fair Usage: Lower speed rate of 1 Mbps after 3 GB/day ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ╔══════════════════════════════════════════════════════════╗│
│  ║                  Proceed to Payment                      ║│
│  ║                       $20.50                             ║│
│  ╚══════════════════════════════════════════════════════════╝│
└──────────────────────────────────────────────────────────────┘
```

---

## 9. Summary

| Aspect | Implementation |
|--------|----------------|
| **Client Data Source** | Supabase `dataplans` table (read-only) |
| **Server Validation Source** | Firebase `dataplans` (current) or Supabase (future) |
| **Trusted Client Data** | Plan ID only |
| **Price Authority** | Server-side database only |
| **Fraud Detection** | Price comparison, rate limiting, blocklist, fraud signals |
| **UI Consistency** | Use shared formatters from `planDisplayUtils.js` |
| **Operator Display** | Name, logo, gradient branding |
| **Coverage Display** | Country count for regional/global plans |
| **Fair Usage** | Displayed for unlimited plans with throttling |
