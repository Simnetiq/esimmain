# 🐛 Fix: Australia Showing as Austria

## Problem Summary

When buying a plan for Australia, the dashboard shows Austria (or other wrong countries).

### Root Cause

**Data inconsistency**: Your system stores country information in 3 different formats:
1. **Slugs**: `"australia"` (lowercase with dashes)
2. **ISO codes**: `"AU"` (2-letter uppercase)
3. **Full names**: `"Australia"` (proper English names)

The confusion happens because:
- Airalo API returns: `country_region: "Australia"` and `country_code: "AU"`
- Your import script converts to slug: `country_code: "australia"`  
- Dashboard tries to guess which format it is
- Sometimes "AU" looks like "AT" (Austria) or gets confused

## Solution: Use Airalo's Full Names Directly ✅

**Why?** Airalo already gives us perfect English names like "Australia", "Austria", "United States". No need to convert!

---

## Quick Fix (15 minutes)

### Step 1: Run Backfill Script

This adds `country_region` (full English name) to all existing data:

```bash
node scripts/backfill-country-display-fix.js
```

**What it does:**
- Reads all dataplans, orders, and user eSIMs
- Looks up country_code ("australia" or "AU")
- Adds country_region ("Australia")
- You'll see output like:
  ```
  ✅ plan-id-123: australia → Australia
  ✅ plan-id-456: AU → Australia
  ✅ plan-id-789: AT → Austria
  ```

### Step 2: Update Dashboard to Prioritize country_region

The backfill added the correct names, but Dashboard.jsx needs to read them first.

**File:** `packages/customer-app/src/components/Dashboard.jsx`

Find line 113-119 (in `extractLocationInfo` function) and update:

```javascript
// BEFORE (line 113-119):
if (data.country_code && data.country_region) {
  return {
    code: data.country_code.toUpperCase(),
    name: data.country_region,
    isRegional: data.is_regional || false
  };
}

// AFTER (prioritize country_region):
if (data.country_region) {
  // Use Airalo's full English name directly!
  const slug = data.country_region.toLowerCase().replace(/\s+/g, '-');
  
  return {
    code: data.country_code || slug,  // Use original code or generate slug
    name: data.country_region,  // ✅ "Australia" (not "australia")
    isRegional: data.is_regional || false
  };
}
```

### Step 3: Test

1. Go to your dashboard
2. Check if Australia plans show "Australia" (not "Austria")
3. Check the browser console for the debug logs:
   ```
   🎌 EsimCard country data: {
     countryCode: "australia",
     countryName: "Australia",  ✅ Should be capitalized
     flagPath: "/flags/4x3/au.svg"  ✅ Should be Australian flag
   }
   ```

---

## Complete Fix (Optional - 1 hour)

If you want to fully clean up the codebase:

### 1. Update Import Script

**File:** `scripts/import-airalo-csv.js`

Line 138-150, change to:

```javascript
const packageData = {
  // Store Airalo's native format (full English names)
  country_region: countryRegion,  // "Australia" from CSV
  country_name: countryRegion,    // Alias for compatibility
  
  // Store slug for internal queries
  country_code: countryCode,      // "australia" (slug)
  
  // Store for backward compatibility
  country_slug: countryCode,
  
  // Rest of the fields...
  is_regional: isRegional,
  // ...
};
```

### 2. Remove Unnecessary Files

These files are over-complicated and not needed:

```bash
# OPTIONAL: Remove these after verifying everything works
rm scripts/country-name-to-code.js  # We don't need slug conversion anymore
```

Keep `countryCodeMap.js` because it has the SLUG_TO_ISO_CODE mapping needed for flags.

### 3. Update Future CSV Imports

Next time you import from Airalo CSV, the script will automatically:
- Store `country_region: "Australia"` (for display)
- Store `country_code: "australia"` (for queries)
- No more confusion!

---

## Why This Works

### Before (Confusing):
```
Airalo: "Australia" 
   ↓ convert to slug
Store: "australia"
   ↓ try to display
Display: "australia" ❌ lowercase, looks bad
   ↓ try to convert back
Result: "Austria" ❌ WRONG!
```

### After (Simple):
```
Airalo: country_region="Australia", country_code="AU"
   ↓ store both
Store: country_region="Australia", country_code="australia" (slug)
   ↓ read directly
Display: "Australia" ✅ CORRECT!
Flag: lookup "australia" → "au" → Australian flag ✅
```

---

## Verification Checklist

After running the fix:

- [ ] ✅ Run `node scripts/backfill-country-display-fix.js`
- [ ] ✅ Update Dashboard.jsx to prioritize country_region
- [ ] ✅ Deploy changes
- [ ] ✅ Check dashboard - "Australia" shows correctly
- [ ] ✅ Check dashboard - "Austria" shows correctly  
- [ ] ✅ Check flag icons are correct
- [ ] ✅ Check console logs show proper capitalization

---

## Debugging

If countries still show incorrectly:

### Check Console Logs

The Dashboard logs country data in browser console:

```javascript
🎌 EsimCard country data: {
  countryCode: "australia",        // Internal slug
  countryName: "Australia",        // ✅ This should be capitalized!
  rawCountry_region: "Australia",  // ✅ Raw data from Firebase
  flagPath: "/flags/4x3/au.svg"   // ✅ Should be correct flag
}
```

### Check Firebase Data

Go to Firebase Console → Firestore → Pick any dataplan:

**Should look like:**
```
country_region: "Australia"  ✅
country_code: "australia"    ✅ (slug, lowercase)
is_regional: false
```

**If you see:**
```
country_region: "Austria"    ❌ WRONG!
country_code: "AU"           ⚠️  ISO code (should be slug)
```

Then that document has wrong data and needs to be fixed.

### Manual Fix for One Document

If you find a specific wrong document:

```javascript
// In Firebase Console → Firestore
// Or use this script:

const admin = require('firebase-admin');
// ... initialize Firebase

const db = admin.firestore();
await db.collection('dataplans').doc('PLAN-ID-HERE').update({
  country_region: 'Australia',  // Correct full name
  country_code: 'australia',    // Slug for queries
  updated_at: admin.firestore.FieldValue.serverTimestamp()
});
```

---

## Prevention

To prevent this issue in the future:

### 1. Always Use Full Names for Display

```javascript
// ✅ GOOD:
<div>{order.country_region}</div>  // "Australia"

// ❌ BAD:
<div>{order.country_code}</div>    // "australia" or "AU" (inconsistent)
```

### 2. Always Use Slugs for Queries

```javascript
// ✅ GOOD:
where('country_code', '==', 'australia')  // Consistent slug

// ❌ BAD:
where('country_code', '==', 'AU')  // ISO code (might not match)
```

### 3. Convert to ISO Only for Flags

```javascript
// ✅ GOOD:
const isoCode = getISOCode(country_code);  // "australia" → "au"
const flagSrc = `/flags/4x3/${isoCode}.svg`;

// ❌ BAD:
const flagSrc = `/flags/4x3/${country_code}.svg`;  // Won't work for slugs
```

---

## Reference: Country Data Flow

```
┌──────────────────────────────────────────────────┐
│  Airalo API / CSV                                 │
│  country_region: "Australia" (full English name)  │
│  country_code: "AU" (ISO 2-letter code)           │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│  Import Script (import-airalo-csv.js)            │
│  Converts:                                        │
│    "Australia" → country_region: "Australia"     │
│    "AU" → country_code: "australia" (slug)       │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│  Firebase Storage                                 │
│  dataplans/PLAN-ID:                               │
│    country_region: "Australia" ← FOR DISPLAY     │
│    country_code: "australia"   ← FOR QUERIES     │
│    is_regional: false                             │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│  Dashboard.jsx                                    │
│  const name = order.country_region;  // "Australia" │
│  const slug = order.country_code;    // "australia" │
│  const iso = getISOCode(slug);       // "au"        │
│  const flag = `/flags/4x3/${iso}.svg`; // 🇦🇺      │
└──────────────────────────────────────────────────┘
```

---

## Still Having Issues?

### Option 1: Firebase MCP Server (For AI Assistance)

You mentioned setting up Firebase MCP. Here's how:

```json
// .cursor/mcp.json or gemini/settings.json
{
  "mcpServers": {
    "firebase": {
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "mcp"]
    }
  }
}
```

Then you can ask AI:
- "Show me all dataplans where country_code is 'AU' instead of 'australia'"
- "Update all orders with country_code='AU' to country_region='Australia'"

### Option 2: Manual Inspection

Check a few documents in Firebase Console:

1. Go to Firestore
2. Open `dataplans` collection
3. Find an Australia plan
4. Check the fields:
   - `country_region` should be "Australia" (capitalized)
   - `country_code` should be "australia" (slug)
   - If different, that's your problem!

### Option 3: Contact Support

If the backfill script didn't work:
1. Check the script output for errors
2. Share the error message
3. Check Firebase permissions
4. Verify service account has write access

---

## Summary

**The Fix:**
1. ✅ Run backfill script to add `country_region` to all documents
2. ✅ Update Dashboard to read `country_region` first
3. ✅ Deploy and test

**The Principle:**
- 📝 **Store** full English names from Airalo: `country_region: "Australia"`
- 🔍 **Query** with slugs: `country_code: "australia"`
- 🎌 **Display** full names: `{order.country_region}` → "Australia"
- 🏴 **Flags** use ISO codes: `getISOCode("australia")` → "au" → 🇦🇺

**The Result:**
- No more Australia → Austria confusion ✅
- Clean, readable country names ✅
- Consistent data format ✅
- Simpler code ✅

---

Need help? Check the browser console for debug logs with 🎌 emoji!
