# Plans Management & Countries Architecture

## Technical Design Document

**Version:** 1.0
**Last Updated:** 2026-01-04
**Author:** Architecture Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Database Design (Supabase)](#2-database-design-supabase)
3. [Translations & Localization Architecture](#3-translations--localization-architecture)
4. [Querying, Search & Filters](#4-querying-search--filters)
5. [UI Structure & Tags](#5-ui-structure--tags)
6. [UI Data Flow & States](#6-ui-data-flow--states)
7. [Component & File Structure](#7-component--file-structure)
8. [Next.js Best Practices](#8-nextjs-best-practices)
9. [Migration Strategy](#9-migration-strategy)

---

## 1. Executive Summary

This document outlines a production-ready architecture for the Plans Management and Countries pages, building upon the existing modular PlansManagement component at `packages/admin-app/src/components/PlansManagement/`.

### Current State Analysis

**Strengths:**
- Well-structured modular components with clear separation of concerns
- Server-side filtering already implemented via `/api/plans`
- Multi-source data support (Supabase, Firebase, Airalo, Topups)
- Translation infrastructure exists (7 languages via OpenAI GPT-4o-mini)

**Gaps to Address:**
- No dedicated translation tables (currently using JSONB columns)
- Regional plan relationships not fully normalized
- Missing translation webhook for automated content updates
- No fallback language cascade implementation

---

## 2. Database Design (Supabase)

### 2.1 Core Tables

#### `regions` (Enhanced)

```sql
CREATE TABLE regions (
    id TEXT PRIMARY KEY,                    -- e.g., 'europe', 'asia', 'global'
    slug TEXT UNIQUE NOT NULL,              -- URL-safe identifier
    name TEXT NOT NULL,                     -- English canonical name
    display_name TEXT,                      -- Human-friendly display
    type TEXT NOT NULL CHECK (type IN ('continent', 'region', 'global', 'special')),
    image_url TEXT,                         -- Airalo-provided image
    display_order INTEGER DEFAULT 0,
    country_count INTEGER DEFAULT 0,        -- Cached count
    plan_count INTEGER DEFAULT 0,           -- Cached count
    min_price NUMERIC(10,2),                -- Cached minimum price
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',            -- Flexible additional data
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_regions_type ON regions(type);
CREATE INDEX idx_regions_active_order ON regions(is_active, display_order);
CREATE INDEX idx_regions_slug ON regions(slug);
```

#### `countries` (Enhanced)

```sql
CREATE TABLE countries (
    id TEXT PRIMARY KEY,                    -- Airalo country ID (slug)
    airalo_id TEXT,                         -- Original Airalo identifier
    slug TEXT UNIQUE NOT NULL,              -- URL-safe: 'united-states'
    name TEXT NOT NULL,                     -- English canonical name
    iso_code CHAR(2) NOT NULL,              -- ISO 3166-1 alpha-2
    iso_code_3 CHAR(3),                     -- ISO 3166-1 alpha-3

    -- Display
    image_url TEXT,                         -- Airalo flag/image (ONLY source)
    flag_emoji TEXT,                        -- Unicode flag emoji

    -- Relationships
    region_id TEXT REFERENCES regions(id),
    continent TEXT,                         -- Derived from region

    -- Cached Aggregates
    plan_count INTEGER DEFAULT 0,
    topup_count INTEGER DEFAULT 0,
    min_price NUMERIC(10,2),
    max_data_gb NUMERIC(10,2),

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_popular BOOLEAN DEFAULT false,
    popularity_rank INTEGER,

    -- Metadata
    timezone TEXT,
    currency_code CHAR(3),
    phone_prefix TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search and filtering
CREATE INDEX idx_countries_region ON countries(region_id);
CREATE INDEX idx_countries_active ON countries(is_active);
CREATE INDEX idx_countries_popular ON countries(is_popular, popularity_rank);
CREATE INDEX idx_countries_iso ON countries(iso_code);
CREATE INDEX idx_countries_name_search ON countries USING gin(to_tsvector('english', name));
CREATE INDEX idx_countries_slug ON countries(slug);
```

#### `plans` (Country-Level Plans)

```sql
CREATE TABLE plans (
    id TEXT PRIMARY KEY,                    -- Airalo package slug
    airalo_package_id TEXT UNIQUE,          -- Original Airalo package ID
    slug TEXT NOT NULL,

    -- Classification
    plan_type TEXT NOT NULL CHECK (plan_type IN ('country', 'regional', 'global')),
    package_type TEXT NOT NULL CHECK (package_type IN ('sim', 'topup')),

    -- Relationships
    country_id TEXT REFERENCES countries(id),  -- NULL for regional/global
    region_id TEXT REFERENCES regions(id),     -- For regional plans

    -- Display
    name TEXT NOT NULL,
    title TEXT,
    short_info TEXT,

    -- Data Specs
    data_amount_mb INTEGER NOT NULL,
    data_display TEXT NOT NULL,             -- "5 GB", "Unlimited"
    is_unlimited BOOLEAN DEFAULT false,
    validity_days INTEGER NOT NULL,

    -- Communication Features
    has_voice BOOLEAN DEFAULT false,
    voice_minutes INTEGER DEFAULT 0,
    has_sms BOOLEAN DEFAULT false,
    sms_count INTEGER DEFAULT 0,

    -- Pricing (USD)
    price NUMERIC(10,2) NOT NULL,           -- Customer price
    net_price NUMERIC(10,2) NOT NULL,       -- Airalo cost
    original_price NUMERIC(10,2),
    currency CHAR(3) DEFAULT 'USD',

    -- Operator
    operator_id TEXT,
    operator_name TEXT,
    operator_image_url TEXT,
    operator_style TEXT,                    -- 'light' or 'dark'
    operator_gradient_start TEXT,
    operator_gradient_end TEXT,

    -- Technical
    apn_type TEXT,
    apn_value TEXT,
    activation_policy TEXT,
    fair_usage_policy TEXT,

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'out_of_stock', 'deprecated')),
    is_enabled BOOLEAN DEFAULT true,
    provider TEXT DEFAULT 'airalo',

    -- Regional Coverage (for regional/global plans)
    covered_countries_count INTEGER DEFAULT 0,

    -- Timestamps
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comprehensive indexes
CREATE INDEX idx_plans_country ON plans(country_id);
CREATE INDEX idx_plans_region ON plans(region_id);
CREATE INDEX idx_plans_type ON plans(plan_type);
CREATE INDEX idx_plans_package_type ON plans(package_type);
CREATE INDEX idx_plans_status ON plans(status, is_enabled);
CREATE INDEX idx_plans_price ON plans(price);
CREATE INDEX idx_plans_data ON plans(data_amount_mb);
CREATE INDEX idx_plans_validity ON plans(validity_days);
CREATE INDEX idx_plans_features ON plans(has_voice, has_sms);
CREATE INDEX idx_plans_name_search ON plans USING gin(to_tsvector('english', name || ' ' || COALESCE(title, '')));

-- Composite indexes for common queries
CREATE INDEX idx_plans_country_active ON plans(country_id, status, is_enabled) WHERE status = 'active';
CREATE INDEX idx_plans_regional_active ON plans(plan_type, status) WHERE plan_type IN ('regional', 'global');
```

#### `regional_plans` (Regional/Global Plan Details)

```sql
CREATE TABLE regional_plans (
    id TEXT PRIMARY KEY REFERENCES plans(id) ON DELETE CASCADE,

    -- Display overrides
    display_name TEXT,
    marketing_name TEXT,

    -- Coverage type
    coverage_type TEXT CHECK (coverage_type IN ('regional', 'global', 'discover_plus', 'europe_special')),

    -- Cached stats
    country_count INTEGER DEFAULT 0,
    continent_count INTEGER DEFAULT 0,

    -- Feature flags
    is_discover_plus BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    priority_rank INTEGER DEFAULT 0,

    -- Marketing
    highlights TEXT[],                       -- Key selling points
    best_for TEXT,                          -- "Business travelers", "Backpackers"

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_regional_plans_coverage ON regional_plans(coverage_type);
CREATE INDEX idx_regional_plans_discover ON regional_plans(is_discover_plus);
CREATE INDEX idx_regional_plans_featured ON regional_plans(is_featured, priority_rank);
```

#### `regional_plan_countries` (Join Table)

```sql
CREATE TABLE regional_plan_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regional_plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    country_id TEXT NOT NULL REFERENCES countries(id) ON DELETE CASCADE,

    -- Coverage specifics
    network_info TEXT,                      -- Specific networks in this country
    speed_cap TEXT,                         -- Speed limitations if any
    data_cap_mb INTEGER,                    -- Country-specific data cap

    -- Ordering
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(regional_plan_id, country_id)
);

CREATE INDEX idx_rpc_plan ON regional_plan_countries(regional_plan_id);
CREATE INDEX idx_rpc_country ON regional_plan_countries(country_id);
CREATE INDEX idx_rpc_plan_order ON regional_plan_countries(regional_plan_id, display_order);
```

#### `plan_topups` (Mirrors Plans for Topups)

```sql
CREATE TABLE plan_topups (
    id TEXT PRIMARY KEY,
    parent_plan_id TEXT REFERENCES plans(id),  -- Original plan this tops up

    -- Same structure as plans
    country_id TEXT REFERENCES countries(id),
    region_id TEXT REFERENCES regions(id),

    name TEXT NOT NULL,
    data_amount_mb INTEGER NOT NULL,
    data_display TEXT NOT NULL,
    is_unlimited BOOLEAN DEFAULT false,
    validity_days INTEGER NOT NULL,

    price NUMERIC(10,2) NOT NULL,
    net_price NUMERIC(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'USD',

    -- Topup-specific
    requires_active_plan BOOLEAN DEFAULT true,
    compatible_plans TEXT[],                -- Array of compatible plan IDs

    status TEXT DEFAULT 'active',
    is_enabled BOOLEAN DEFAULT true,

    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_topups_country ON plan_topups(country_id);
CREATE INDEX idx_topups_parent ON plan_topups(parent_plan_id);
CREATE INDEX idx_topups_active ON plan_topups(status, is_enabled);
```

### 2.2 Key Queries

#### Distinguish Country vs Regional Plans

```sql
-- Country plans: Has country_id, plan_type = 'country'
SELECT * FROM plans
WHERE plan_type = 'country' AND country_id IS NOT NULL;

-- Regional plans: plan_type IN ('regional', 'global'), no country_id
SELECT * FROM plans
WHERE plan_type IN ('regional', 'global') AND country_id IS NULL;
```

#### Count Included Countries per Regional Plan

```sql
-- Using cached count (fast)
SELECT p.id, p.name, rp.country_count
FROM plans p
JOIN regional_plans rp ON p.id = rp.id
WHERE p.plan_type = 'regional';

-- Real-time count
SELECT
    p.id,
    p.name,
    COUNT(rpc.country_id) as country_count
FROM plans p
LEFT JOIN regional_plan_countries rpc ON p.id = rpc.regional_plan_id
WHERE p.plan_type IN ('regional', 'global')
GROUP BY p.id, p.name;
```

#### Retrieve Full Country Lists for Regional Plan

```sql
SELECT
    c.id,
    c.name,
    c.iso_code,
    c.image_url,
    c.flag_emoji,
    rpc.network_info,
    rpc.speed_cap
FROM regional_plan_countries rpc
JOIN countries c ON rpc.country_id = c.id
WHERE rpc.regional_plan_id = $1
ORDER BY rpc.display_order, c.name;
```

### 2.3 Indexing Strategy Summary

| Index Type | Purpose | Tables |
|------------|---------|--------|
| **B-tree** | Equality/range queries | All primary keys, foreign keys, status fields |
| **GIN** | Full-text search | `countries.name`, `plans.name` |
| **Partial** | Active records only | `WHERE status = 'active'` conditions |
| **Composite** | Multi-column filters | `(country_id, status)`, `(plan_type, is_enabled)` |

---

## 3. Translations & Localization Architecture

### 3.1 Translation Tables

#### `country_translations`

```sql
CREATE TABLE country_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id TEXT NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,      -- ISO 639-1 + optional region: 'en', 'zh-CN'

    -- Translated fields
    name TEXT NOT NULL,
    description TEXT,
    travel_tips TEXT,

    -- Translation metadata
    source TEXT NOT NULL CHECK (source IN ('chatgpt', 'manual', 'imported', 'machine')),
    source_model TEXT,                      -- e.g., 'gpt-4o-mini'
    is_verified BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,        -- Prevent auto-overwrite

    -- Versioning
    version INTEGER DEFAULT 1,
    previous_version_id UUID,

    -- Timestamps
    translated_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(country_id, language_code)
);

CREATE INDEX idx_ct_country ON country_translations(country_id);
CREATE INDEX idx_ct_lang ON country_translations(language_code);
CREATE INDEX idx_ct_country_lang ON country_translations(country_id, language_code);
CREATE INDEX idx_ct_source ON country_translations(source);
CREATE INDEX idx_ct_verified ON country_translations(is_verified);
```

#### `plan_translations`

```sql
CREATE TABLE plan_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,

    -- Translated fields
    name TEXT NOT NULL,
    title TEXT,
    short_info TEXT,
    highlights TEXT[],                      -- Array of translated highlights
    activation_instructions TEXT,
    fair_usage_description TEXT,

    -- Translation metadata
    source TEXT NOT NULL CHECK (source IN ('chatgpt', 'manual', 'imported', 'machine')),
    source_model TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,

    -- Versioning
    version INTEGER DEFAULT 1,
    previous_version_id UUID,

    -- Timestamps
    translated_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(plan_id, language_code)
);

CREATE INDEX idx_pt_plan ON plan_translations(plan_id);
CREATE INDEX idx_pt_lang ON plan_translations(language_code);
CREATE INDEX idx_pt_plan_lang ON plan_translations(plan_id, language_code);
```

#### `regional_plan_translations`

```sql
CREATE TABLE regional_plan_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regional_plan_id TEXT NOT NULL REFERENCES regional_plans(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,

    -- Translated fields
    display_name TEXT NOT NULL,
    marketing_name TEXT,
    description TEXT,
    highlights TEXT[],
    best_for TEXT,
    coverage_summary TEXT,                  -- "Covers 30 countries across Europe"

    -- Translation metadata
    source TEXT NOT NULL CHECK (source IN ('chatgpt', 'manual', 'imported', 'machine')),
    source_model TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,

    version INTEGER DEFAULT 1,
    translated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(regional_plan_id, language_code)
);

CREATE INDEX idx_rpt_plan ON regional_plan_translations(regional_plan_id);
CREATE INDEX idx_rpt_lang ON regional_plan_translations(language_code);
```

#### `translation_jobs` (Queue Management)

```sql
CREATE TABLE translation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Target
    entity_type TEXT NOT NULL CHECK (entity_type IN ('country', 'plan', 'regional_plan', 'region')),
    entity_id TEXT NOT NULL,
    target_languages TEXT[] NOT NULL,       -- Languages to translate to

    -- Job status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
    priority INTEGER DEFAULT 5,             -- 1 = highest

    -- Progress tracking
    languages_completed TEXT[] DEFAULT '{}',
    languages_failed TEXT[] DEFAULT '{}',
    error_message TEXT,

    -- Options
    force_overwrite BOOLEAN DEFAULT false,  -- Overwrite even locked translations
    source_language VARCHAR(5) DEFAULT 'en',

    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Metadata
    triggered_by TEXT,                      -- 'sync', 'manual', 'new_language'
    batch_id UUID                           -- Group related jobs
);

CREATE INDEX idx_tj_status ON translation_jobs(status, priority);
CREATE INDEX idx_tj_entity ON translation_jobs(entity_type, entity_id);
CREATE INDEX idx_tj_batch ON translation_jobs(batch_id);
```

### 3.2 ChatGPT Translation Webhook Service

#### API Route: `/api/translations/webhook`

```typescript
// packages/admin-app/app/api/translations/webhook/route.ts

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'ar', name: 'Arabic', native: 'العربية', rtl: true },
  { code: 'he', name: 'Hebrew', native: 'עברית', rtl: true },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
];

interface TranslationRequest {
  entity_type: 'country' | 'plan' | 'regional_plan';
  entity_id: string;
  target_languages?: string[];  // If not provided, translate to all
  force_overwrite?: boolean;
  source_language?: string;
}

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const body: TranslationRequest = await request.json();
  const {
    entity_type,
    entity_id,
    target_languages = SUPPORTED_LANGUAGES.map(l => l.code),
    force_overwrite = false,
    source_language = 'en'
  } = body;

  // 1. Fetch source content
  const sourceContent = await fetchSourceContent(supabase, entity_type, entity_id);
  if (!sourceContent) {
    return Response.json({ error: 'Entity not found' }, { status: 404 });
  }

  // 2. Get existing translations to check locks
  const existingTranslations = await getExistingTranslations(
    supabase,
    entity_type,
    entity_id
  );

  // 3. Filter languages (skip locked unless force_overwrite)
  const languagesToTranslate = target_languages.filter(lang => {
    if (lang === source_language) return false;
    const existing = existingTranslations.find(t => t.language_code === lang);
    if (existing?.is_locked && !force_overwrite) return false;
    return true;
  });

  // 4. Generate translations
  const results = {
    success: [] as string[],
    skipped: [] as string[],
    failed: [] as string[],
  };

  for (const targetLang of languagesToTranslate) {
    try {
      const translation = await generateTranslation(
        openai,
        sourceContent,
        entity_type,
        targetLang
      );

      // 5. Upsert translation
      await upsertTranslation(
        supabase,
        entity_type,
        entity_id,
        targetLang,
        translation,
        existingTranslations.find(t => t.language_code === targetLang)
      );

      results.success.push(targetLang);
    } catch (error) {
      results.failed.push(targetLang);
      console.error(`Translation failed for ${targetLang}:`, error);
    }
  }

  return Response.json({
    entity_type,
    entity_id,
    results,
    timestamp: new Date().toISOString(),
  });
}

async function generateTranslation(
  openai: OpenAI,
  sourceContent: Record<string, any>,
  entityType: string,
  targetLang: string
) {
  const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === targetLang);

  const prompt = buildTranslationPrompt(sourceContent, entityType, langInfo);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a professional translator specializing in travel and telecommunications content.
Translate the following content to ${langInfo?.name} (${langInfo?.native}).
- Maintain the original meaning and tone
- Use natural, native-sounding language
- Keep technical terms consistent
- Preserve any formatting or special characters
- Return ONLY valid JSON matching the input structure`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,  // Lower for more consistent translations
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

function buildTranslationPrompt(
  content: Record<string, any>,
  entityType: string,
  langInfo: any
): string {
  const fieldsToTranslate = getTranslatableFields(entityType);

  const sourceObj: Record<string, any> = {};
  for (const field of fieldsToTranslate) {
    if (content[field]) {
      sourceObj[field] = content[field];
    }
  }

  return JSON.stringify(sourceObj, null, 2);
}

function getTranslatableFields(entityType: string): string[] {
  switch (entityType) {
    case 'country':
      return ['name', 'description', 'travel_tips'];
    case 'plan':
      return ['name', 'title', 'short_info', 'highlights', 'activation_instructions'];
    case 'regional_plan':
      return ['display_name', 'marketing_name', 'description', 'highlights', 'best_for', 'coverage_summary'];
    default:
      return ['name'];
  }
}

async function upsertTranslation(
  supabase: any,
  entityType: string,
  entityId: string,
  langCode: string,
  translation: Record<string, any>,
  existing: any
) {
  const tableName = `${entityType}_translations`.replace('_', '');
  const idColumn = `${entityType}_id`;

  const data = {
    [idColumn]: entityId,
    language_code: langCode,
    ...translation,
    source: 'chatgpt',
    source_model: 'gpt-4o-mini',
    version: existing ? existing.version + 1 : 1,
    previous_version_id: existing?.id,
    last_updated_at: new Date().toISOString(),
  };

  await supabase
    .from(tableName)
    .upsert(data, { onConflict: `${idColumn},language_code` });
}
```

### 3.3 Translation Webhook Triggers

#### On New Content Added

```typescript
// packages/admin-app/app/api/sync-to-supabase/route.ts (enhanced)

// After upserting new/updated plans:
async function triggerTranslations(newOrUpdatedIds: string[], entityType: string) {
  const TRANSLATION_WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/translations/webhook`;

  // Batch into groups of 10 for rate limiting
  const batches = chunk(newOrUpdatedIds, 10);

  for (const batch of batches) {
    await Promise.all(
      batch.map(id =>
        fetch(TRANSLATION_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity_type: entityType,
            entity_id: id,
            force_overwrite: false, // Respect locked translations
          }),
        })
      )
    );

    // Rate limit: wait between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

#### Re-run for New Languages

```typescript
// packages/admin-app/app/api/translations/add-language/route.ts

export async function POST(request: Request) {
  const { new_language_code } = await request.json();

  const supabase = createClient(/*...*/);

  // Get all entities that need translation
  const [countries, plans, regionalPlans] = await Promise.all([
    supabase.from('countries').select('id').eq('is_active', true),
    supabase.from('plans').select('id').eq('status', 'active'),
    supabase.from('regional_plans').select('id'),
  ]);

  // Queue translation jobs
  const jobs = [
    ...countries.data.map(c => ({ entity_type: 'country', entity_id: c.id })),
    ...plans.data.map(p => ({ entity_type: 'plan', entity_id: p.id })),
    ...regionalPlans.data.map(rp => ({ entity_type: 'regional_plan', entity_id: rp.id })),
  ];

  // Insert into translation_jobs table for background processing
  await supabase.from('translation_jobs').insert(
    jobs.map(job => ({
      ...job,
      target_languages: [new_language_code],
      triggered_by: 'new_language',
      batch_id: crypto.randomUUID(),
    }))
  );

  return Response.json({
    message: `Queued ${jobs.length} translation jobs for ${new_language_code}`,
    batch_size: jobs.length
  });
}
```

### 3.4 Caching & Fallback Strategy

```typescript
// packages/shared/utils/translations.ts

interface TranslationCache {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

const cache: TranslationCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getTranslatedContent<T>(
  supabase: any,
  entityType: 'country' | 'plan' | 'regional_plan',
  entityId: string,
  preferredLang: string,
  fallbackLang: string = 'en'
): Promise<T> {
  const cacheKey = `${entityType}:${entityId}:${preferredLang}`;

  // Check cache
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
    return cache[cacheKey].data;
  }

  // Try preferred language
  let translation = await fetchTranslation(supabase, entityType, entityId, preferredLang);

  // Fallback cascade: preferred -> fallback -> base entity
  if (!translation && preferredLang !== fallbackLang) {
    translation = await fetchTranslation(supabase, entityType, entityId, fallbackLang);
  }

  // Ultimate fallback: use base entity fields
  if (!translation) {
    translation = await fetchBaseEntity(supabase, entityType, entityId);
  }

  // Cache result
  cache[cacheKey] = { data: translation, timestamp: Date.now() };

  return translation;
}

// Language-aware query helper
export function withTranslation(query: any, preferredLang: string, fallbackLang: string = 'en') {
  return query.select(`
    *,
    translations:${query.tableName}_translations!left(
      *
    )
  `);
}
```

---

## 4. Querying, Search & Filters

### 4.1 Server-Side Query Architecture

All filtering, searching, and pagination runs on Supabase to handle large datasets efficiently.

#### Enhanced `/api/plans` Route

```typescript
// packages/admin-app/app/api/plans/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const revalidate = 30; // Cache for 30 seconds

interface PlansQueryParams {
  // Search
  search?: string;

  // Filters
  country?: string;
  region?: string;
  plan_type?: 'country' | 'regional' | 'global' | 'all';
  package_type?: 'sim' | 'topup' | 'all';
  has_voice?: boolean;
  has_sms?: boolean;
  min_data_mb?: number;
  max_price?: number;
  status?: 'active' | 'all';

  // Localization
  lang?: string;

  // Pagination
  page?: number;
  limit?: number;

  // Sorting
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

const VALID_SORT_COLUMNS = [
  'name', 'price', 'data_amount_mb', 'validity_days',
  'created_at', 'covered_countries_count'
];

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const searchParams = request.nextUrl.searchParams;
  const params: PlansQueryParams = {
    search: searchParams.get('search') || undefined,
    country: searchParams.get('country') || undefined,
    region: searchParams.get('region') || undefined,
    plan_type: searchParams.get('plan_type') as any || 'all',
    package_type: searchParams.get('package_type') as any || 'sim',
    has_voice: searchParams.get('has_voice') === 'true',
    has_sms: searchParams.get('has_sms') === 'true',
    min_data_mb: searchParams.get('min_data_mb') ? parseInt(searchParams.get('min_data_mb')!) : undefined,
    max_price: searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined,
    status: searchParams.get('status') as any || 'active',
    lang: searchParams.get('lang') || 'en',
    page: parseInt(searchParams.get('page') || '1'),
    limit: Math.min(parseInt(searchParams.get('limit') || '25'), 100),
    sort_by: searchParams.get('sort_by') || 'name',
    sort_dir: searchParams.get('sort_dir') as any || 'asc',
  };

  // Build base query with translations
  let query = supabase
    .from('plans')
    .select(`
      *,
      country:countries!plans_country_id_fkey(
        id, name, iso_code, image_url, flag_emoji
      ),
      region:regions!plans_region_id_fkey(
        id, name, display_name
      ),
      regional_info:regional_plans!left(
        coverage_type, country_count, is_discover_plus, highlights
      ),
      translation:plan_translations!left(
        name, title, short_info, highlights
      )
    `, { count: 'exact' });

  // Apply language filter for translations
  query = query.or(`language_code.eq.${params.lang},language_code.is.null`,
    { foreignTable: 'plan_translations' });

  // Apply filters
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,title.ilike.%${params.search}%`);
  }

  if (params.country && params.country !== 'all') {
    query = query.eq('country_id', params.country);
  }

  if (params.region && params.region !== 'all') {
    query = query.eq('region_id', params.region);
  }

  if (params.plan_type && params.plan_type !== 'all') {
    query = query.eq('plan_type', params.plan_type);
  }

  if (params.package_type && params.package_type !== 'all') {
    query = query.eq('package_type', params.package_type);
  }

  if (params.has_voice) {
    query = query.eq('has_voice', true);
  }

  if (params.has_sms) {
    query = query.eq('has_sms', true);
  }

  if (params.min_data_mb) {
    query = query.gte('data_amount_mb', params.min_data_mb);
  }

  if (params.max_price) {
    query = query.lte('price', params.max_price);
  }

  if (params.status === 'active') {
    query = query.eq('status', 'active').eq('is_enabled', true);
  }

  // Apply sorting
  const sortColumn = VALID_SORT_COLUMNS.includes(params.sort_by!)
    ? params.sort_by
    : 'name';
  query = query.order(sortColumn!, { ascending: params.sort_dir === 'asc' });

  // Apply pagination
  const from = (params.page! - 1) * params.limit!;
  const to = from + params.limit! - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Transform data: apply translation fallback
  const transformedData = data?.map(plan => ({
    ...plan,
    // Use translation if available, fallback to base
    display_name: plan.translation?.[0]?.name || plan.name,
    display_title: plan.translation?.[0]?.title || plan.title,
    display_short_info: plan.translation?.[0]?.short_info || plan.short_info,
    // Tag derivation
    tags: deriveTags(plan),
  }));

  return Response.json({
    data: transformedData,
    pagination: {
      page: params.page,
      limit: params.limit,
      total: count,
      totalPages: Math.ceil((count || 0) / params.limit!),
    },
    filters_applied: params,
  });
}

function deriveTags(plan: any): string[] {
  const tags: string[] = [];

  if (plan.plan_type === 'global') tags.push('Global');
  if (plan.plan_type === 'regional') tags.push('Regional');
  if (plan.regional_info?.is_discover_plus) tags.push('Discover+');
  if (plan.has_voice) tags.push('Voice');
  if (plan.has_sms) tags.push('SMS');
  if (plan.is_unlimited) tags.push('Unlimited');
  if (plan.regional_info?.country_count > 20) tags.push('Multi-Country');

  return tags;
}
```

### 4.2 UI Search Input Mapping

```typescript
// packages/admin-app/src/components/PlansManagement/hooks/useFilters.ts

export interface FilterState {
  search: string;
  country: string;
  region: string;
  planType: 'country' | 'regional' | 'global' | 'all';
  packageType: 'sim' | 'topup' | 'all';
  hasVoice: boolean;
  hasSms: boolean;
  minData: number | null;
  maxPrice: number | null;
  language: string;
}

export function filtersToQueryParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.country !== 'all') params.set('country', filters.country);
  if (filters.region !== 'all') params.set('region', filters.region);
  if (filters.planType !== 'all') params.set('plan_type', filters.planType);
  if (filters.packageType !== 'all') params.set('package_type', filters.packageType);
  if (filters.hasVoice) params.set('has_voice', 'true');
  if (filters.hasSms) params.set('has_sms', 'true');
  if (filters.minData) params.set('min_data_mb', String(filters.minData));
  if (filters.maxPrice) params.set('max_price', String(filters.maxPrice));
  params.set('lang', filters.language);

  return params;
}
```

---

## 5. UI Structure & Tags

### 5.1 Countries Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Countries                                    [Search...]  🔄   │
├─────────────────────────────────────────────────────────────────┤
│  Filters: [Region ▼] [Has Plans ▼] [Sort: Alphabetical ▼]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │ 🇺🇸         │  │ 🇬🇧         │  │ 🇯🇵         │                │
│  │ [Airalo    │  │ [Airalo    │  │ [Airalo    │                │
│  │  Image]    │  │  Image]    │  │  Image]    │                │
│  │            │  │            │  │            │                │
│  │ United     │  │ United     │  │ Japan      │                │
│  │ States     │  │ Kingdom    │  │            │                │
│  │            │  │            │  │            │                │
│  │ 45 Plans   │  │ 32 Plans   │  │ 28 Plans   │                │
│  │ From $4.50 │  │ From $5.00 │  │ From $6.00 │                │
│  │            │  │            │  │            │                │
│  │ [Popular]  │  │ [Popular]  │  │            │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│                                                                 │
│  Pagination: [1] [2] [3] ... [15]  Showing 1-24 of 350         │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Airalo-provided images ONLY (no external sources)
- Plan count and minimum price prominently displayed
- "Popular" badge for popular countries
- Clickable to view all plans for that country

### 5.2 Regional Plans Display

```
┌─────────────────────────────────────────────────────────────────┐
│  Regional Plans                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [Operator Gradient Background]                           │  │
│  │                                                          │  │
│  │  Europe+                           [Regional] [Discover+]│  │
│  │  30 Countries Included                                   │  │
│  │                                                          │  │
│  │  • 5GB Data  • 30 Days  • Voice ✓  • SMS ✓              │  │
│  │                                                          │  │
│  │  $24.99                                                  │  │
│  │                                                          │  │
│  │  [View Countries ▼]                     [See All Plans]  │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │ 🇫🇷 France  🇩🇪 Germany  🇮🇹 Italy  🇪🇸 Spain      │   │  │
│  │  │ 🇳🇱 Netherlands  🇧🇪 Belgium  🇦🇹 Austria  +22    │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Tag Definitions (Deterministic):**

| Tag | Condition | Display |
|-----|-----------|---------|
| `Regional` | `plan_type === 'regional'` | Blue badge |
| `Global` | `plan_type === 'global'` | Purple badge |
| `Discover+` | `regional_info.is_discover_plus === true` | Gold badge |
| `Voice` | `has_voice === true` | Green badge |
| `SMS` | `has_sms === true` | Green badge |
| `Unlimited` | `is_unlimited === true` | Orange badge |
| `Multi-Country` | `covered_countries_count > 20` | Blue outline |

### 5.3 Plans Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Plans Management                                               │
├─────────────────────────────────────────────────────────────────┤
│  [Country Plans] [Regional Plans] [Global] [Topups]            │
├─────────────────────────────────────────────────────────────────┤
│  Search: [____________]  Country: [All ▼]  Region: [All ▼]     │
│  Data: [Min ▼]  Price: [Max ▼]  [Voice ☐] [SMS ☐]  [Apply]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  COUNTRY PLANS (Default View)                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Name          │ Country │ Data  │ Days │ Price │ Tags   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ US T-Mobile   │ 🇺🇸 US   │ 5 GB  │ 30   │ $9.99 │        │   │
│  │ US Unlimited  │ 🇺🇸 US   │ ∞     │ 30   │ $19.99│[Unlim] │   │
│  │ UK 10GB       │ 🇬🇧 UK   │ 10 GB │ 30   │ $12.99│[Voice] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  REGIONAL PLANS (Tab Selected)                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Name           │ Coverage    │ Data  │ Price │ Tags     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Europe+        │ 30 countries│ 5 GB  │ $24.99│[Regional]│   │
│  │ Asia Explorer  │ 15 countries│ 3 GB  │ $19.99│[Discover+]│  │
│  │ Global Connect │ 95 countries│ 1 GB  │ $29.99│[Global]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Pagination: ◀ [1] 2 3 ... 50 ▶   Rows: [25 ▼]                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. UI Data Flow & States

### 6.1 State Machine

```
                    ┌─────────────┐
                    │   INITIAL   │
                    └──────┬──────┘
                           │
                    Auto-fetch on mount
                           │
                           ▼
                    ┌─────────────┐
           ┌───────│   LOADING   │───────┐
           │       └─────────────┘       │
           │                             │
      Success                         Error
           │                             │
           ▼                             ▼
    ┌─────────────┐              ┌─────────────┐
    │   SUCCESS   │              │    ERROR    │
    │  (Data)     │              │  (Message)  │
    └──────┬──────┘              └──────┬──────┘
           │                             │
    User applies                 Show "Retry" +
    new filters                  "Fetch from Airalo"
           │                             │
           ▼                             ▼
    ┌─────────────┐              ┌─────────────┐
    │  FILTERING  │              │  RECOVERY   │
    │  (Loading)  │              │   MODE      │
    └─────────────┘              └─────────────┘
           │                             │
           ▼                             │
    Back to SUCCESS              Airalo sync success
           │                             │
           └─────────────────────────────┘
```

### 6.2 Component State Definitions

```typescript
// packages/admin-app/src/components/PlansManagement/types.ts

export type DataState =
  | { status: 'initial' }
  | { status: 'loading'; message?: string }
  | { status: 'success'; data: Plan[]; pagination: Pagination }
  | { status: 'empty'; message: string }
  | { status: 'error'; error: string; canRetry: boolean }
  | { status: 'recovery'; message: string };

export type FetchSource = 'supabase' | 'airalo';

export interface UIStateConfig {
  showRefreshButton: boolean;      // Always visible in header
  showFetchFromSupabase: boolean;  // Only in error/recovery
  showFetchFromAiralo: boolean;    // Only in error/recovery (admin only)
  showFilters: boolean;            // Hidden during loading/error
  showPagination: boolean;         // Only when data exists
}

export function getUIConfig(state: DataState): UIStateConfig {
  switch (state.status) {
    case 'initial':
    case 'loading':
      return {
        showRefreshButton: false,
        showFetchFromSupabase: false,
        showFetchFromAiralo: false,
        showFilters: false,
        showPagination: false,
      };
    case 'success':
      return {
        showRefreshButton: true,
        showFetchFromSupabase: false,  // Not needed - data loaded
        showFetchFromAiralo: false,
        showFilters: true,
        showPagination: true,
      };
    case 'empty':
      return {
        showRefreshButton: true,
        showFetchFromSupabase: false,
        showFetchFromAiralo: false,
        showFilters: true,
        showPagination: false,
      };
    case 'error':
    case 'recovery':
      return {
        showRefreshButton: true,
        showFetchFromSupabase: true,   // Fallback option
        showFetchFromAiralo: true,     // Recovery action
        showFilters: false,
        showPagination: false,
      };
  }
}
```

### 6.3 Data Flow Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                     NORMAL FLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Component mounts                                            │
│     └─▶ usePlansData hook initializes                          │
│         └─▶ Auto-fetch from Supabase API                       │
│                                                                 │
│  2. User changes filters                                        │
│     └─▶ UI state updates (debounced)                           │
│         └─▶ User clicks "Apply"                                │
│             └─▶ API call with new params                       │
│                 └─▶ Results displayed                          │
│                                                                 │
│  3. User changes page/sort                                      │
│     └─▶ Immediate API call (no Apply needed)                   │
│         └─▶ Results displayed                                  │
│                                                                 │
│  4. User clicks Refresh                                         │
│     └─▶ Re-fetch with current filters                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     ERROR RECOVERY FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Supabase fetch fails                                        │
│     └─▶ Error state displayed                                  │
│         └─▶ "Retry" button shown                               │
│         └─▶ "Fetch from Airalo" button shown                   │
│                                                                 │
│  2. User clicks "Fetch from Airalo"                            │
│     └─▶ Airalo API called                                      │
│         └─▶ Data synced to Supabase                            │
│             └─▶ Normal flow resumes                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Translation Consistency

```typescript
// packages/admin-app/src/components/PlansManagement/hooks/useTranslatedContent.ts

export function useTranslatedContent(language: string) {
  const [contentCache, setContentCache] = useState<Map<string, any>>(new Map());

  const getTranslated = useCallback((
    entity: any,
    fields: string[]
  ) => {
    // Priority: translation > base content
    const translation = entity.translation?.[0];

    const result: Record<string, any> = {};
    for (const field of fields) {
      result[field] = translation?.[field] || entity[field];
    }

    return result;
  }, []);

  // Ensure consistent translation display
  const applyTranslations = useCallback((plans: Plan[]) => {
    return plans.map(plan => ({
      ...plan,
      ...getTranslated(plan, ['name', 'title', 'short_info']),
      country: plan.country ? {
        ...plan.country,
        ...getTranslated(plan.country, ['name']),
      } : null,
    }));
  }, [getTranslated]);

  return { applyTranslations, getTranslated };
}
```

---

## 7. Component & File Structure

### 7.1 Proposed Directory Structure

```
packages/admin-app/
├── app/
│   ├── api/
│   │   ├── plans/
│   │   │   ├── route.ts                 # GET plans with filters
│   │   │   ├── [id]/route.ts            # Single plan CRUD
│   │   │   └── countries/route.ts       # Distinct countries
│   │   ├── countries/
│   │   │   ├── route.ts                 # GET countries list
│   │   │   └── [id]/route.ts            # Single country
│   │   ├── regional-plans/
│   │   │   ├── route.ts                 # GET regional plans
│   │   │   └── [id]/countries/route.ts  # Countries for regional plan
│   │   ├── translations/
│   │   │   ├── webhook/route.ts         # ChatGPT translation
│   │   │   ├── add-language/route.ts    # Add new language
│   │   │   └── jobs/route.ts            # Translation job status
│   │   └── sync-to-supabase/
│   │       └── route.ts                 # Airalo → Supabase sync
│   │
│   ├── (dashboard)/
│   │   ├── plans/
│   │   │   ├── page.tsx                 # Plans page (Server Component)
│   │   │   └── loading.tsx              # Loading skeleton
│   │   ├── countries/
│   │   │   ├── page.tsx                 # Countries page
│   │   │   ├── [slug]/page.tsx          # Country detail
│   │   │   └── loading.tsx
│   │   └── translations/
│   │       └── page.tsx                 # Translation management
│   │
│   └── layout.tsx
│
├── src/
│   ├── components/
│   │   ├── PlansManagement/
│   │   │   ├── index.ts                 # Barrel export
│   │   │   ├── PlansManagement.tsx      # Main container
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── Header/
│   │   │   │   │   ├── PlansHeader.tsx
│   │   │   │   │   └── SyncButtons.tsx
│   │   │   │   │
│   │   │   │   ├── Filters/
│   │   │   │   │   ├── PlansSearch.tsx
│   │   │   │   │   ├── PlansFilters.tsx
│   │   │   │   │   ├── FilterChips.tsx
│   │   │   │   │   └── FilterDropdown.tsx
│   │   │   │   │
│   │   │   │   ├── Tables/
│   │   │   │   │   ├── PlansTable.tsx       # Main table
│   │   │   │   │   ├── CountryPlansTable.tsx
│   │   │   │   │   ├── RegionalPlansTable.tsx
│   │   │   │   │   └── TopupsTable.tsx
│   │   │   │   │
│   │   │   │   ├── Cards/
│   │   │   │   │   ├── PlanCard.tsx
│   │   │   │   │   ├── RegionalPlanCard.tsx
│   │   │   │   │   └── CountryCard.tsx
│   │   │   │   │
│   │   │   │   ├── Tags/
│   │   │   │   │   ├── PlanTag.tsx
│   │   │   │   │   ├── TagBadge.tsx
│   │   │   │   │   └── tagConfig.ts
│   │   │   │   │
│   │   │   │   ├── Modals/
│   │   │   │   │   ├── SyncModal.tsx
│   │   │   │   │   ├── PlanDetailModal.tsx
│   │   │   │   │   └── CountryListModal.tsx
│   │   │   │   │
│   │   │   │   ├── Status/
│   │   │   │   │   ├── PlansStatusBanner.tsx
│   │   │   │   │   ├── EmptyState.tsx
│   │   │   │   │   ├── ErrorState.tsx
│   │   │   │   │   └── LoadingState.tsx
│   │   │   │   │
│   │   │   │   └── Pagination/
│   │   │   │       └── PlansPagination.tsx
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── usePlansData.ts       # Main data hook
│   │   │   │   ├── useFilters.ts         # Filter state
│   │   │   │   ├── usePagination.ts      # Pagination logic
│   │   │   │   ├── useSort.ts            # Sort state
│   │   │   │   └── useTranslatedContent.ts
│   │   │   │
│   │   │   ├── utils/
│   │   │   │   ├── helpers.ts            # General helpers
│   │   │   │   ├── tagHelpers.ts         # Tag derivation
│   │   │   │   ├── queryBuilders.ts      # Query param builders
│   │   │   │   └── constants.ts          # Constants
│   │   │   │
│   │   │   └── types/
│   │   │       ├── index.ts
│   │   │       ├── plan.ts
│   │   │       ├── country.ts
│   │   │       └── filters.ts
│   │   │
│   │   ├── CountriesManagement/
│   │   │   ├── index.ts
│   │   │   ├── CountriesManagement.tsx
│   │   │   ├── components/
│   │   │   │   ├── CountryGrid.tsx
│   │   │   │   ├── CountryCard.tsx
│   │   │   │   ├── CountryDetail.tsx
│   │   │   │   └── RegionFilter.tsx
│   │   │   └── hooks/
│   │   │       └── useCountriesData.ts
│   │   │
│   │   └── ui/                           # Shared UI primitives
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Dropdown.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       ├── Skeleton.tsx
│   │       ├── Table.tsx
│   │       └── TranslatedText.tsx        # Translation-aware text
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 # Browser client
│   │   │   ├── server.ts                 # Server client
│   │   │   └── queries/
│   │   │       ├── plans.ts              # Plan queries
│   │   │       ├── countries.ts          # Country queries
│   │   │       └── translations.ts       # Translation queries
│   │   │
│   │   └── i18n/
│   │       ├── config.ts                 # Language config
│   │       ├── provider.tsx              # I18n context
│   │       └── hooks.ts                  # useTranslation hook
│   │
│   └── types/
│       └── database.ts                   # Generated Supabase types
│
└── public/
    └── locales/
        ├── en/
        ├── es/
        ├── fr/
        └── ...
```

### 7.2 Server vs Client Component Separation

```typescript
// SERVER COMPONENTS (Default in App Router)
// - Data fetching
// - Direct Supabase access
// - No interactivity

// app/(dashboard)/plans/page.tsx - SERVER
export default async function PlansPage() {
  // Initial data fetch on server
  const initialData = await fetchPlans({ page: 1, limit: 25 });

  return (
    <PlansManagement initialData={initialData} />
  );
}

// CLIENT COMPONENTS ('use client')
// - Interactivity
// - State management
// - Event handlers

// src/components/PlansManagement/PlansManagement.tsx - CLIENT
'use client';

export default function PlansManagement({ initialData }) {
  const { data, filters, setFilters } = usePlansData(initialData);
  // ... interactive logic
}
```

### 7.3 Translation-Aware Text Component

```typescript
// src/components/ui/TranslatedText.tsx
'use client';

import { useI18n } from '@/lib/i18n/hooks';

interface TranslatedTextProps {
  // Base content (English)
  children: string;
  // Translation key or object
  translation?: string | { [lang: string]: string };
  // HTML element
  as?: keyof JSX.IntrinsicElements;
  // Pass through props
  className?: string;
}

export function TranslatedText({
  children,
  translation,
  as: Component = 'span',
  className,
}: TranslatedTextProps) {
  const { language } = useI18n();

  let displayText = children; // Fallback to base

  if (translation) {
    if (typeof translation === 'string') {
      displayText = translation;
    } else if (translation[language]) {
      displayText = translation[language];
    }
  }

  return <Component className={className}>{displayText}</Component>;
}
```

---

## 8. Next.js Best Practices

### 8.1 Server-First Data Fetching

```typescript
// app/(dashboard)/plans/page.tsx

import { createServerClient } from '@/lib/supabase/server';
import { PlansManagement } from '@/components/PlansManagement';

// Enable ISR with revalidation
export const revalidate = 60; // Revalidate every 60 seconds

export default async function PlansPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const supabase = createServerClient();

  // Parse search params for initial load
  const page = parseInt(searchParams.page || '1');
  const lang = searchParams.lang || 'en';

  // Fetch initial data on server
  const { data: plans, count } = await supabase
    .from('plans')
    .select('*, country:countries(*), translation:plan_translations(*)', { count: 'exact' })
    .eq('status', 'active')
    .eq('plan_translations.language_code', lang)
    .range((page - 1) * 25, page * 25 - 1);

  return (
    <PlansManagement
      initialPlans={plans || []}
      initialPagination={{
        page,
        limit: 25,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / 25),
      }}
      initialLanguage={lang}
    />
  );
}
```

### 8.2 Route Handlers with Caching

```typescript
// app/api/plans/route.ts

import { NextRequest, NextResponse } from 'next/server';

// Configure caching
export const dynamic = 'force-dynamic'; // Or 'auto' for smart caching
export const revalidate = 30;

export async function GET(request: NextRequest) {
  // Use Next.js cache
  const cacheKey = request.nextUrl.search;

  try {
    const data = await fetchPlansWithCache(cacheKey);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
```

### 8.3 Parallel Data Fetching

```typescript
// app/(dashboard)/countries/[slug]/page.tsx

export default async function CountryDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  // Parallel fetching for better performance
  const [country, plans, translations] = await Promise.all([
    fetchCountry(params.slug),
    fetchPlansForCountry(params.slug),
    fetchTranslations('country', params.slug),
  ]);

  return (
    <CountryDetail
      country={country}
      plans={plans}
      translations={translations}
    />
  );
}
```

### 8.4 Error Boundaries

```typescript
// app/(dashboard)/plans/error.tsx
'use client';

export default function PlansError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-container">
      <h2>Failed to load plans</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
      <button onClick={() => window.location.href = '/api/sync-to-supabase'}>
        Sync from Airalo
      </button>
    </div>
  );
}
```

### 8.5 Loading States

```typescript
// app/(dashboard)/plans/loading.tsx

import { Skeleton } from '@/components/ui/Skeleton';

export default function PlansLoading() {
  return (
    <div className="plans-skeleton">
      {/* Header skeleton */}
      <Skeleton className="h-10 w-48 mb-4" />

      {/* Filters skeleton */}
      <div className="flex gap-4 mb-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
```

---

## 9. Migration Strategy

### 9.1 Phase 1: Database Schema (Week 1)

1. Create new translation tables
2. Migrate existing JSONB translations to normalized tables
3. Add indexes and constraints
4. Set up RLS policies

```sql
-- Migration script: Existing JSONB → Translation tables
INSERT INTO country_translations (country_id, language_code, name, source)
SELECT
  id,
  lang.key,
  lang.value->>'name',
  'imported'
FROM countries,
LATERAL jsonb_each(translations) AS lang
WHERE translations IS NOT NULL;
```

### 9.2 Phase 2: Translation Webhook (Week 2)

1. Implement ChatGPT webhook endpoint
2. Create translation job queue
3. Backfill existing content
4. Test with new languages

### 9.3 Phase 3: API Enhancement (Week 3)

1. Update `/api/plans` with translation joins
2. Implement language fallback logic
3. Add caching layer
4. Performance testing

### 9.4 Phase 4: UI Updates (Week 4)

1. Implement new component structure
2. Add translation-aware text components
3. Update state management
4. End-to-end testing

---

## Appendix A: SQL Migrations

See [supabase-plans-countries-migrations.sql](./supabase-plans-countries-migrations.sql) for complete migration scripts.

## Appendix B: API Reference

See [API_REFERENCE.md](./API_REFERENCE.md) for complete API documentation.

---

*Document maintained by Architecture Team. Last review: 2026-01-04*
