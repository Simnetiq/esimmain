# Fix Country Display Bug: Australia → Austria

## Problem

When buying a plan for Australia, the dashboard shows Austria instead.

### Root Causes

1. **Inconsistent Data Format**: Mix of slugs ("australia"), ISO codes ("AU"), and full names ("Australia")
2. **Over-complicated Mapping**: Multiple conversions between formats cause confusion
3. **CSV Import Issue**: Country codes from Airalo aren't properly normalized

### Example of Bug

```javascript
// What Airalo gives us:
country_region: "Australia"
country_code: "AU"  // 2-letter ISO code

// What we store (from import script):
country_code: "australia"  // Slug (line 145 in import-airalo-csv.js)

// What gets displayed:
getISOCode("australia") → "au" → ✅ Correct flag
BUT if stored as "AU" → getISOCode("AU") → "au" → ✅ Also correct

// The confusion: Sometimes "AU" vs "AT" typo causes Austria to show
```

## Solution: Simplify Using Airalo's Native Format

Since Airalo provides clean English names, we should:

### Phase 1: Immediate Fix (Update Dashboard)

Update `Dashboard.jsx` to prioritize `country_region` (full name) over `country_code`:

```javascript
// In extractLocationInfo function (line 112):
// PRIORITY 0: Check for country_region (full English name from Airalo)
if (data.country_region) {
  // Use the name directly, find ISO code only for flag
  const slug = createSlug(data.country_region); // "Australia" → "australia"
  
  return {
    code: slug,  // "australia" for lookups
    name: data.country_region,  // "Australia" for display
    isoCode: getISOCode(slug),  // "au" for flag
    isRegional: data.is_regional || false
  };
}
```

### Phase 2: Fix Data Import (Backfill Database)

Update the import script to store data consistently:

**File**: `scripts/import-airalo-csv.js`

```javascript
// Line 138-150: Store BOTH name and slug
const packageData = {
  // Store the REAL name from Airalo
  country_name: countryRegion,      // "Australia" 
  country_region: countryRegion,    // "Australia"
  
  // Store slug for queries
  country_slug: countryCode,        // "australia"
  
  // Store ISO code for API calls
  country_code_iso: getISOCodeFromName(countryRegion),  // "AU"
  
  // Keep country_code for backward compatibility
  country_code: countryCode,        // "australia" (slug)
  
  // ... rest
};
```

### Phase 3: Clean Up Unnecessary Files

**Remove these files** (no longer needed):
- ❌ `scripts/country-name-to-code.js` - Over-complicated mapping
- ❌ Most of `packages/shared/utils/countryCodeMap.js` - Keep only SLUG_TO_ISO_CODE

**Why?** Because:
1. Airalo gives us `country_region: "Australia"` - use it directly!
2. Only need slug→ISO mapping for flags
3. No need to convert names back and forth

## Implementation Steps

### Step 1: Update Dashboard Display

```javascript
// packages/customer-app/src/components/Dashboard.jsx

const extractLocationInfo = (data) => {
  // SIMPLEST: Use country_region directly from Airalo
  if (data.country_region) {
    const name = data.country_region; // "Australia"
    const slug = name.toLowerCase().replace(/\s+/g, '-'); // "australia"
    
    return {
      code: slug,           // For internal lookups
      name: name,           // For display: "Australia" ✅
      isoCode: getISOCode(slug),  // For flag: "au"
      isRegional: data.is_regional || false
    };
  }
  
  // Fallback to old logic...
};
```

### Step 2: Update EsimCard Component

```javascript
// packages/customer-app/src/components/dashboard/EsimCard.jsx

// Line 96-98: Update to use country_region as primary
const countryName = order.country_region || order.countryName || null;  // "Australia"
const countrySlug = order.country_slug || order.country_code || null;   // "australia"
const isRegional = order.is_regional || order.isRegional || false;

// Get ISO code for flag
const isoCode = countrySlug ? getISOCode(countrySlug) : null;  // "au"
const flagPath = isoCode ? `/flags/4x3/${isoCode}.svg` : null;

// Display the REAL name (not the slug!)
const displayName = countryName || countrySlug || 'Unknown';  // "Australia" ✅
```

### Step 3: Run Data Backfill

```bash
# Create a new backfill script to fix existing data
node scripts/backfill-country-names.js
```

**Script**: `scripts/backfill-country-names.js`

```javascript
const admin = require('firebase-admin');
const { SLUG_TO_NAME } = require('./slug-to-name-map');

// Initialize Firebase
// ...

async function backfillCountryNames() {
  const db = admin.firestore();
  
  // Get all dataplans
  const plansSnapshot = await db.collection('dataplans').get();
  
  console.log(`Found ${plansSnapshot.size} plans to update`);
  
  const batch = db.batch();
  let count = 0;
  
  for (const doc of plansSnapshot.docs) {
    const data = doc.data();
    
    // If country_region is missing but we have country_code
    if (!data.country_region && data.country_code) {
      const name = SLUG_TO_NAME[data.country_code] || data.country_code;
      
      batch.update(doc.ref, {
        country_region: name,
        country_slug: data.country_code,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      count++;
    }
    
    // Commit batch every 500 docs
    if (count % 500 === 0 && count > 0) {
      await batch.commit();
      console.log(`Updated ${count} documents...`);
    }
  }
  
  await batch.commit();
  console.log(`✅ Updated ${count} documents total`);
}

backfillCountryNames().then(() => process.exit(0));
```

### Step 4: Create Reverse Mapping

**File**: `scripts/slug-to-name-map.js`

```javascript
// Reverse of country-name-to-code.js
// Maps slug → Full name for backfill

const SLUG_TO_NAME = {
  'australia': 'Australia',
  'austria': 'Austria',
  'united-states': 'United States',
  'united-kingdom': 'United Kingdom',
  // ... (reverse of COUNTRY_NAME_TO_CODE)
};

module.exports = { SLUG_TO_NAME };
```

## Testing

### Test 1: Check Display

```javascript
// In Dashboard, add console.log:
console.log('Country Display:', {
  stored_country_code: order.country_code,      // "australia"
  stored_country_region: order.country_region,  // "Australia"
  displayed_name: displayName,                  // Should be "Australia"
  flag_iso_code: isoCode                       // Should be "au"
});
```

### Test 2: Verify No More Confusion

```javascript
// These should NEVER be confused:
getISOCode('australia') → 'au'  ✅ Australia flag
getISOCode('austria')   → 'at'  ✅ Austria flag
getISOCode('AU')        → 'au'  ✅ Australia flag (2-letter pass-through)
getISOCode('AT')        → 'at'  ✅ Austria flag (2-letter pass-through)
```

## Long-term Architecture

```
┌─────────────────────────────────────────────┐
│         Airalo API / CSV                     │
│   country_region: "Australia"                │
│   country_code: "AU" (ISO)                   │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         Firebase Storage                     │
│   country_region: "Australia"     ← Display │
│   country_slug: "australia"       ← Queries │
│   country_code_iso: "AU"          ← API     │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         Display Layer                        │
│   Name: country_region ("Australia")        │
│   Flag: getISOCode(country_slug) ("au")     │
└─────────────────────────────────────────────┘
```

**Benefits:**
- ✅ No more name/code confusion
- ✅ Use Airalo's native format
- ✅ Simpler code (less conversion)
- ✅ Easier to debug
- ✅ More maintainable

## Files to Update

1. ✅ `packages/customer-app/src/components/Dashboard.jsx`
2. ✅ `packages/customer-app/src/components/dashboard/EsimCard.jsx`
3. ✅ `scripts/import-airalo-csv.js`
4. ✅ Create `scripts/backfill-country-names.js`
5. ✅ Create `scripts/slug-to-name-map.js`

## Files to Remove (Eventually)

1. ❌ `scripts/country-name-to-code.js` - Not needed
2. ❌ Most functions in `countryCodeMap.js` - Keep only SLUG_TO_ISO_CODE

---

**Summary**: Stop fighting with codes. Use Airalo's clean English names directly! 🎯
