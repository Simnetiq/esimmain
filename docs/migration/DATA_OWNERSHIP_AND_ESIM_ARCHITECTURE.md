# Data Ownership & eSIM Architecture Analysis

**Version:** 1.0
**Date:** 2026-01-04
**Author:** Senior Data Engineer / Migration Lead
**Status:** Analysis Complete - Ready for Review

---

## Executive Summary

This document defines the dual-storage architecture for eSIM catalog and user data across Firebase and Supabase. It establishes clear ownership boundaries, justifies intentional duplication, and provides a detailed recommendation for storing purchased SIM cards with fraud-aware design.

**Key Decision:** Dataplans intentionally exist in BOTH systems—Firebase for transactional integrity and fraud prevention, Supabase for read-heavy frontend consumption.

---

## 1. Context & Assumptions (Restated for Cross-Chat Continuity)

### 1.1 System of Record Boundaries

| Domain | System | Rationale |
|--------|--------|-----------|
| **Payments, orders, topups** | Firebase | Real-time Cloud Functions, webhook processing |
| **Fraud detection, enforcement** | Firebase | Sub-second write latency for blocking |
| **Auth, identity, device trust** | Firebase | Firebase Auth integration |
| **High-frequency event logs** | Firebase | Scalable append-only writes |
| **Read-heavy catalog data** | Supabase | Relational queries, PostgreSQL performance |
| **SEO/CMS content** | Supabase | Full-text search, structured content |
| **Admin dashboards** | Supabase | Complex filtering, aggregations |
| **Public API reads** | Supabase | Connection pooling, edge caching |

### 1.2 Current Firebase Collections

Based on codebase analysis:

| Collection | Purpose | Read Pattern | Write Pattern |
|-----------|---------|--------------|---------------|
| `dataplans` | eSIM plan catalog | High (public) | Low (sync) |
| `countries` | Country metadata | High (public) | Low (sync) |
| `regions` | Geographic groupings | Medium | Very low |
| `orders` | Purchase transactions | Medium (user) | Medium (webhook) |
| `users/{uid}/esims` | User's purchased SIMs | High (user) | Low (webhook) |
| `fraud_tracking_*` | Fraud detection | Low (admin) | High (every purchase) |
| `fraud_blocklist` | Blocked entities | Low (validation) | Low (admin) |

### 1.3 This Chat's Project Context

- **Environment:** Admin/Main Web project
- **Firebase Project:** `esimcreator-f00dd`
- **Supabase Project:** `eujmomonscnlmwcbkbfy`
- **Migration Strategy:** Duplication-first (no cutover yet)

---

## 2. Dual-Write / Dual-Read Rationale for Dataplans

### 2.1 Why Dataplans Must Exist in Both Systems

```
┌─────────────────────────────────────────────────────────────────┐
│                    DUAL-STORAGE ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐         ┌──────────────────┐                 │
│   │   FIREBASE   │         │    SUPABASE      │                 │
│   │  (Transact)  │         │    (Read)        │                 │
│   └──────┬───────┘         └────────┬─────────┘                 │
│          │                          │                           │
│   ╔══════╧════════╗         ╔══════╧════════╗                   │
│   ║  dataplans    ║         ║  dataplans    ║                   │
│   ║  (full)       ║◄═══════►║  (subset)     ║                   │
│   ╚═══════════════╝  SYNC   ╚═══════════════╝                   │
│          │                          │                           │
│          ▼                          ▼                           │
│   ┌──────────────┐         ┌───────────────────┐                │
│   │ Cloud Funcs  │         │ Admin Dashboard   │                │
│   │ Payment Flow │         │ Public Website    │                │
│   │ Fraud Check  │         │ Mobile App        │                │
│   │ Order Create │         │ SEO Pages         │                │
│   └──────────────┘         └───────────────────┘                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Use Cases by System

| Use Case | System | Why |
|----------|--------|-----|
| **Price validation at checkout** | Firebase | Source of truth for money movement |
| **Fraud check: "is plan enabled?"** | Firebase | Sub-100ms latency required |
| **Create order with plan details** | Firebase | Atomic write with order doc |
| **Homepage plan listings** | Supabase | Cached, indexed, fast reads |
| **Country page with sorted plans** | Supabase | Complex ORDER BY, pagination |
| **Admin filtering/export** | Supabase | Aggregations, joins, bulk ops |
| **SEO sitemaps** | Supabase | Static generation, no auth |
| **Mobile app catalog** | Supabase | Pooled connections, low latency |

### 2.3 Fraud Risk Justification

**Scenario:** An attacker modifies frontend code to display wrong price, then submits order.

**With Firebase as transactional source:**
1. Webhook receives payment of $5.00
2. Cloud Function looks up plan in Firebase: actual price = $15.00
3. Price mismatch detected → order blocked, card fingerprint added to blocklist
4. Firebase fraud tracking logs the attempt

**If we relied on Supabase for price validation:**
- Potential sync lag could allow stale prices
- No direct integration with Cloud Functions
- Requires additional latency for cross-system call

**Decision:** Firebase dataplans are authoritative for ALL transactional operations.

---

## 3. Dataplans Field Duplication Strategy

### 3.1 Field Classification

| Field | Firebase | Supabase | Rationale |
|-------|----------|----------|-----------|
| **IDENTIFIERS** |
| `id` (package slug) | ✅ | ✅ | Primary key in both |
| `slug` | ✅ | ✅ | URL routing |
| **PRICING (Critical)** |
| `price` | ✅ **SoT** | ✅ | Display; Firebase is authoritative for transactions |
| `net_price` | ✅ **SoT** | ❌ | Cost basis; fraud-sensitive |
| `original_price` | ✅ | ✅ | Display only |
| `markup_percentage` | ✅ **SoT** | ❌ | Internal business logic |
| `currency` | ✅ | ✅ | Display |
| **PLAN DETAILS** |
| `name` | ✅ | ✅ | Display |
| `title` | ✅ | ✅ | Display |
| `type` (sim/topup) | ✅ | ✅ | Filtering |
| `data_amount_mb` | ✅ | ✅ | Filtering, display |
| `data_display` | ✅ | ✅ | Human-readable |
| `is_unlimited` | ✅ | ✅ | Display |
| `validity_days` | ✅ | ✅ | Display, filtering |
| **VOICE/SMS** |
| `voice_minutes` | ✅ | ✅ | Display |
| `sms_count` | ✅ | ✅ | Display |
| **LOCATION** |
| `country_id` | ✅ | ✅ | FK, filtering |
| `country_code` | ✅ | ✅ | Lookup |
| `country_name` | ✅ | ✅ | Display |
| `covered_countries` | ✅ | ✅ | Array for regional |
| `is_regional` | ✅ | ✅ | Filtering |
| **OPERATOR** |
| `operator_name` | ✅ | ✅ | Display |
| `operator_image_url` | ✅ | ✅ | Display |
| `operator_gradient_*` | ❌ | ✅ | UI-only |
| **POLICIES** |
| `activation_policy` | ✅ | ✅ | Display as JSON |
| `fair_usage_policy` | ✅ | ✅ | Display as JSON |
| **STATUS** |
| `status` | ✅ **SoT** | ✅ | Firebase controls availability |
| `enabled` | ✅ **SoT** | ✅ | Firebase controls visibility |
| **METADATA** |
| `provider` | ✅ | ✅ | Filtering |
| `source` | ✅ | ❌ | Internal tracking |
| `synced_at` | ✅ | ✅ | Reconciliation |
| `firebase_updated_at` | ✅ | ✅ | Audit trail |

**SoT = Source of Truth** (Firebase is authoritative, Supabase is read replica)

### 3.2 Fields That MUST Remain Firebase-Only

| Field | Reason |
|-------|--------|
| `net_price` | Cost basis exposure = competitive risk |
| `markup_percentage` | Business logic leak |
| `source` | Internal sync metadata |
| Internal IDs from Airalo | API key correlation risk |

---

## 4. Purchased SIM Cards: Architecture Analysis

### 4.1 Current State (Firebase)

**Collections:**
- `orders/{orderId}` - Global order records
- `users/{uid}/esims/{orderId}` - User-scoped copies

**Order Document Structure (from codebase):**
```javascript
{
  // Identifiers
  orderId: string,
  airaloOrderId: string,
  userId: string,
  packageId: string,

  // Payment
  amount: number,
  currency: string,
  paymentProvider: 'stripe' | 'coinbase',
  stripeSessionId: string,
  paymentStatus: 'pending' | 'completed' | 'failed',

  // eSIM Data (from Airalo)
  iccid: string,
  qr_code: string,           // LPA string
  qr_code_url: string,       // Image URL
  matching_id: string,
  activation_code: string,
  smdp_address: string,
  direct_apple_installation_url: string,

  // Status
  status: 'pending' | 'processing' | 'completed' | 'payment_mismatch',
  esimCreated: boolean,

  // Plan snapshot
  planName: string,
  country_code: string,
  country_region: string,
  data_amount_mb: number,
  validity: number,

  // Fraud metadata
  fraudBlocked: boolean,
  blockedCard: string,

  // Timestamps
  createdAt: Timestamp,
  paymentCompletedAt: Timestamp,
  esimCreatedAt: Timestamp
}
```

### 4.2 Airalo Usage API Response

From the API documentation provided:
```json
{
  "data": {
    "remaining": 767,           // MB remaining
    "total": 2048,              // MB total
    "expired_at": "2022-01-01 00:00:00",
    "is_unlimited": true,
    "status": "ACTIVE",         // NOT_ACTIVE, ACTIVE, FINISHED, UNKNOWN, EXPIRED
    "remaining_voice": 0,
    "remaining_text": 0,
    "total_voice": 0,
    "total_text": 0
  }
}
```

### 4.3 Data Categories for Purchased SIMs

| Category | Fields | Sensitivity | Write Frequency | Read Frequency |
|----------|--------|-------------|-----------------|----------------|
| **Identity** | orderId, userId, iccid | High | Once | Medium |
| **Payment** | amount, paymentStatus, stripeSessionId | Critical | Once | Low |
| **QR/Activation** | qr_code, qr_code_url, activation_code | Critical | Once | Medium |
| **Fraud** | fraudBlocked, blockedCard, riskScore | Critical | Once | Low |
| **Plan Snapshot** | planName, data_amount, validity | Medium | Once | Medium |
| **Usage** | remaining_mb, status, expired_at | Low | Frequent (API) | High |
| **Lifecycle** | status, activatedAt, expiredAt | Medium | Rare | High |

---

## 5. Storage Options Comparison: Purchased SIMs

### 5.1 Option A: Firebase-Only

```
┌────────────────────────────────────────────┐
│              FIREBASE ONLY                  │
├────────────────────────────────────────────┤
│  orders/{orderId}                           │
│  └── All fields (payment, QR, usage, etc.) │
│                                            │
│  users/{uid}/esims/{orderId}               │
│  └── Copy of order for user queries        │
└────────────────────────────────────────────┘
```

| Criterion | Score | Analysis |
|-----------|-------|----------|
| **Fraud Risk** | ✅ Low | All sensitive data in one secure system |
| **Read Performance** | ⚠️ Medium | No complex queries, no aggregations |
| **Data Consistency** | ✅ High | Single source of truth |
| **Operational Complexity** | ✅ Low | No sync required |
| **Analytics Capability** | ❌ Poor | No SQL, no joins |
| **Frontend Performance** | ⚠️ Medium | Real-time OK, batch queries slow |

**Best For:** Current state, simple dashboard needs.

### 5.2 Option B: Supabase-Only

```
┌────────────────────────────────────────────┐
│             SUPABASE ONLY                   │
├────────────────────────────────────────────┤
│  purchased_esims                            │
│  └── All fields including QR, payment      │
│                                            │
│  esim_usage_snapshots                       │
│  └── Periodic usage data cache             │
└────────────────────────────────────────────┘
```

| Criterion | Score | Analysis |
|-----------|-------|----------|
| **Fraud Risk** | ❌ High | QR codes, payment data exposed to RLS risks |
| **Read Performance** | ✅ High | Full SQL, indexes, aggregations |
| **Data Consistency** | ⚠️ Medium | Sync lag from webhooks |
| **Operational Complexity** | ⚠️ Medium | Webhook → Supabase pipeline |
| **Analytics Capability** | ✅ Excellent | Full SQL analytics |
| **Frontend Performance** | ✅ High | Optimized for reads |

**Best For:** Not recommended—QR codes are financial instruments.

### 5.3 Option C: Split Storage (Recommended)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPLIT STORAGE MODEL                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   FIREBASE (Source of Truth)        SUPABASE (Read Replica)     │
│   ┌─────────────────────────┐       ┌─────────────────────────┐ │
│   │ orders/{orderId}        │       │ user_esims              │ │
│   │ ├── orderId            ─┼───────┼─► id                    │ │
│   │ ├── userId             ─┼───────┼─► user_id               │ │
│   │ ├── iccid              ─┼───────┼─► iccid                 │ │
│   │ ├── amount             ─┼───────┼─► purchase_price        │ │
│   │ ├── qr_code ❌          │       │                         │ │
│   │ ├── qr_code_url ❌      │       │                         │ │
│   │ ├── activation_code ❌  │       │                         │ │
│   │ ├── stripeSessionId ❌  │       │                         │ │
│   │ ├── paymentStatus       │       │                         │ │
│   │ ├── planName           ─┼───────┼─► plan_name             │ │
│   │ ├── country_code       ─┼───────┼─► country_id            │ │
│   │ ├── data_amount_mb     ─┼───────┼─► data_total_mb         │ │
│   │ ├── validity           ─┼───────┼─► validity_days         │ │
│   │ ├── createdAt          ─┼───────┼─► created_at            │ │
│   │ └── status             ─┼───────┼─► purchase_status       │ │
│   └─────────────────────────┘       │                         │ │
│                                     │ (Supabase-only fields)  │ │
│                                     │ ├── data_remaining_mb   │ │
│                                     │ ├── sim_status          │ │
│                                     │ ├── expired_at          │ │
│                                     │ ├── last_usage_sync     │ │
│                                     │ └── synced_at           │ │
│                                     └─────────────────────────┘ │
│                                                                  │
│   NEVER SYNCED TO SUPABASE:                                     │
│   • qr_code (LPA activation string)                             │
│   • qr_code_url (QR image URL)                                  │
│   • activation_code, matching_id                                │
│   • stripeSessionId, paymentMethodId                            │
│   • Fraud tracking fields                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

| Criterion | Score | Analysis |
|-----------|-------|----------|
| **Fraud Risk** | ✅ Low | Sensitive data stays in Firebase |
| **Read Performance** | ✅ High | Supabase for all display queries |
| **Data Consistency** | ✅ Good | Clear ownership, one-way sync |
| **Operational Complexity** | ⚠️ Medium | Sync job required |
| **Analytics Capability** | ✅ Excellent | SQL on Supabase replica |
| **Frontend Performance** | ✅ High | Optimized for catalog queries |

---

## 6. Recommended Architecture: Split Storage

### 6.1 Firebase Authoritative Fields (NEVER in Supabase)

| Field | Reason |
|-------|--------|
| `qr_code` | LPA string = financial instrument |
| `qr_code_url` | QR image = financial instrument |
| `activation_code` | Activation credential |
| `matching_id` | Activation credential |
| `smdp_address` | Technical credential |
| `stripeSessionId` | Payment session linkage |
| `paymentMethodId` | PCI-sensitive |
| `fraudBlocked` | Internal fraud state |
| `blockedCard` | Card fingerprint |
| `riskScore` | Internal scoring |

### 6.2 Supabase Replica Fields

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `id` | text PK | orderId | Same as Firebase doc ID |
| `user_id` | text | userId | Auth reference |
| `iccid` | text | iccid | For usage lookups |
| `plan_name` | text | planName | Display |
| `plan_id` | text | packageId | FK to dataplans |
| `country_id` | text | country_code | FK to countries |
| `country_name` | text | country_region | Denormalized |
| `data_total_mb` | integer | data_amount_mb | From purchase |
| `validity_days` | integer | validity | From purchase |
| `purchase_price` | numeric | amount | For display |
| `currency` | text | currency | For display |
| `purchase_status` | text | status | pending/completed |
| `payment_provider` | text | paymentProvider | stripe/coinbase |
| `created_at` | timestamptz | createdAt | Purchase time |
| `synced_at` | timestamptz | — | Sync timestamp |

### 6.3 Supabase-Only Fields (Usage Cache)

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `data_remaining_mb` | integer | Airalo API | Cached from usage endpoint |
| `data_used_mb` | integer | Computed | `total - remaining` |
| `sim_status` | text | Airalo API | ACTIVE, EXPIRED, etc. |
| `expired_at` | timestamptz | Airalo API | Expiration timestamp |
| `remaining_voice` | integer | Airalo API | Voice minutes left |
| `remaining_sms` | integer | Airalo API | SMS left |
| `last_usage_sync` | timestamptz | — | Last API call time |
| `usage_sync_count` | integer | — | API call counter |
| `is_unlimited` | boolean | Airalo API | Data unlimited flag |

### 6.4 Proposed Supabase Schema

```sql
-- ============================================================
-- USER ESIMS TABLE (Read Replica + Usage Cache)
-- ============================================================

CREATE TABLE public.user_esims (
  -- Primary identifiers
  id text NOT NULL,                      -- Same as Firebase orderId
  user_id text NOT NULL,                 -- Firebase Auth UID
  iccid text,                            -- eSIM identifier (null until created)

  -- Plan reference (denormalized for performance)
  plan_id text,                          -- FK to dataplans
  plan_name text NOT NULL,
  country_id text,                       -- FK to countries
  country_name text,
  is_regional boolean DEFAULT false,

  -- Data allocation
  data_total_mb integer NOT NULL,
  validity_days integer NOT NULL,
  has_voice boolean DEFAULT false,
  total_voice_minutes integer DEFAULT 0,
  has_sms boolean DEFAULT false,
  total_sms integer DEFAULT 0,
  is_unlimited boolean DEFAULT false,

  -- Usage cache (from Airalo API)
  data_remaining_mb integer,
  data_used_mb integer GENERATED ALWAYS AS (data_total_mb - COALESCE(data_remaining_mb, data_total_mb)) STORED,
  remaining_voice integer DEFAULT 0,
  remaining_sms integer DEFAULT 0,
  sim_status text DEFAULT 'NOT_ACTIVE',  -- NOT_ACTIVE, ACTIVE, FINISHED, EXPIRED, UNKNOWN
  expired_at timestamp with time zone,
  last_usage_sync timestamp with time zone,
  usage_sync_count integer DEFAULT 0,

  -- Purchase details
  purchase_price numeric NOT NULL,
  currency text DEFAULT 'USD',
  payment_provider text,                 -- stripe, coinbase
  purchase_status text DEFAULT 'pending', -- pending, processing, completed

  -- Lifecycle
  activated_at timestamp with time zone,

  -- Sync metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  synced_at timestamp with time zone DEFAULT now(),

  -- Constraints
  CONSTRAINT user_esims_pkey PRIMARY KEY (id),
  CONSTRAINT user_esims_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.dataplans(id),
  CONSTRAINT user_esims_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id),
  CONSTRAINT user_esims_sim_status_check CHECK (sim_status = ANY (ARRAY[
    'NOT_ACTIVE', 'ACTIVE', 'FINISHED', 'EXPIRED', 'UNKNOWN'
  ])),
  CONSTRAINT user_esims_purchase_status_check CHECK (purchase_status = ANY (ARRAY[
    'pending', 'processing', 'completed', 'failed', 'refunded'
  ]))
);

-- ============================================================
-- INDEXES
-- ============================================================

-- User's eSIM list (dashboard query)
CREATE INDEX idx_user_esims_user_id ON public.user_esims(user_id);
CREATE INDEX idx_user_esims_user_status ON public.user_esims(user_id, sim_status);
CREATE INDEX idx_user_esims_user_created ON public.user_esims(user_id, created_at DESC);

-- Active eSIMs (for usage sync jobs)
CREATE INDEX idx_user_esims_active_sync ON public.user_esims(sim_status, last_usage_sync)
  WHERE sim_status = 'ACTIVE';

-- ICCID lookup (for usage updates)
CREATE INDEX idx_user_esims_iccid ON public.user_esims(iccid) WHERE iccid IS NOT NULL;

-- Analytics queries
CREATE INDEX idx_user_esims_country ON public.user_esims(country_id);
CREATE INDEX idx_user_esims_plan ON public.user_esims(plan_id);
CREATE INDEX idx_user_esims_created_at ON public.user_esims(created_at);

-- Expiration tracking
CREATE INDEX idx_user_esims_expiring ON public.user_esims(expired_at)
  WHERE sim_status = 'ACTIVE';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.user_esims ENABLE ROW LEVEL SECURITY;

-- Users can only see their own eSIMs
CREATE POLICY user_esims_select_own ON public.user_esims
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Service role can do everything (for sync jobs)
CREATE POLICY user_esims_service_all ON public.user_esims
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- USAGE HISTORY TABLE (Optional - for analytics)
-- ============================================================

CREATE TABLE public.esim_usage_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  esim_id text NOT NULL REFERENCES public.user_esims(id),
  iccid text NOT NULL,

  -- Snapshot data
  data_remaining_mb integer,
  data_total_mb integer,
  sim_status text,
  remaining_voice integer,
  remaining_sms integer,

  -- Timestamp
  recorded_at timestamp with time zone DEFAULT now()
);

-- Index for time-series queries
CREATE INDEX idx_usage_history_esim_time
  ON public.esim_usage_history(esim_id, recorded_at DESC);

-- Partition by month for efficient pruning (optional)
-- CREATE TABLE ... PARTITION BY RANGE (recorded_at);
```

---

## 7. Data Flow Architecture

### 7.1 Purchase Flow (Firebase → Supabase)

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   Stripe    │────►│   Webhook    │────►│    Firebase    │
│   Payment   │     │   Handler    │     │    orders/     │
└─────────────┘     └──────┬───────┘     └───────┬────────┘
                           │                     │
                           │ After success       │ Async
                           ▼                     ▼
                    ┌──────────────┐     ┌────────────────┐
                    │    Airalo    │     │   Supabase     │
                    │   Order API  │     │   user_esims   │
                    └──────────────┘     └────────────────┘
```

**Sync Trigger Options:**

1. **Firestore Trigger (Recommended):**
   - Cloud Function on `orders/{orderId}` write
   - Upserts to Supabase when status = 'completed'
   - Sub-second latency

2. **Webhook Extension:**
   - Add Supabase upsert after Firebase write in webhook handler
   - Same transaction context

3. **Periodic Batch Sync:**
   - Cron job every 5 minutes
   - Catches any missed records
   - Reconciliation safety net

### 7.2 Usage Sync Flow (Airalo → Supabase)

```
┌────────────────────────────────────────────────────────────────┐
│                     USAGE SYNC ARCHITECTURE                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌───────────┐      ┌────────────┐      ┌───────────────────┐ │
│   │  Cron Job │─────►│  Supabase  │─────►│  SELECT iccid     │ │
│   │ (5 min)   │      │  Query     │      │  FROM user_esims  │ │
│   └───────────┘      └────────────┘      │  WHERE ACTIVE     │ │
│                                          │  AND sync_stale   │ │
│                                          └─────────┬─────────┘ │
│                                                    │           │
│   ┌────────────────────────────────────────────────▼─────────┐ │
│   │                    FOR EACH ICCID                        │ │
│   │  ┌─────────────┐     ┌─────────────┐     ┌────────────┐ │ │
│   │  │  Airalo API │────►│  Transform  │────►│  Supabase  │ │ │
│   │  │  GET usage  │     │  Response   │     │  UPSERT    │ │ │
│   │  └─────────────┘     └─────────────┘     └────────────┘ │ │
│   └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│   Rate limit: 100 req/min (batch in groups of 50)              │
│   Stale threshold: > 30 minutes since last sync               │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 7.3 QR Code Retrieval Flow (Firebase Only)

```
┌───────────────┐     ┌────────────────┐     ┌────────────────┐
│   Frontend    │────►│   /api/qr-code │────►│    Firebase    │
│   Dashboard   │     │   (Next.js)    │     │ orders/{id}    │
└───────────────┘     └────────────────┘     └───────┬────────┘
                                                     │
                             ┌───────────────────────┘
                             │
                             ▼
                      ┌────────────────┐
                      │  Return QR to  │
                      │  authenticated │
                      │  user only     │
                      └────────────────┘

SECURITY: QR codes NEVER transit through Supabase.
Auth check: Firebase Auth token validates userId matches order.
```

---

## 8. Analytics & Reporting Considerations

### 8.1 Business Intelligence Queries (Supabase)

With user_esims in Supabase, these analytics become trivial:

```sql
-- Daily purchase volume
SELECT DATE(created_at) as date, COUNT(*) as purchases, SUM(purchase_price) as revenue
FROM user_esims
WHERE purchase_status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Popular destinations
SELECT country_name, COUNT(*) as purchases
FROM user_esims
WHERE purchase_status = 'completed'
GROUP BY country_name
ORDER BY purchases DESC
LIMIT 10;

-- User cohort analysis
SELECT
  DATE_TRUNC('month', created_at) as cohort_month,
  COUNT(DISTINCT user_id) as unique_buyers,
  COUNT(*) as total_purchases,
  AVG(purchase_price) as avg_order_value
FROM user_esims
WHERE purchase_status = 'completed'
GROUP BY cohort_month
ORDER BY cohort_month;

-- Usage patterns (for expiration prediction)
SELECT
  CASE
    WHEN data_used_mb::float / data_total_mb < 0.25 THEN 'low'
    WHEN data_used_mb::float / data_total_mb < 0.75 THEN 'medium'
    ELSE 'high'
  END as usage_tier,
  COUNT(*) as esim_count
FROM user_esims
WHERE sim_status = 'ACTIVE'
GROUP BY usage_tier;
```

### 8.2 Fraud Analytics (Firebase → BigQuery)

For fraud analysis, keep data in Firebase/BigQuery pipeline:

- `fraud_tracking_attempts` → BigQuery (real-time stream)
- `fraud_tracking_purchases` → BigQuery
- `fraud_blocklist` → BigQuery

This keeps sensitive fraud signals out of Supabase.

---

## 9. Tradeoffs & Failure Modes

### 9.1 Sync Lag

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Firebase write succeeds, Supabase sync fails | User sees purchase in Firebase but not in Supabase-powered dashboard | Retry queue with exponential backoff |
| Supabase sync delayed > 1 minute | User dashboard shows stale data | Cache Firebase data client-side for immediate feedback |
| Usage sync job fails | Old remaining data displayed | Show "last updated X ago" + manual refresh button |

### 9.2 Stale Reads

| Scenario | Staleness Window | Acceptable? |
|----------|------------------|-------------|
| Price change in Firebase, Supabase stale | Until next sync (max 5 min) | Yes - price validation happens in Firebase |
| eSIM status change | Until usage sync (max 30 min) | Yes - non-critical display |
| Plan disabled in Firebase | Until next sync | Potential issue - could display unavailable plan |

**Mitigation for disabled plans:**
- Push disable events immediately (not just periodic sync)
- Add `is_purchasable` column, default false until explicitly enabled

### 9.3 Reconciliation Requirements

**Daily Reconciliation Job:**
```sql
-- Find mismatches between Firebase and Supabase
-- Run as Cloud Function, compare counts and checksums
```

**Weekly Full Sync:**
- Rebuild Supabase tables from Firebase
- Catch any drift from failed syncs

---

## 10. Recommended Architecture Summary

### Final Ownership Model

| Entity | Firebase Role | Supabase Role |
|--------|---------------|---------------|
| **dataplans** | Source of Truth (transactions) | Read Replica (frontend) |
| **countries** | Source of Truth (sync origin) | Read Replica (frontend) |
| **regions** | Source of Truth | Read Replica |
| **orders** | Source of Truth (ONLY) | Read Replica (display fields only) |
| **user_esims** | Source of Truth (ONLY) | Read Replica + Usage Cache |
| **QR codes** | Source of Truth (ONLY) | ❌ NEVER |
| **fraud_*** | Source of Truth (ONLY) | ❌ NEVER |

### Why Each Piece Lives Where It Does

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA OWNERSHIP SUMMARY                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║                      FIREBASE                              ║  │
│  ║  "If it touches money, fraud, or credentials, it's here" ║  │
│  ╠═══════════════════════════════════════════════════════════╣  │
│  ║  • Payment sessions, amounts, validation                  ║  │
│  ║  • QR codes (financial instruments)                       ║  │
│  ║  • Fraud tracking, blocklists, risk scores                ║  │
│  ║  • Price source-of-truth for transactions                 ║  │
│  ║  • Cloud Functions integration                            ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│                                                                  │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║                      SUPABASE                              ║  │
│  ║  "If a frontend reads it, it should be here"              ║  │
│  ╠═══════════════════════════════════════════════════════════╣  │
│  ║  • Plan catalog (prices for display, not validation)      ║  │
│  ║  • Country/region data for browsing                       ║  │
│  ║  • User's eSIM list (no QR codes)                         ║  │
│  ║  • Usage data cache (remaining MB, status)                ║  │
│  ║  • Analytics-ready denormalized views                     ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Priority

1. **Phase 1 (Immediate):** countries + dataplans sync (already planned)
2. **Phase 2 (Next Sprint):** user_esims table + sync from order webhook
3. **Phase 3 (Following):** Usage sync job (cron or on-demand)
4. **Phase 4 (Future):** Analytics dashboards on Supabase

### Key Safeguards

- QR codes and activation credentials NEVER leave Firebase
- Price validation ALWAYS happens against Firebase, not Supabase
- Fraud tracking remains entirely in Firebase
- Supabase is a read replica—it can be rebuilt from Firebase at any time

---

**Document Version:** 1.0
**Next Review:** After Phase 2 implementation
**Owner:** Data Architecture Team