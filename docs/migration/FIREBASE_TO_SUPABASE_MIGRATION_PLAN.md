# Firebase → Supabase Migration Plan: Countries & Dataplans

**Version:** 1.0
**Date:** 2026-01-04
**Status:** Ready for Execution
**Scope:** Duplication only (no cutover, no deletes)

---

## 1. Context & Ownership Rules

### System of Record Boundaries

| Domain | System of Record | Rationale |
|--------|-----------------|-----------|
| Payments, orders, topups, cashback, promo validation | **Firebase** | High-frequency writes, Cloud Functions integration |
| Fraud detection, telemetry, enforcement | **Firebase** | Real-time event processing |
| Auth, identity, device trust | **Firebase** | Firebase Auth integration |
| High-frequency writes, event logs | **Firebase** | Optimized for write patterns |
| **Read-heavy catalog data** | **Supabase** | Relational queries, SEO optimization |
| **Structured relational entities** | **Supabase** | Foreign keys, joins |
| **SEO- and CMS-style content** | **Supabase** | Indexed text search |
| **Public or semi-public datasets** | **Supabase** | Row-level security, caching |

### Approved Transfer Decisions

| Collection | Target | Status |
|-----------|--------|--------|
| `countries` | Supabase | ✅ Approved |
| `dataplans` | Supabase | ✅ Approved |
| `regions` | Supabase | ✅ Already migrated |

### Environment Context

- **This migration runs in:** Admin/Main Web project context
- **Firebase Project:** `esimcreator-f00dd`
- **Supabase Project:** `eujmomonscnlmwcbkbfy`
- **Strategy:** Duplication only - Firebase remains source of truth during transition

---

## 2. Firebase Source Schemas

### 2.1 Countries Collection (`/countries/{countrySlug}`)

**Document ID:** Country slug (e.g., `united-states`, `germany`, `japan`)

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `code` | string | `"united-states"` | Same as document ID |
| `slug` | string | `"united-states"` | URL-safe identifier |
| `name` | string | `"United States"` | Display name |
| `title` | string | `"United States"` | Alternative display name |
| `status` | string | `"active"` / `"disabled"` | Visibility status |
| `isActive` | boolean | `true` | Redundant status flag |
| `enabled` | boolean | `true` | Optional, same as isActive |
| `visible` | boolean | `true` | UI visibility |
| `is_regional` | boolean | `false` | True for regional packages |
| `is_popular` | boolean | `true` | Featured on homepage |
| `region` | string | `"americas"` | Geographic region slug |
| `planCount` | number | `15` | Cached plan count |
| `minPrice` | number | `4.50` | Cached minimum price |
| `provider` | string | `"airalo"` | Data source provider |
| `translations` | object | `{"es": {"name": "..."}}` | Localized content |
| `photo` | string | `"https://..."` | Country image URL |
| `image` | string | `"https://..."` | Alternative image field |
| `description` | string | `"..."` | SEO description |
| `updated_at` | Timestamp | `2025-12-01T...` | Last modification |
| `updated_by` | string | `"airalo_sync"` | Modification source |
| `disabledAt` | Timestamp | optional | When disabled |
| `disabledReason` | string | optional | Why disabled |

### 2.2 Dataplans Collection (`/dataplans/{packageSlug}`)

**Document ID:** Package slug (e.g., `merhaba-7days-1gb`, `ae-data-7days`)

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `id` | string | `"merhaba-7days-1gb"` | Same as document ID |
| `slug` | string | `"merhaba-7days-1gb"` | URL-safe identifier |
| `title` | string | `"Turkey - 1 GB - 7 Days"` | Display title |
| `name` | string | `"Turkey - 1 GB - 7 Days"` | Alternative name |
| `type` | string | `"sim"` / `"topup"` | Package type |
| `status` | string | `"active"` / `"disabled"` | Visibility status |
| `enabled` | boolean | `true` | Active flag |
| `provider` | string | `"airalo"` | Data source |
| `price` | number | `4.50` | Customer price (USD) |
| `net_price` | number | `3.50` | Cost to purchase |
| `original_price` | number | `3.50` | Base price |
| `retail_price_recommended` | number | `5.00` | Suggested retail |
| `currency` | string | `"USD"` | Always USD |
| `markup_percentage` | number | `0` | Applied markup |
| `data` | string | `"1 GB"` | Human-readable data |
| `data_amount_mb` | number | `1024` | Data in megabytes |
| `capacity` | number | `1024` | Alias for data_amount_mb |
| `is_unlimited` | boolean | `false` | Unlimited data flag |
| `validity` | number | `7` | Validity in days |
| `validity_unit` | string | `"days"` | Always "days" |
| `day` | number | `7` | Alias for validity |
| `period` | number | `7` | Alias for validity |
| `sms` | number | `0` | SMS count |
| `voice` | number | `0` | Voice minutes |
| `voice_minutes` | number | `0` | Alias for voice |
| `networks` | string | `"Turkcell, Vodafone"` | Comma-separated operators |
| `operator` | string | `"Turkcell"` | Primary operator |
| `country_region` | string | `"Turkey"` | Country display name |
| `country_code` | string | `"turkey"` | Country slug |
| `country_codes` | array | `["turkey"]` | All covered countries |
| `country_ids` | array | `["turkey"]` | Alias for country_codes |
| `is_regional` | boolean | `false` | Regional package flag |
| `region` | string | `"europe"` | Geographic region |
| `region_type` | string | `null` / `"Europe"` | For regional packages |
| `fair_usage_policy` | object | `null` / `{...}` | FUP details |
| `activation_policy` | object | `null` / `{...}` | Activation rules |
| `source` | string | `"csv_import"` / `"api_import"` | Import source |
| `imported_at` | Timestamp | `2025-12-01T...` | Import timestamp |
| `updated_at` | Timestamp | `2025-12-01T...` | Last update |
| `synced_at` | string/Timestamp | `2025-12-01T...` | Last sync |

---

## 3. Supabase Target Schemas

### 3.1 Current Schema Analysis

The Supabase schema is already created. Here's the gap analysis:

**Countries Table - Gap Analysis:**

| Supabase Column | Firebase Field | Status | Action |
|-----------------|----------------|--------|--------|
| `id` (PK) | document ID / `code` | ✅ Maps | Use doc ID |
| `region_id` (FK) | `region` | ✅ Maps | Transform slug to FK |
| `is_active` | `isActive` / `status` | ✅ Maps | Derive from status |
| `is_popular` | `is_popular` | ✅ Maps | Direct copy |
| `is_hidden` | inverse of `visible` | ✅ Maps | Transform |
| `translations` | `translations` | ✅ Maps | Direct copy (JSONB) |
| `synced_at` | — | Auto | Set on insert |
| — | `name` | ❌ Missing | **Add column** |
| — | `slug` | ❌ Missing | **Add column** |
| — | `title` | ❌ Missing | **Add column** |
| — | `photo` / `image` | ❌ Missing | **Add column** |
| — | `description` | ❌ Missing | **Add column** |
| — | `plan_count` | ❌ Missing | **Add column** |
| — | `min_price` | ❌ Missing | **Add column** |
| — | `provider` | ❌ Missing | **Add column** |
| — | `is_regional` | ❌ Missing | **Add column** |
| — | `firebase_updated_at` | ❌ Missing | **Add column** |

**Dataplans Table - Gap Analysis:**

| Supabase Column | Firebase Field | Status |
|-----------------|----------------|--------|
| `id` (PK) | document ID | ✅ Maps |
| `name` | `name` | ✅ Maps |
| `title` | `title` | ✅ Maps |
| `type` | `type` | ✅ Maps |
| `status` | `status` | ✅ Maps |
| `enabled` | `enabled` | ✅ Maps |
| `provider` | `provider` | ✅ Maps |
| `price` | `price` | ✅ Maps |
| `net_price` | `net_price` | ✅ Maps |
| `original_price` | `original_price` | ✅ Maps |
| `currency` | `currency` | ✅ Maps |
| `data_amount_mb` | `data_amount_mb` | ✅ Maps |
| `data_display` | `data` | ✅ Rename |
| `is_unlimited` | `is_unlimited` | ✅ Maps |
| `validity_days` | `validity` | ✅ Rename |
| `is_regional` | `is_regional` | ✅ Maps |
| `has_voice` | derive from `voice > 0` | ✅ Transform |
| `voice_minutes` | `voice` / `voice_minutes` | ✅ Maps |
| `has_sms` | derive from `sms > 0` | ✅ Transform |
| `sms_count` | `sms` | ✅ Maps |
| `operator_name` | `operator` | ✅ Rename |
| `country_id` (FK) | `country_code` | ✅ Maps |
| `country_code` | `country_code` | ✅ Maps |
| `country_name` | `country_region` | ✅ Rename |
| `covered_countries` | `country_codes` | ✅ Maps |
| `installation` | — | Optional |
| `operator_info` | — | Optional |
| `coverage` | — | Optional |
| `activation_policy` | `activation_policy` | ✅ Maps (needs stringify) |
| `fair_usage_policy` | `fair_usage_policy` | ✅ Maps (needs stringify) |
| `firebase_updated_at` | `updated_at` | ✅ Maps |
| `synced_at` | — | Auto |

### 3.2 Required Schema Alterations

```sql
-- COUNTRIES: Add missing columns
ALTER TABLE public.countries
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS plan_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_price numeric,
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'airalo',
  ADD COLUMN IF NOT EXISTS is_regional boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS firebase_updated_at timestamp with time zone;

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_countries_is_active ON public.countries(is_active);
CREATE INDEX IF NOT EXISTS idx_countries_is_popular ON public.countries(is_popular);
CREATE INDEX IF NOT EXISTS idx_countries_region_id ON public.countries(region_id);
CREATE INDEX IF NOT EXISTS idx_countries_name ON public.countries(name);
CREATE INDEX IF NOT EXISTS idx_countries_slug ON public.countries(slug);

-- DATAPLANS: Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_dataplans_country_id ON public.dataplans(country_id);
CREATE INDEX IF NOT EXISTS idx_dataplans_type ON public.dataplans(type);
CREATE INDEX IF NOT EXISTS idx_dataplans_status ON public.dataplans(status);
CREATE INDEX IF NOT EXISTS idx_dataplans_price ON public.dataplans(price);
CREATE INDEX IF NOT EXISTS idx_dataplans_is_regional ON public.dataplans(is_regional);
CREATE INDEX IF NOT EXISTS idx_dataplans_data_amount ON public.dataplans(data_amount_mb);
CREATE INDEX IF NOT EXISTS idx_dataplans_validity ON public.dataplans(validity_days);

-- Composite indexes for common admin queries
CREATE INDEX IF NOT EXISTS idx_dataplans_country_price
  ON public.dataplans(country_id, price);
CREATE INDEX IF NOT EXISTS idx_dataplans_status_price
  ON public.dataplans(status, price);
CREATE INDEX IF NOT EXISTS idx_dataplans_type_status
  ON public.dataplans(type, status);
```

---

## 4. Field Transformation Rules

### 4.1 Countries Transformation

| Firebase Field | Supabase Column | Transformation |
|----------------|-----------------|----------------|
| document ID | `id` | **Verbatim** |
| `code` / `slug` | `slug` | **Verbatim** (prefer `slug`) |
| `name` | `name` | **Verbatim** |
| `title` | `title` | **Verbatim** (fallback to `name`) |
| `status` | `is_active` | `status === 'active'` |
| `isActive` | `is_active` | **Fallback** if status missing |
| `visible` | `is_hidden` | `visible === false` (inverse) |
| `is_popular` | `is_popular` | **Verbatim** |
| `is_regional` | `is_regional` | **Verbatim** |
| `region` | `region_id` | **Lookup** region by slug |
| `translations` | `translations` | **Verbatim** (already JSONB) |
| `photo` / `image` | `image_url` | **Coalesce** (`photo \|\| image`) |
| `description` | `description` | **Verbatim** |
| `planCount` | `plan_count` | **Verbatim** |
| `minPrice` | `min_price` | **Verbatim** |
| `provider` | `provider` | **Verbatim** (default 'airalo') |
| `updated_at` | `firebase_updated_at` | **Convert** Timestamp → ISO |
| — | `synced_at` | **Set** to `now()` |

### 4.2 Dataplans Transformation

| Firebase Field | Supabase Column | Transformation |
|----------------|-----------------|----------------|
| document ID | `id` | **Verbatim** |
| `name` | `name` | **Verbatim** |
| `title` | `title` | **Verbatim** |
| `type` | `type` | **Verbatim** (`'sim'` or `'topup'`) |
| `status` | `status` | **Verbatim** |
| `enabled` | `enabled` | **Verbatim** |
| `provider` | `provider` | **Verbatim** |
| `price` | `price` | **Verbatim** (numeric) |
| `net_price` | `net_price` | **Verbatim** (numeric) |
| `original_price` | `original_price` | **Verbatim** (numeric) |
| `currency` | `currency` | **Verbatim** (default 'USD') |
| `data_amount_mb` | `data_amount_mb` | **Verbatim** (integer) |
| `data` | `data_display` | **Verbatim** (string like "1 GB") |
| `is_unlimited` | `is_unlimited` | **Verbatim** |
| `validity` | `validity_days` | **Verbatim** (integer) |
| `is_regional` | `is_regional` | **Verbatim** |
| `voice` / `voice_minutes` | `voice_minutes` | **Coalesce** |
| `voice > 0` | `has_voice` | **Derive** boolean |
| `sms` | `sms_count` | **Verbatim** |
| `sms > 0` | `has_sms` | **Derive** boolean |
| `operator` | `operator_name` | **Verbatim** |
| `country_code` | `country_id` | **Verbatim** (FK to countries) |
| `country_code` | `country_code` | **Verbatim** |
| `country_region` | `country_name` | **Verbatim** |
| `country_codes` | `covered_countries` | **Verbatim** (array) |
| `activation_policy` | `activation_policy` | **Stringify** if object |
| `fair_usage_policy` | `fair_usage_policy` | **Stringify** if object |
| `updated_at` | `firebase_updated_at` | **Convert** Timestamp → ISO |
| — | `synced_at` | **Set** to `now()` |

---

## 5. MCP-Driven Execution Flow

### 5.1 Pre-Flight Checks

```
Step 1: Verify Firebase MCP Connection
├── List collections
├── Confirm access to /countries
├── Confirm access to /dataplans
└── Record document counts

Step 2: Verify Supabase MCP Connection
├── List tables
├── Confirm countries table exists
├── Confirm dataplans table exists
├── Confirm regions table has data
└── Record current row counts
```

### 5.2 Schema Preparation (Supabase)

```
Step 3: Execute Schema Alterations
├── Add missing columns to countries
├── Add missing indexes
├── Verify constraints
└── Record schema version
```

### 5.3 Regions Pre-Population

```
Step 4: Ensure Regions Exist
├── Query Supabase regions table
├── If empty, insert standard regions:
│   ├── asia
│   ├── europe
│   ├── americas
│   ├── africa
│   ├── oceania
│   ├── middle-east
│   └── caribbean
└── Map region slugs to IDs
```

### 5.4 Countries Migration

```
Step 5: Read Countries from Firebase
├── Query all documents from /countries
├── Transform each document:
│   ├── Map status → is_active
│   ├── Map visible → is_hidden (inverse)
│   ├── Lookup region_id from regions table
│   ├── Coalesce photo/image → image_url
│   └── Convert timestamps
└── Collect transformed records

Step 6: Write Countries to Supabase
├── For each batch of 100 records:
│   ├── Use UPSERT (ON CONFLICT DO UPDATE)
│   ├── Set synced_at = now()
│   └── Log success/failure
└── Record total inserted/updated
```

### 5.5 Dataplans Migration

```
Step 7: Read Dataplans from Firebase
├── Query all documents from /dataplans
├── Filter: only process if country_id exists in Supabase countries
├── Transform each document:
│   ├── Derive has_voice = voice > 0
│   ├── Derive has_sms = sms > 0
│   ├── Coalesce voice/voice_minutes
│   ├── Convert timestamps
│   └── Stringify policy objects
└── Collect transformed records

Step 8: Write Dataplans to Supabase
├── For each batch of 100 records:
│   ├── Use UPSERT (ON CONFLICT DO UPDATE)
│   ├── Handle FK constraint failures gracefully
│   ├── Set synced_at = now()
│   └── Log success/failure
└── Record total inserted/updated
```

---

## 6. Data Validation Steps

### 6.1 Count Validation

| Check | Firebase Query | Supabase Query | Pass Criteria |
|-------|---------------|----------------|---------------|
| Countries count | `db.collection('countries').count()` | `SELECT COUNT(*) FROM countries` | Counts match |
| Dataplans count | `db.collection('dataplans').count()` | `SELECT COUNT(*) FROM dataplans` | Counts match |
| Active countries | `.where('status', '==', 'active').count()` | `WHERE is_active = true` | Counts match |
| Active dataplans | `.where('status', '==', 'active').count()` | `WHERE status = 'active'` | Counts match |

### 6.2 Checksum Validation

```javascript
// Compute hash of key fields for N random samples
const sampleIds = ['united-states', 'germany', 'japan', 'turkey', 'france'];

for (const id of sampleIds) {
  const firebaseDoc = await firebase.doc(`countries/${id}`).get();
  const supabaseRow = await supabase.from('countries').select().eq('id', id).single();

  // Compare critical fields
  assert(firebaseDoc.name === supabaseRow.name);
  assert(firebaseDoc.is_popular === supabaseRow.is_popular);
  assert(firebaseDoc.planCount === supabaseRow.plan_count);
}
```

### 6.3 Spot Check Queries

| Query | Expected Result |
|-------|-----------------|
| `SELECT * FROM countries WHERE is_popular = true ORDER BY name` | Popular countries match Firebase |
| `SELECT COUNT(*) FROM dataplans WHERE country_id = 'united-states'` | Matches Firebase planCount for US |
| `SELECT MIN(price) FROM dataplans WHERE country_id = 'turkey'` | Matches Firebase minPrice for Turkey |
| `SELECT * FROM dataplans WHERE is_regional = true LIMIT 10` | Regional packages have valid coverage data |

### 6.4 Referential Integrity Checks

```sql
-- All dataplans should reference valid countries
SELECT COUNT(*)
FROM dataplans d
WHERE d.country_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM countries c WHERE c.id = d.country_id);
-- Expected: 0

-- All countries should reference valid regions
SELECT COUNT(*)
FROM countries c
WHERE c.region_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM regions r WHERE r.id = c.region_id);
-- Expected: 0
```

---

## 7. Read Performance Optimization

### 7.1 Admin Dashboard Patterns

| Use Case | Query Pattern | Optimization |
|----------|--------------|--------------|
| Country list with filters | `WHERE is_active = ? AND region_id = ?` | Composite index on `(is_active, region_id)` |
| Dataplan search | `WHERE country_id = ? AND type = ?` | Composite index on `(country_id, type)` |
| Price range filter | `WHERE price BETWEEN ? AND ?` | B-tree index on `price` |
| Sort by popularity | `ORDER BY is_popular DESC, name` | Index on `(is_popular, name)` |

### 7.2 Public Website Patterns

| Use Case | Query Pattern | Optimization |
|----------|--------------|--------------|
| Homepage popular countries | `WHERE is_popular = true AND is_active = true` | Partial index |
| Country detail page | `WHERE id = ?` | Primary key lookup |
| Plans for country | `WHERE country_id = ? AND status = 'active' ORDER BY price` | Composite index |
| SEO sitemap | `SELECT id, name, slug FROM countries WHERE is_active = true` | Covering index |

### 7.3 Mobile App Patterns

| Use Case | Query Pattern | Optimization |
|----------|--------------|--------------|
| Country autocomplete | `WHERE name ILIKE ?%` | GIN trigram index (optional) |
| Cheapest plans | `ORDER BY price LIMIT 10` | Index on `price` |
| Plans by data size | `WHERE data_amount_mb >= ?` | Index on `data_amount_mb` |

### 7.4 Denormalization Strategy

- **Country name on dataplans:** Already denormalized (`country_name`) - no joins needed
- **Plan count on countries:** Already cached (`plan_count`) - no aggregation needed
- **Min price on countries:** Already cached (`min_price`) - no aggregation needed

---

## 8. Operational Safeguards

### 8.1 Idempotency

All operations use **UPSERT** (ON CONFLICT DO UPDATE):

```sql
INSERT INTO countries (id, name, ...)
VALUES ($1, $2, ...)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  synced_at = now();
```

**Safe to re-run:** Yes - same data produces same result.

### 8.2 Partial Failure Handling

```
If batch N fails:
├── Log failed record IDs
├── Continue with batch N+1
├── At end, report:
│   ├── Total attempted
│   ├── Total succeeded
│   └── Failed IDs for manual review
└── Re-run only failed IDs
```

### 8.3 Rollback Strategy

Since this is duplication-only:
- **No rollback needed** - Firebase remains authoritative
- **To "undo":** Simply delete rows from Supabase with matching `synced_at` batch timestamp
- **Recovery query:** `DELETE FROM countries WHERE synced_at > '2026-01-04T...'`

### 8.4 Monitoring During Migration

| Metric | Alert Threshold |
|--------|-----------------|
| Batch latency | > 10 seconds |
| Error rate | > 1% of records |
| Supabase API rate limit | 429 response |
| Firebase read quota | Near daily limit |

---

## 9. Migration Script Template

```javascript
// scripts/migrate-to-supabase.js

const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const BATCH_SIZE = 100;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const db = admin.firestore();

// Transform Firebase country to Supabase format
function transformCountry(doc, regionMap) {
  const data = doc.data();
  return {
    id: doc.id,
    slug: data.slug || doc.id,
    name: data.name || data.title || doc.id,
    title: data.title || data.name,
    region_id: regionMap[data.region] || null,
    is_active: data.status === 'active' || data.isActive === true,
    is_popular: data.is_popular || false,
    is_hidden: data.visible === false,
    is_regional: data.is_regional || false,
    translations: data.translations || {},
    image_url: data.photo || data.image || null,
    description: data.description || null,
    plan_count: data.planCount || 0,
    min_price: data.minPrice || null,
    provider: data.provider || 'airalo',
    firebase_updated_at: data.updated_at?.toDate?.() || null,
    synced_at: new Date().toISOString()
  };
}

// Transform Firebase dataplan to Supabase format
function transformDataplan(doc) {
  const data = doc.data();
  const voice = data.voice || data.voice_minutes || 0;
  const sms = data.sms || 0;

  return {
    id: doc.id,
    name: data.name || data.title,
    title: data.title || data.name,
    type: data.type || 'sim',
    status: data.status || 'active',
    enabled: data.enabled !== false,
    provider: data.provider || 'airalo',
    price: parseFloat(data.price) || 0,
    net_price: data.net_price ? parseFloat(data.net_price) : null,
    original_price: data.original_price ? parseFloat(data.original_price) : null,
    currency: data.currency || 'USD',
    data_amount_mb: parseInt(data.data_amount_mb || data.capacity) || 0,
    data_display: data.data || null,
    is_unlimited: data.is_unlimited || false,
    validity_days: parseInt(data.validity || data.day || data.period) || 30,
    is_regional: data.is_regional || false,
    has_voice: voice > 0,
    voice_minutes: voice,
    has_sms: sms > 0,
    sms_count: sms,
    operator_name: data.operator || null,
    country_id: data.country_code || null,
    country_code: data.country_code || null,
    country_name: data.country_region || null,
    covered_countries: data.country_codes || [],
    activation_policy: data.activation_policy
      ? (typeof data.activation_policy === 'string'
          ? data.activation_policy
          : JSON.stringify(data.activation_policy))
      : null,
    fair_usage_policy: data.fair_usage_policy
      ? (typeof data.fair_usage_policy === 'string'
          ? data.fair_usage_policy
          : JSON.stringify(data.fair_usage_policy))
      : null,
    firebase_updated_at: data.updated_at?.toDate?.() || null,
    synced_at: new Date().toISOString()
  };
}

async function migrate() {
  console.log('Starting Firebase → Supabase migration...\n');

  // Step 1: Build region map
  const { data: regions } = await supabase.from('regions').select('id, name');
  const regionMap = {};
  for (const r of regions) {
    regionMap[r.id] = r.id;
    regionMap[r.name?.toLowerCase()] = r.id;
  }
  console.log(`Loaded ${regions.length} regions`);

  // Step 2: Migrate countries
  console.log('\n--- Migrating Countries ---');
  const countriesSnap = await db.collection('countries').get();
  const countries = countriesSnap.docs.map(doc => transformCountry(doc, regionMap));

  let countrySuccess = 0;
  let countryErrors = [];

  for (let i = 0; i < countries.length; i += BATCH_SIZE) {
    const batch = countries.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('countries').upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`Batch ${i/BATCH_SIZE + 1} error:`, error.message);
      countryErrors.push(...batch.map(c => c.id));
    } else {
      countrySuccess += batch.length;
      console.log(`Countries: ${countrySuccess}/${countries.length}`);
    }
  }

  // Step 3: Migrate dataplans
  console.log('\n--- Migrating Dataplans ---');
  const plansSnap = await db.collection('dataplans').get();
  const plans = plansSnap.docs.map(doc => transformDataplan(doc));

  let planSuccess = 0;
  let planErrors = [];

  for (let i = 0; i < plans.length; i += BATCH_SIZE) {
    const batch = plans.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('dataplans').upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`Batch ${i/BATCH_SIZE + 1} error:`, error.message);
      planErrors.push(...batch.map(p => p.id));
    } else {
      planSuccess += batch.length;
      console.log(`Dataplans: ${planSuccess}/${plans.length}`);
    }
  }

  // Summary
  console.log('\n=== MIGRATION SUMMARY ===');
  console.log(`Countries: ${countrySuccess}/${countries.length} (${countryErrors.length} errors)`);
  console.log(`Dataplans: ${planSuccess}/${plans.length} (${planErrors.length} errors)`);

  if (countryErrors.length > 0) {
    console.log('\nFailed country IDs:', countryErrors.join(', '));
  }
  if (planErrors.length > 0) {
    console.log('\nFailed dataplan IDs:', planErrors.join(', '));
  }
}

migrate().catch(console.error);
```

---

## 10. Execution Readiness Checklist

### Pre-Requisites

- [ ] **Firebase Admin SDK** credentials available (`firebase-service-account.json`)
- [ ] **Supabase Service Key** available (`SUPABASE_SERVICE_KEY` env var)
- [ ] **Supabase URL** configured (`SUPABASE_URL` env var)
- [ ] **Regions table populated** in Supabase (asia, europe, americas, etc.)
- [ ] **Schema alterations applied** (new columns on countries)
- [ ] **Indexes created** per section 3.2

### Environment Verification

- [ ] Can connect to Firebase and read `/countries` collection
- [ ] Can connect to Firebase and read `/dataplans` collection
- [ ] Can connect to Supabase and write to `countries` table
- [ ] Can connect to Supabase and write to `dataplans` table
- [ ] Supabase RLS policies allow service key writes

### Data Quality Pre-Checks

- [ ] Firebase countries count: _____ documents
- [ ] Firebase dataplans count: _____ documents
- [ ] Sample 5 countries manually verified
- [ ] Sample 5 dataplans manually verified
- [ ] No duplicate document IDs

### Operational Readiness

- [ ] Migration script tested with `--dry-run` flag
- [ ] Backup of existing Supabase data (if any)
- [ ] Monitoring dashboard ready
- [ ] Team notified of migration window
- [ ] Rollback procedure documented

### Post-Migration Validation

- [ ] Row counts match between Firebase and Supabase
- [ ] Spot check 10 random countries
- [ ] Spot check 10 random dataplans
- [ ] Admin dashboard can query Supabase data
- [ ] No FK constraint violations
- [ ] No null values in required fields

---

## Appendix A: Region Seed Data

```sql
INSERT INTO regions (id, name, display_order, type) VALUES
  ('asia', 'Asia', 1, 'continent'),
  ('europe', 'Europe', 2, 'continent'),
  ('americas', 'Americas', 3, 'continent'),
  ('africa', 'Africa', 4, 'continent'),
  ('oceania', 'Oceania', 5, 'continent'),
  ('middle-east', 'Middle East', 6, 'region'),
  ('caribbean', 'Caribbean', 7, 'region')
ON CONFLICT (id) DO NOTHING;
```

## Appendix B: Quick Reference Commands

```bash
# Test Firebase connection
node -e "require('./firebase-service-account.json'); console.log('OK')"

# Test Supabase connection
curl -H "apikey: $SUPABASE_SERVICE_KEY" \
     "$SUPABASE_URL/rest/v1/countries?select=count"

# Run migration (dry run)
node scripts/migrate-to-supabase.js --dry-run

# Run migration (production)
node scripts/migrate-to-supabase.js

# Validate counts
node scripts/validate-migration.js
```

---

**Document Owner:** Migration Team
**Last Updated:** 2026-01-04
**Next Review:** After first successful migration run
