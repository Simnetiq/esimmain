-- ============================================================================
-- PLANS & COUNTRIES ARCHITECTURE - SUPABASE MIGRATIONS
-- ============================================================================
-- Version: 1.1
-- Date: 2026-01-04
-- Description: Complete database schema for Plans Management with translations
--
-- IMPORTANT: This script is designed to be IDEMPOTENT - safe to run multiple times
-- It will add missing columns/tables without destroying existing data
-- ============================================================================

-- ============================================================================
-- PART 0: PRE-FLIGHT - Add missing columns to existing tables FIRST
-- ============================================================================
-- This must run BEFORE any indexes are created that reference these columns

DO $$
BEGIN
    RAISE NOTICE 'Starting migration - checking existing tables...';

    -- ========== REGIONS TABLE COLUMNS ==========
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'regions') THEN
        RAISE NOTICE 'Regions table exists, checking columns...';

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'slug') THEN
            ALTER TABLE regions ADD COLUMN slug TEXT;
            UPDATE regions SET slug = id WHERE slug IS NULL;
            ALTER TABLE regions ALTER COLUMN slug SET NOT NULL;
            RAISE NOTICE 'Added slug column to regions';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'image_url') THEN
            ALTER TABLE regions ADD COLUMN image_url TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'min_price') THEN
            ALTER TABLE regions ADD COLUMN min_price NUMERIC(10,2);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'is_active') THEN
            ALTER TABLE regions ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'metadata') THEN
            ALTER TABLE regions ADD COLUMN metadata JSONB DEFAULT '{}';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'created_at') THEN
            ALTER TABLE regions ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'updated_at') THEN
            ALTER TABLE regions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;

    -- ========== COUNTRIES TABLE COLUMNS ==========
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'countries') THEN
        RAISE NOTICE 'Countries table exists, checking columns...';

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'is_active') THEN
            ALTER TABLE countries ADD COLUMN is_active BOOLEAN DEFAULT true;
            RAISE NOTICE 'Added is_active column to countries';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'is_popular') THEN
            ALTER TABLE countries ADD COLUMN is_popular BOOLEAN DEFAULT false;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'airalo_id') THEN
            ALTER TABLE countries ADD COLUMN airalo_id TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'iso_code_3') THEN
            ALTER TABLE countries ADD COLUMN iso_code_3 CHAR(3);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'flag_emoji') THEN
            ALTER TABLE countries ADD COLUMN flag_emoji TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'continent') THEN
            ALTER TABLE countries ADD COLUMN continent TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'topup_count') THEN
            ALTER TABLE countries ADD COLUMN topup_count INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'max_data_gb') THEN
            ALTER TABLE countries ADD COLUMN max_data_gb NUMERIC(10,2);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'popularity_rank') THEN
            ALTER TABLE countries ADD COLUMN popularity_rank INTEGER;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'timezone') THEN
            ALTER TABLE countries ADD COLUMN timezone TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'currency_code') THEN
            ALTER TABLE countries ADD COLUMN currency_code CHAR(3);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'phone_prefix') THEN
            ALTER TABLE countries ADD COLUMN phone_prefix TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'metadata') THEN
            ALTER TABLE countries ADD COLUMN metadata JSONB DEFAULT '{}';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'created_at') THEN
            ALTER TABLE countries ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'updated_at') THEN
            ALTER TABLE countries ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;

    -- ========== DATAPLANS TABLE COLUMNS ==========
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dataplans') THEN
        RAISE NOTICE 'Dataplans table exists, checking columns...';

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'plan_type') THEN
            ALTER TABLE dataplans ADD COLUMN plan_type TEXT DEFAULT 'country';
            -- Populate based on existing data
            UPDATE dataplans SET plan_type = 'regional' WHERE is_regional = true;
            UPDATE dataplans SET plan_type = 'global' WHERE plan_category = 'global';
            RAISE NOTICE 'Added plan_type column to dataplans';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'package_type') THEN
            ALTER TABLE dataplans ADD COLUMN package_type TEXT DEFAULT 'sim';
            UPDATE dataplans SET package_type = type WHERE type IS NOT NULL;
            RAISE NOTICE 'Added package_type column to dataplans';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'is_enabled') THEN
            ALTER TABLE dataplans ADD COLUMN is_enabled BOOLEAN DEFAULT true;
            UPDATE dataplans SET is_enabled = COALESCE(enabled, true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'airalo_package_id') THEN
            ALTER TABLE dataplans ADD COLUMN airalo_package_id TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'created_at') THEN
            ALTER TABLE dataplans ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'updated_at') THEN
            ALTER TABLE dataplans ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;

    RAISE NOTICE 'Pre-flight column additions complete!';
END $$;

-- ============================================================================
-- PART 1: CORE TABLES (Create if not exist)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 Regions Table (create if doesn't exist)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS regions (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    display_name TEXT,
    type TEXT DEFAULT 'region',
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    country_count INTEGER DEFAULT 0,
    plan_count INTEGER DEFAULT 0,
    min_price NUMERIC(10,2),
    is_active BOOLEAN DEFAULT true,
    translations JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint on slug if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'regions_slug_key'
    ) THEN
        BEGIN
            ALTER TABLE regions ADD CONSTRAINT regions_slug_key UNIQUE (slug);
        EXCEPTION WHEN duplicate_table THEN
            -- Constraint already exists
        END;
    END IF;
END $$;

-- Indexes for regions (safe to run - IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_regions_type ON regions(type);
CREATE INDEX IF NOT EXISTS idx_regions_slug ON regions(slug);

-- Only create this index if is_active column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'is_active') THEN
        CREATE INDEX IF NOT EXISTS idx_regions_active_order ON regions(is_active, display_order);
    END IF;
END $$;

-- Seed initial regions (upsert)
INSERT INTO regions (id, slug, name, display_name, type, display_order) VALUES
    ('global', 'global', 'Global', 'Global', 'global', 1),
    ('europe', 'europe', 'Europe', 'Europe', 'continent', 2),
    ('asia', 'asia', 'Asia', 'Asia', 'continent', 3),
    ('americas', 'americas', 'Americas', 'Americas', 'continent', 4),
    ('africa', 'africa', 'Africa', 'Africa', 'continent', 5),
    ('oceania', 'oceania', 'Oceania', 'Oceania', 'continent', 6),
    ('middle-east', 'middle-east', 'Middle East', 'Middle East', 'region', 7),
    ('caribbean', 'caribbean', 'Caribbean', 'Caribbean', 'region', 8),
    ('european-union', 'european-union', 'European Union', 'European Union', 'special', 9),
    ('north-america', 'north-america', 'North America', 'North America', 'region', 10),
    ('south-america', 'south-america', 'South America', 'South America', 'region', 11),
    ('latin-america', 'latin-america', 'Latin America', 'Latin America', 'region', 12)
ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug,
    display_name = EXCLUDED.display_name,
    type = EXCLUDED.type,
    display_order = EXCLUDED.display_order;

-- ----------------------------------------------------------------------------
-- 1.2 Countries Table Indexes (columns already added in PART 0)
-- ----------------------------------------------------------------------------

-- Safe index creation - all column checks done in PART 0
DO $$
BEGIN
    -- Basic indexes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'region_id') THEN
        CREATE INDEX IF NOT EXISTS idx_countries_region ON countries(region_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'is_active') THEN
        CREATE INDEX IF NOT EXISTS idx_countries_active ON countries(is_active);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'is_popular')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'popularity_rank') THEN
        CREATE INDEX IF NOT EXISTS idx_countries_popular ON countries(is_popular, popularity_rank);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'iso_code') THEN
        CREATE INDEX IF NOT EXISTS idx_countries_iso ON countries(iso_code);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'slug') THEN
        CREATE INDEX IF NOT EXISTS idx_countries_slug ON countries(slug);
    END IF;

    -- Full-text search index
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'name') THEN
        CREATE INDEX IF NOT EXISTS idx_countries_name_search ON countries USING gin(to_tsvector('english', name));
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1.3 Enhanced Plans Table (dataplans) - Indexes
-- ----------------------------------------------------------------------------
-- Note: Columns already added in PART 0

-- Safe index creation for dataplans
DO $$
BEGIN
    -- Basic indexes (these columns should exist in base schema)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'country_id') THEN
        CREATE INDEX IF NOT EXISTS idx_dataplans_country ON dataplans(country_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'region_id') THEN
        CREATE INDEX IF NOT EXISTS idx_dataplans_region ON dataplans(region_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'plan_type') THEN
        CREATE INDEX IF NOT EXISTS idx_dataplans_plan_type ON dataplans(plan_type);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'package_type') THEN
        CREATE INDEX IF NOT EXISTS idx_dataplans_package_type ON dataplans(package_type);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'status')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'is_enabled') THEN
        CREATE INDEX IF NOT EXISTS idx_dataplans_status ON dataplans(status, is_enabled);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'price') THEN
        CREATE INDEX IF NOT EXISTS idx_dataplans_price ON dataplans(price);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'data_amount_mb') THEN
        CREATE INDEX IF NOT EXISTS idx_dataplans_data ON dataplans(data_amount_mb);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'validity_days') THEN
        CREATE INDEX IF NOT EXISTS idx_dataplans_validity ON dataplans(validity_days);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'has_voice')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'has_sms') THEN
        CREATE INDEX IF NOT EXISTS idx_dataplans_features ON dataplans(has_voice, has_sms);
    END IF;

    -- Full-text search
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'name') THEN
        CREATE INDEX IF NOT EXISTS idx_dataplans_name_search ON dataplans USING gin(to_tsvector('english', name || ' ' || COALESCE(title, '')));
    END IF;

    -- Composite indexes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'country_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'status')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'is_enabled') THEN
        CREATE INDEX IF NOT EXISTS idx_dataplans_country_active ON dataplans(country_id, status, is_enabled)
            WHERE status = 'active';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'plan_type')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_dataplans_regional_active ON dataplans(plan_type, status)
            WHERE plan_type IN ('regional', 'global');
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1.4 Regional Plans Extension Table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS regional_plans (
    id TEXT PRIMARY KEY REFERENCES dataplans(id) ON DELETE CASCADE,
    display_name TEXT,
    marketing_name TEXT,
    coverage_type TEXT CHECK (coverage_type IN ('regional', 'global', 'discover_plus', 'europe_special')),
    country_count INTEGER DEFAULT 0,
    continent_count INTEGER DEFAULT 0,
    is_discover_plus BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    priority_rank INTEGER DEFAULT 0,
    highlights TEXT[],
    best_for TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regional_plans_coverage ON regional_plans(coverage_type);
CREATE INDEX IF NOT EXISTS idx_regional_plans_discover ON regional_plans(is_discover_plus);
CREATE INDEX IF NOT EXISTS idx_regional_plans_featured ON regional_plans(is_featured, priority_rank);

-- ----------------------------------------------------------------------------
-- 1.5 Regional Plan Countries Join Table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS regional_plan_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regional_plan_id TEXT NOT NULL REFERENCES dataplans(id) ON DELETE CASCADE,
    country_id TEXT NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    network_info TEXT,
    speed_cap TEXT,
    data_cap_mb INTEGER,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(regional_plan_id, country_id)
);

CREATE INDEX IF NOT EXISTS idx_rpc_plan ON regional_plan_countries(regional_plan_id);
CREATE INDEX IF NOT EXISTS idx_rpc_country ON regional_plan_countries(country_id);
CREATE INDEX IF NOT EXISTS idx_rpc_plan_order ON regional_plan_countries(regional_plan_id, display_order);

-- ----------------------------------------------------------------------------
-- 1.6 Plan Topups Table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS plan_topups (
    id TEXT PRIMARY KEY,
    parent_plan_id TEXT REFERENCES dataplans(id),
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
    requires_active_plan BOOLEAN DEFAULT true,
    compatible_plans TEXT[],
    status TEXT DEFAULT 'active',
    is_enabled BOOLEAN DEFAULT true,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topups_country ON plan_topups(country_id);
CREATE INDEX IF NOT EXISTS idx_topups_parent ON plan_topups(parent_plan_id);
CREATE INDEX IF NOT EXISTS idx_topups_active ON plan_topups(status, is_enabled);

-- ============================================================================
-- PART 2: TRANSLATION TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 Country Translations
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS country_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id TEXT NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,

    -- Translated fields
    name TEXT NOT NULL,
    description TEXT,
    travel_tips TEXT,

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

    UNIQUE(country_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_ct_country ON country_translations(country_id);
CREATE INDEX IF NOT EXISTS idx_ct_lang ON country_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_ct_country_lang ON country_translations(country_id, language_code);
CREATE INDEX IF NOT EXISTS idx_ct_source ON country_translations(source);
CREATE INDEX IF NOT EXISTS idx_ct_verified ON country_translations(is_verified);

-- ----------------------------------------------------------------------------
-- 2.2 Plan Translations
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS plan_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id TEXT NOT NULL REFERENCES dataplans(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,

    -- Translated fields
    name TEXT NOT NULL,
    title TEXT,
    short_info TEXT,
    highlights TEXT[],
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

CREATE INDEX IF NOT EXISTS idx_pt_plan ON plan_translations(plan_id);
CREATE INDEX IF NOT EXISTS idx_pt_lang ON plan_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_pt_plan_lang ON plan_translations(plan_id, language_code);
CREATE INDEX IF NOT EXISTS idx_pt_source ON plan_translations(source);

-- ----------------------------------------------------------------------------
-- 2.3 Regional Plan Translations
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS regional_plan_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regional_plan_id TEXT NOT NULL REFERENCES regional_plans(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,

    -- Translated fields
    display_name TEXT NOT NULL,
    marketing_name TEXT,
    description TEXT,
    highlights TEXT[],
    best_for TEXT,
    coverage_summary TEXT,

    -- Translation metadata
    source TEXT NOT NULL CHECK (source IN ('chatgpt', 'manual', 'imported', 'machine')),
    source_model TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,

    -- Versioning
    version INTEGER DEFAULT 1,

    -- Timestamps
    translated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(regional_plan_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_rpt_plan ON regional_plan_translations(regional_plan_id);
CREATE INDEX IF NOT EXISTS idx_rpt_lang ON regional_plan_translations(language_code);

-- ----------------------------------------------------------------------------
-- 2.4 Region Translations
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS region_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id TEXT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,

    -- Translated fields
    name TEXT NOT NULL,
    display_name TEXT,
    description TEXT,

    -- Translation metadata
    source TEXT NOT NULL CHECK (source IN ('chatgpt', 'manual', 'imported', 'machine')),
    source_model TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,

    -- Timestamps
    translated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(region_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_regt_region ON region_translations(region_id);
CREATE INDEX IF NOT EXISTS idx_regt_lang ON region_translations(language_code);

-- ----------------------------------------------------------------------------
-- 2.5 Translation Jobs Queue
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS translation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Target
    entity_type TEXT NOT NULL CHECK (entity_type IN ('country', 'plan', 'regional_plan', 'region')),
    entity_id TEXT NOT NULL,
    target_languages TEXT[] NOT NULL,

    -- Job status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
    priority INTEGER DEFAULT 5,

    -- Progress tracking
    languages_completed TEXT[] DEFAULT '{}',
    languages_failed TEXT[] DEFAULT '{}',
    error_message TEXT,

    -- Options
    force_overwrite BOOLEAN DEFAULT false,
    source_language VARCHAR(5) DEFAULT 'en',

    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Metadata
    triggered_by TEXT,
    batch_id UUID
);

CREATE INDEX IF NOT EXISTS idx_tj_status ON translation_jobs(status, priority);
CREATE INDEX IF NOT EXISTS idx_tj_entity ON translation_jobs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tj_batch ON translation_jobs(batch_id);
CREATE INDEX IF NOT EXISTS idx_tj_pending ON translation_jobs(status, created_at) WHERE status = 'pending';

-- ============================================================================
-- PART 3: HELPER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 Update Regional Plan Country Count
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_regional_plan_country_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update count in regional_plans table
    UPDATE regional_plans
    SET country_count = (
        SELECT COUNT(*) FROM regional_plan_countries
        WHERE regional_plan_id = COALESCE(NEW.regional_plan_id, OLD.regional_plan_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.regional_plan_id, OLD.regional_plan_id);

    -- Also update count in dataplans table
    UPDATE dataplans
    SET covered_countries_count = (
        SELECT COUNT(*) FROM regional_plan_countries
        WHERE regional_plan_id = COALESCE(NEW.regional_plan_id, OLD.regional_plan_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.regional_plan_id, OLD.regional_plan_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_regional_plan_country_count ON regional_plan_countries;
CREATE TRIGGER trg_update_regional_plan_country_count
AFTER INSERT OR DELETE ON regional_plan_countries
FOR EACH ROW
EXECUTE FUNCTION update_regional_plan_country_count();

-- ----------------------------------------------------------------------------
-- 3.2 Update Country Statistics
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_country_statistics(p_country_id TEXT)
RETURNS void AS $$
BEGIN
    UPDATE countries
    SET
        plan_count = (
            SELECT COUNT(*) FROM dataplans
            WHERE country_id = p_country_id
            AND status = 'active'
            AND package_type = 'sim'
        ),
        topup_count = (
            SELECT COUNT(*) FROM dataplans
            WHERE country_id = p_country_id
            AND status = 'active'
            AND package_type = 'topup'
        ),
        min_price = (
            SELECT MIN(price) FROM dataplans
            WHERE country_id = p_country_id
            AND status = 'active'
            AND package_type = 'sim'
        ),
        max_data_gb = (
            SELECT MAX(data_amount_mb::NUMERIC / 1024) FROM dataplans
            WHERE country_id = p_country_id
            AND status = 'active'
            AND is_unlimited = false
        ),
        updated_at = NOW()
    WHERE id = p_country_id;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3.3 Get Plans with Translations
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_plans_with_translations(
    p_language_code VARCHAR(5) DEFAULT 'en',
    p_fallback_language VARCHAR(5) DEFAULT 'en',
    p_country_id TEXT DEFAULT NULL,
    p_plan_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 25,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    translated_name TEXT,
    title TEXT,
    translated_title TEXT,
    country_id TEXT,
    country_name TEXT,
    plan_type TEXT,
    data_display TEXT,
    validity_days INTEGER,
    price NUMERIC,
    has_voice BOOLEAN,
    has_sms BOOLEAN,
    covered_countries_count INTEGER,
    tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.name,
        COALESCE(pt.name, pt_fallback.name, d.name) as translated_name,
        d.title,
        COALESCE(pt.title, pt_fallback.title, d.title) as translated_title,
        d.country_id,
        c.name as country_name,
        d.plan_type,
        d.data_display,
        d.validity_days,
        d.price,
        d.has_voice,
        d.has_sms,
        d.covered_countries_count,
        ARRAY_REMOVE(ARRAY[
            CASE WHEN d.plan_type = 'global' THEN 'Global' END,
            CASE WHEN d.plan_type = 'regional' THEN 'Regional' END,
            CASE WHEN rp.is_discover_plus THEN 'Discover+' END,
            CASE WHEN d.has_voice THEN 'Voice' END,
            CASE WHEN d.has_sms THEN 'SMS' END,
            CASE WHEN d.is_unlimited THEN 'Unlimited' END
        ], NULL) as tags
    FROM dataplans d
    LEFT JOIN countries c ON d.country_id = c.id
    LEFT JOIN regional_plans rp ON d.id = rp.id
    LEFT JOIN plan_translations pt ON d.id = pt.plan_id AND pt.language_code = p_language_code
    LEFT JOIN plan_translations pt_fallback ON d.id = pt_fallback.plan_id AND pt_fallback.language_code = p_fallback_language
    WHERE d.status = 'active'
    AND d.is_enabled = true
    AND (p_country_id IS NULL OR d.country_id = p_country_id)
    AND (p_plan_type IS NULL OR d.plan_type = p_plan_type)
    ORDER BY d.name
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- 3.4 Get Regional Plan Countries
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_regional_plan_countries(p_plan_id TEXT, p_language_code VARCHAR(5) DEFAULT 'en')
RETURNS TABLE (
    country_id TEXT,
    country_name TEXT,
    translated_name TEXT,
    iso_code TEXT,
    flag_emoji TEXT,
    image_url TEXT,
    network_info TEXT,
    display_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id as country_id,
        c.name as country_name,
        COALESCE(ct.name, c.name) as translated_name,
        c.iso_code,
        c.flag_emoji,
        c.image_url,
        rpc.network_info,
        rpc.display_order
    FROM regional_plan_countries rpc
    JOIN countries c ON rpc.country_id = c.id
    LEFT JOIN country_translations ct ON c.id = ct.country_id AND ct.language_code = p_language_code
    WHERE rpc.regional_plan_id = p_plan_id
    ORDER BY rpc.display_order, c.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- 3.5 Queue Translation Job
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION queue_translation_job(
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_target_languages TEXT[],
    p_triggered_by TEXT DEFAULT 'manual',
    p_force_overwrite BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
    v_job_id UUID;
BEGIN
    INSERT INTO translation_jobs (
        entity_type,
        entity_id,
        target_languages,
        triggered_by,
        force_overwrite
    ) VALUES (
        p_entity_type,
        p_entity_id,
        p_target_languages,
        p_triggered_by,
        p_force_overwrite
    )
    RETURNING id INTO v_job_id;

    RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 4: VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 Plans Summary View
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_plans_summary AS
SELECT
    d.id,
    d.name,
    d.title,
    d.plan_type,
    d.package_type,
    d.country_id,
    c.name as country_name,
    c.iso_code,
    c.flag_emoji,
    d.region_id,
    r.name as region_name,
    d.data_display,
    d.data_amount_mb,
    d.is_unlimited,
    d.validity_days,
    d.price,
    d.net_price,
    d.has_voice,
    d.voice_minutes,
    d.has_sms,
    d.sms_count,
    d.operator_name,
    d.operator_image_url,
    d.status,
    d.covered_countries_count,
    rp.is_discover_plus,
    rp.coverage_type,
    d.synced_at,
    d.created_at
FROM dataplans d
LEFT JOIN countries c ON d.country_id = c.id
LEFT JOIN regions r ON d.region_id = r.id
LEFT JOIN regional_plans rp ON d.id = rp.id
WHERE d.status = 'active'
AND d.is_enabled = true;

-- ----------------------------------------------------------------------------
-- 4.2 Countries Summary View
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_countries_summary AS
SELECT
    c.id,
    c.name,
    c.slug,
    c.iso_code,
    c.flag_emoji,
    c.image_url,
    c.region_id,
    r.name as region_name,
    c.plan_count,
    c.topup_count,
    c.min_price,
    c.max_data_gb,
    c.is_active,
    c.is_popular,
    c.popularity_rank,
    c.synced_at
FROM countries c
LEFT JOIN regions r ON c.region_id = r.id
WHERE c.is_active = true
ORDER BY c.is_popular DESC, c.name;

-- ----------------------------------------------------------------------------
-- 4.3 Regional Plans Detail View
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_regional_plans_detail AS
SELECT
    d.id,
    d.name,
    rp.display_name,
    rp.marketing_name,
    rp.coverage_type,
    rp.country_count,
    rp.is_discover_plus,
    rp.is_featured,
    rp.highlights,
    rp.best_for,
    d.data_display,
    d.data_amount_mb,
    d.is_unlimited,
    d.validity_days,
    d.price,
    d.has_voice,
    d.voice_minutes,
    d.has_sms,
    d.sms_count,
    d.operator_name,
    d.operator_image_url,
    d.operator_gradient_start,
    d.operator_gradient_end,
    d.status,
    d.synced_at
FROM dataplans d
JOIN regional_plans rp ON d.id = rp.id
WHERE d.status = 'active'
AND d.is_enabled = true
ORDER BY rp.priority_rank, d.name;

-- ============================================================================
-- PART 5: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on existing tables (safe - ignores if already enabled)
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'regions', 'countries', 'dataplans', 'regional_plans', 'regional_plan_countries',
        'plan_topups', 'country_translations', 'plan_translations',
        'regional_plan_translations', 'region_translations', 'translation_jobs'
    ])
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        END IF;
    END LOOP;
END $$;

-- Drop existing policies if they exist, then recreate (safer approach)
DO $$
BEGIN
    -- Drop existing policies to avoid conflicts
    DROP POLICY IF EXISTS "Public read access for regions" ON regions;
    DROP POLICY IF EXISTS "Public read access for countries" ON countries;
    DROP POLICY IF EXISTS "Public read access for dataplans" ON dataplans;
    DROP POLICY IF EXISTS "Service role full access for regions" ON regions;
    DROP POLICY IF EXISTS "Service role full access for countries" ON countries;
    DROP POLICY IF EXISTS "Service role full access for dataplans" ON dataplans;

    -- Policies for REGIONS (simple - no column conditions)
    CREATE POLICY "Public read access for regions" ON regions FOR SELECT USING (true);
    CREATE POLICY "Service role full access for regions" ON regions FOR ALL TO service_role USING (true) WITH CHECK (true);

    -- Policies for COUNTRIES
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'is_active') THEN
        CREATE POLICY "Public read access for countries" ON countries FOR SELECT USING (is_active = true);
    ELSE
        CREATE POLICY "Public read access for countries" ON countries FOR SELECT USING (true);
    END IF;
    CREATE POLICY "Service role full access for countries" ON countries FOR ALL TO service_role USING (true) WITH CHECK (true);

    -- Policies for DATAPLANS
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'is_enabled') THEN
        CREATE POLICY "Public read access for dataplans" ON dataplans FOR SELECT USING (status = 'active' AND is_enabled = true);
    ELSE
        CREATE POLICY "Public read access for dataplans" ON dataplans FOR SELECT USING (status = 'active');
    END IF;
    CREATE POLICY "Service role full access for dataplans" ON dataplans FOR ALL TO service_role USING (true) WITH CHECK (true);

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some policies may already exist: %', SQLERRM;
END $$;

-- Policies for new tables (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'regional_plans') THEN
        DROP POLICY IF EXISTS "Public read access for regional_plans" ON regional_plans;
        DROP POLICY IF EXISTS "Service role full access for regional_plans" ON regional_plans;
        CREATE POLICY "Public read access for regional_plans" ON regional_plans FOR SELECT USING (true);
        CREATE POLICY "Service role full access for regional_plans" ON regional_plans FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'regional_plan_countries') THEN
        DROP POLICY IF EXISTS "Public read access for regional_plan_countries" ON regional_plan_countries;
        DROP POLICY IF EXISTS "Service role full access for regional_plan_countries" ON regional_plan_countries;
        CREATE POLICY "Public read access for regional_plan_countries" ON regional_plan_countries FOR SELECT USING (true);
        CREATE POLICY "Service role full access for regional_plan_countries" ON regional_plan_countries FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plan_topups') THEN
        DROP POLICY IF EXISTS "Public read access for plan_topups" ON plan_topups;
        DROP POLICY IF EXISTS "Service role full access for plan_topups" ON plan_topups;
        CREATE POLICY "Public read access for plan_topups" ON plan_topups FOR SELECT USING (status = 'active' AND is_enabled = true);
        CREATE POLICY "Service role full access for plan_topups" ON plan_topups FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'country_translations') THEN
        DROP POLICY IF EXISTS "Public read access for country_translations" ON country_translations;
        DROP POLICY IF EXISTS "Service role full access for country_translations" ON country_translations;
        CREATE POLICY "Public read access for country_translations" ON country_translations FOR SELECT USING (true);
        CREATE POLICY "Service role full access for country_translations" ON country_translations FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plan_translations') THEN
        DROP POLICY IF EXISTS "Public read access for plan_translations" ON plan_translations;
        DROP POLICY IF EXISTS "Service role full access for plan_translations" ON plan_translations;
        CREATE POLICY "Public read access for plan_translations" ON plan_translations FOR SELECT USING (true);
        CREATE POLICY "Service role full access for plan_translations" ON plan_translations FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'regional_plan_translations') THEN
        DROP POLICY IF EXISTS "Public read access for regional_plan_translations" ON regional_plan_translations;
        DROP POLICY IF EXISTS "Service role full access for regional_plan_translations" ON regional_plan_translations;
        CREATE POLICY "Public read access for regional_plan_translations" ON regional_plan_translations FOR SELECT USING (true);
        CREATE POLICY "Service role full access for regional_plan_translations" ON regional_plan_translations FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'region_translations') THEN
        DROP POLICY IF EXISTS "Public read access for region_translations" ON region_translations;
        DROP POLICY IF EXISTS "Service role full access for region_translations" ON region_translations;
        CREATE POLICY "Public read access for region_translations" ON region_translations FOR SELECT USING (true);
        CREATE POLICY "Service role full access for region_translations" ON region_translations FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'translation_jobs') THEN
        DROP POLICY IF EXISTS "Service role full access for translation_jobs" ON translation_jobs;
        CREATE POLICY "Service role full access for translation_jobs" ON translation_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some policies may already exist: %', SQLERRM;
END $$;

-- ============================================================================
-- PART 6: DATA MIGRATION FROM EXISTING JSONB
-- ============================================================================

-- Migrate existing country translations from JSONB to translation tables (if both tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'country_translations')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'countries')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'translations') THEN

        INSERT INTO country_translations (country_id, language_code, name, source)
        SELECT
            c.id,
            lang.key as language_code,
            (lang.value->>'name')::TEXT as name,
            'imported' as source
        FROM countries c,
        LATERAL jsonb_each(COALESCE(c.translations, '{}'::jsonb)) AS lang
        WHERE c.translations IS NOT NULL
        AND c.translations != '{}'::jsonb
        AND (lang.value->>'name') IS NOT NULL
        ON CONFLICT (country_id, language_code) DO NOTHING;

        RAISE NOTICE 'Migrated country translations from JSONB';
    END IF;
END $$;

-- Migrate existing region translations from JSONB to translation tables (if both tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'region_translations')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'regions')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'translations') THEN

        INSERT INTO region_translations (region_id, language_code, name, source)
        SELECT
            r.id,
            lang.key as language_code,
            (lang.value->>'name')::TEXT as name,
            'imported' as source
        FROM regions r,
        LATERAL jsonb_each(COALESCE(r.translations, '{}'::jsonb)) AS lang
        WHERE r.translations IS NOT NULL
        AND r.translations != '{}'::jsonb
        AND (lang.value->>'name') IS NOT NULL
        ON CONFLICT (region_id, language_code) DO NOTHING;

        RAISE NOTICE 'Migrated region translations from JSONB';
    END IF;
END $$;

-- ============================================================================
-- PART 7: UPDATED_AT TRIGGERS
-- ============================================================================

-- Function for tables with 'updated_at' column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for translation tables with 'last_updated_at' column
CREATE OR REPLACE FUNCTION update_translation_last_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with 'updated_at' column
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'regions', 'countries', 'dataplans', 'regional_plans', 'plan_topups'
    ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_update_%s_updated_at ON %s;
            CREATE TRIGGER trg_update_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END $$;

-- Apply triggers to translation tables with 'last_updated_at' column
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'country_translations', 'plan_translations', 'regional_plan_translations', 'region_translations'
    ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_update_%s_updated_at ON %s;
            DROP TRIGGER IF EXISTS trg_update_%s_last_updated_at ON %s;
            CREATE TRIGGER trg_update_%s_last_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW
            EXECUTE FUNCTION update_translation_last_updated_at();
        ', t, t, t, t, t, t);
    END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables exist
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN (
    'regions', 'countries', 'dataplans', 'regional_plans', 'regional_plan_countries',
    'plan_topups', 'country_translations', 'plan_translations', 'regional_plan_translations',
    'region_translations', 'translation_jobs'
)
ORDER BY table_name;

-- Verify indexes exist
SELECT
    indexname,
    tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'regions', 'countries', 'dataplans', 'regional_plans', 'regional_plan_countries',
    'country_translations', 'plan_translations'
)
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
