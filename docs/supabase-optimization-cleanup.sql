-- ============================================================================
-- DATABASE OPTIMIZATION & CLEANUP
-- ============================================================================
-- Version: 1.0
-- Date: 2026-01-04
-- Description: Remove duplicate columns and optimize schema after migration
--
-- DUPLICATIONS FOUND:
-- 1. countries.translations (JSONB) vs country_translations table
-- 2. regions.translations (JSONB) vs region_translations table
-- 3. dataplans.enabled vs dataplans.is_enabled
-- 4. dataplans.type vs dataplans.package_type
-- 5. dataplans.plan_category vs dataplans.plan_type
--
-- RUN THIS AFTER confirming migration was successful
-- ============================================================================

-- ============================================================================
-- PART 1: VERIFY DATA MIGRATION BEFORE CLEANUP
-- ============================================================================

-- Check if translations were migrated from JSONB to normalized tables
DO $$
DECLARE
    jsonb_country_count INTEGER;
    normalized_country_count INTEGER;
    jsonb_region_count INTEGER;
    normalized_region_count INTEGER;
BEGIN
    -- Count countries with JSONB translations
    SELECT COUNT(*) INTO jsonb_country_count
    FROM countries
    WHERE translations IS NOT NULL
    AND translations != '{}'::jsonb;

    -- Count entries in normalized table
    SELECT COUNT(DISTINCT country_id) INTO normalized_country_count
    FROM country_translations;

    RAISE NOTICE '=== TRANSLATION MIGRATION STATUS ===';
    RAISE NOTICE 'Countries with JSONB translations: %', jsonb_country_count;
    RAISE NOTICE 'Countries in normalized table: %', normalized_country_count;

    -- Count regions with JSONB translations
    SELECT COUNT(*) INTO jsonb_region_count
    FROM regions
    WHERE translations IS NOT NULL
    AND translations != '{}'::jsonb;

    -- Count entries in normalized table
    SELECT COUNT(DISTINCT region_id) INTO normalized_region_count
    FROM region_translations;

    RAISE NOTICE 'Regions with JSONB translations: %', jsonb_region_count;
    RAISE NOTICE 'Regions in normalized table: %', normalized_region_count;
    RAISE NOTICE '=====================================';
END $$;

-- ============================================================================
-- PART 2: ENSURE ALL JSONB DATA IS MIGRATED (Run again to be safe)
-- ============================================================================

-- Migrate any remaining country translations from JSONB
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'translations') THEN
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
        AND length((lang.value->>'name')::TEXT) > 0
        ON CONFLICT (country_id, language_code) DO NOTHING;

        RAISE NOTICE 'Migrated country translations from JSONB';
    END IF;
END $$;

-- Migrate any remaining region translations from JSONB
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'translations') THEN
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
        AND length((lang.value->>'name')::TEXT) > 0
        ON CONFLICT (region_id, language_code) DO NOTHING;

        RAISE NOTICE 'Migrated region translations from JSONB';
    END IF;
END $$;

-- ============================================================================
-- PART 3: SYNC DUPLICATE COLUMNS IN DATAPLANS BEFORE REMOVAL
-- ============================================================================

DO $$
BEGIN
    -- Sync is_enabled from enabled (if enabled column exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'enabled') THEN
        UPDATE dataplans
        SET is_enabled = enabled
        WHERE enabled IS NOT NULL
        AND is_enabled IS DISTINCT FROM enabled;
        RAISE NOTICE 'Synced is_enabled from enabled';
    END IF;

    -- Sync package_type from type (if type column exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'type') THEN
        UPDATE dataplans
        SET package_type = type
        WHERE type IS NOT NULL
        AND (package_type IS NULL OR package_type = 'sim');
        RAISE NOTICE 'Synced package_type from type';
    END IF;

    -- Sync plan_type from plan_category where applicable (if plan_category column exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'plan_category') THEN
        UPDATE dataplans
        SET plan_type = CASE
            WHEN plan_category = 'global' THEN 'global'
            WHEN plan_category = 'regional' THEN 'regional'
            WHEN is_regional = true THEN 'regional'
            ELSE 'country'
        END
        WHERE plan_type = 'country'
        AND (plan_category IN ('global', 'regional') OR is_regional = true);
        RAISE NOTICE 'Synced plan_type from plan_category';
    END IF;

    RAISE NOTICE 'Duplicate columns sync complete';
END $$;

-- ============================================================================
-- PART 4: DROP DUPLICATE/REDUNDANT COLUMNS
-- ============================================================================

-- 4.0 First drop views that depend on columns we're removing
DO $$
BEGIN
    -- Drop views that reference the columns we're about to remove
    DROP VIEW IF EXISTS v_regional_plans CASCADE;
    DROP VIEW IF EXISTS v_country_plans CASCADE;
    DROP VIEW IF EXISTS v_region_summary CASCADE;
    DROP VIEW IF EXISTS v_plans_summary CASCADE;
    DROP VIEW IF EXISTS v_countries_summary CASCADE;
    RAISE NOTICE 'Dropped dependent views (will be recreated in PART 6)';
END $$;

-- 4.1 Drop JSONB translations columns (now normalized in separate tables)
DO $$
BEGIN
    -- Drop countries.translations JSONB column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'countries'
        AND column_name = 'translations'
    ) THEN
        ALTER TABLE countries DROP COLUMN translations CASCADE;
        RAISE NOTICE 'Dropped countries.translations JSONB column';
    END IF;

    -- Drop regions.translations JSONB column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'regions'
        AND column_name = 'translations'
    ) THEN
        ALTER TABLE regions DROP COLUMN translations CASCADE;
        RAISE NOTICE 'Dropped regions.translations JSONB column';
    END IF;
END $$;

-- 4.2 Drop duplicate dataplans columns
DO $$
BEGIN
    -- Drop 'enabled' (keeping 'is_enabled' for consistency)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dataplans'
        AND column_name = 'enabled'
    ) THEN
        ALTER TABLE dataplans DROP COLUMN enabled CASCADE;
        RAISE NOTICE 'Dropped dataplans.enabled (keeping is_enabled)';
    END IF;

    -- Drop 'type' (keeping 'package_type' for clarity)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dataplans'
        AND column_name = 'type'
    ) THEN
        ALTER TABLE dataplans DROP COLUMN type CASCADE;
        RAISE NOTICE 'Dropped dataplans.type (keeping package_type)';
    END IF;

    -- Drop 'plan_category' (keeping 'plan_type' for consistency)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dataplans'
        AND column_name = 'plan_category'
    ) THEN
        ALTER TABLE dataplans DROP COLUMN plan_category CASCADE;
        RAISE NOTICE 'Dropped dataplans.plan_category (keeping plan_type)';
    END IF;
END $$;

-- ============================================================================
-- PART 5: ADD CHECK CONSTRAINTS FOR DATA INTEGRITY
-- ============================================================================

-- Add check constraint for package_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'dataplans_package_type_check'
    ) THEN
        ALTER TABLE dataplans
        ADD CONSTRAINT dataplans_package_type_check
        CHECK (package_type IN ('sim', 'topup'));
        RAISE NOTICE 'Added package_type check constraint';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'package_type constraint may already exist or data violates it: %', SQLERRM;
END $$;

-- Add check constraint for plan_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'dataplans_plan_type_check'
    ) THEN
        ALTER TABLE dataplans
        ADD CONSTRAINT dataplans_plan_type_check
        CHECK (plan_type IN ('country', 'regional', 'global'));
        RAISE NOTICE 'Added plan_type check constraint';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'plan_type constraint may already exist or data violates it: %', SQLERRM;
END $$;

-- ============================================================================
-- PART 6: UPDATE VIEWS TO USE CORRECT COLUMNS
-- ============================================================================

-- Recreate v_plans_summary view with correct column names
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

-- Recreate v_countries_summary without translations column
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

-- ============================================================================
-- PART 7: CREATE HELPER VIEW FOR TRANSLATED CONTENT
-- ============================================================================

-- View to get countries with their translations in any language
CREATE OR REPLACE VIEW v_countries_with_translations AS
SELECT
    c.id,
    c.name as name_en,
    c.slug,
    c.iso_code,
    c.flag_emoji,
    c.image_url,
    c.region_id,
    c.plan_count,
    c.min_price,
    c.is_active,
    c.is_popular,
    ct.language_code,
    ct.name as translated_name,
    ct.description as translated_description,
    ct.source as translation_source,
    ct.is_verified as translation_verified
FROM countries c
LEFT JOIN country_translations ct ON c.id = ct.country_id
WHERE c.is_active = true;

-- View to get regions with their translations
CREATE OR REPLACE VIEW v_regions_with_translations AS
SELECT
    r.id,
    r.name as name_en,
    r.display_name as display_name_en,
    r.slug,
    r.type,
    r.display_order,
    r.country_count,
    r.plan_count,
    r.is_active,
    rt.language_code,
    rt.name as translated_name,
    rt.display_name as translated_display_name,
    rt.description as translated_description,
    rt.source as translation_source
FROM regions r
LEFT JOIN region_translations rt ON r.id = rt.region_id
WHERE r.is_active = true;

-- ============================================================================
-- PART 8: OPTIMIZED FUNCTIONS FOR TRANSLATED LOOKUPS
-- ============================================================================

-- Get country by ID with translation fallback
CREATE OR REPLACE FUNCTION get_country_translated(
    p_country_id TEXT,
    p_language_code VARCHAR(5) DEFAULT 'en'
)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    slug TEXT,
    iso_code TEXT,
    flag_emoji TEXT,
    image_url TEXT,
    region_id TEXT,
    plan_count INTEGER,
    min_price NUMERIC,
    is_popular BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        COALESCE(ct.name, c.name) as name,
        c.slug,
        c.iso_code,
        c.flag_emoji,
        c.image_url,
        c.region_id,
        c.plan_count,
        c.min_price,
        c.is_popular
    FROM countries c
    LEFT JOIN country_translations ct
        ON c.id = ct.country_id
        AND ct.language_code = p_language_code
    WHERE c.id = p_country_id
    AND c.is_active = true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get all countries with translation for a specific language
CREATE OR REPLACE FUNCTION get_countries_translated(
    p_language_code VARCHAR(5) DEFAULT 'en',
    p_region_id TEXT DEFAULT NULL,
    p_popular_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    slug TEXT,
    iso_code TEXT,
    flag_emoji TEXT,
    image_url TEXT,
    region_id TEXT,
    plan_count INTEGER,
    min_price NUMERIC,
    is_popular BOOLEAN,
    popularity_rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        COALESCE(ct.name, c.name) as name,
        c.slug,
        c.iso_code,
        c.flag_emoji,
        c.image_url,
        c.region_id,
        c.plan_count,
        c.min_price,
        c.is_popular,
        c.popularity_rank
    FROM countries c
    LEFT JOIN country_translations ct
        ON c.id = ct.country_id
        AND ct.language_code = p_language_code
    WHERE c.is_active = true
    AND (p_region_id IS NULL OR c.region_id = p_region_id)
    AND (NOT p_popular_only OR c.is_popular = true)
    ORDER BY
        CASE WHEN c.is_popular THEN 0 ELSE 1 END,
        c.popularity_rank NULLS LAST,
        COALESCE(ct.name, c.name);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PART 9: VERIFICATION
-- ============================================================================

-- Check final schema structure
SELECT
    'countries' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'countries'
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT
    'regions' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'regions'
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT
    'dataplans' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'dataplans'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify no duplicate columns remain
DO $$
DECLARE
    has_duplicates BOOLEAN := FALSE;
BEGIN
    -- Check for removed columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'countries' AND column_name = 'translations') THEN
        RAISE WARNING 'countries.translations still exists!';
        has_duplicates := TRUE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'translations') THEN
        RAISE WARNING 'regions.translations still exists!';
        has_duplicates := TRUE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'enabled') THEN
        RAISE WARNING 'dataplans.enabled still exists!';
        has_duplicates := TRUE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'type') THEN
        RAISE WARNING 'dataplans.type still exists!';
        has_duplicates := TRUE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dataplans' AND column_name = 'plan_category') THEN
        RAISE WARNING 'dataplans.plan_category still exists!';
        has_duplicates := TRUE;
    END IF;

    IF NOT has_duplicates THEN
        RAISE NOTICE '=== CLEANUP SUCCESSFUL ===';
        RAISE NOTICE 'All duplicate columns have been removed!';
        RAISE NOTICE 'Translations are now only in normalized tables.';
    END IF;
END $$;

-- Final count summary
SELECT 'Translation Tables Summary' as info;
SELECT 'country_translations' as table_name, COUNT(*) as row_count FROM country_translations
UNION ALL
SELECT 'region_translations', COUNT(*) FROM region_translations
UNION ALL
SELECT 'plan_translations', COUNT(*) FROM plan_translations
UNION ALL
SELECT 'regional_plan_translations', COUNT(*) FROM regional_plan_translations;
