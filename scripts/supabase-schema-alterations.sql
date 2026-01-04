-- ============================================================
-- SUPABASE SCHEMA ALTERATIONS FOR FIREBASE MIGRATION
-- ============================================================
-- Run this script BEFORE the migration to add missing columns
-- and create necessary indexes.
--
-- Scope: countries + dataplans tables only
-- Strategy: Additive changes only (no drops, no breaking changes)
-- ============================================================

-- ============================================================
-- 1. REGIONS SEED DATA
-- ============================================================
-- Ensure regions exist for country FK references

INSERT INTO public.regions (id, name, display_order, type, synced_at)
VALUES
  ('asia', 'Asia', 1, 'continent', now()),
  ('europe', 'Europe', 2, 'continent', now()),
  ('americas', 'Americas', 3, 'continent', now()),
  ('africa', 'Africa', 4, 'continent', now()),
  ('oceania', 'Oceania', 5, 'continent', now()),
  ('middle-east', 'Middle East', 6, 'region', now()),
  ('caribbean', 'Caribbean', 7, 'region', now())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  display_order = EXCLUDED.display_order,
  type = EXCLUDED.type;

-- ============================================================
-- 2. COUNTRIES TABLE ALTERATIONS
-- ============================================================

-- Add missing columns to countries table
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

-- Add comments for documentation
COMMENT ON COLUMN public.countries.name IS 'Display name of the country';
COMMENT ON COLUMN public.countries.slug IS 'URL-safe identifier (same as id for most cases)';
COMMENT ON COLUMN public.countries.title IS 'Alternative display name';
COMMENT ON COLUMN public.countries.image_url IS 'Country flag or representative image URL';
COMMENT ON COLUMN public.countries.description IS 'SEO description text';
COMMENT ON COLUMN public.countries.plan_count IS 'Cached count of available plans';
COMMENT ON COLUMN public.countries.min_price IS 'Cached minimum plan price in USD';
COMMENT ON COLUMN public.countries.provider IS 'Data source provider (e.g., airalo)';
COMMENT ON COLUMN public.countries.is_regional IS 'True for regional packages (not single country)';
COMMENT ON COLUMN public.countries.firebase_updated_at IS 'Last update timestamp from Firebase source';

-- ============================================================
-- 3. COUNTRIES INDEXES
-- ============================================================

-- Single column indexes for common filters
CREATE INDEX IF NOT EXISTS idx_countries_is_active
  ON public.countries(is_active);

CREATE INDEX IF NOT EXISTS idx_countries_is_popular
  ON public.countries(is_popular);

CREATE INDEX IF NOT EXISTS idx_countries_region_id
  ON public.countries(region_id);

CREATE INDEX IF NOT EXISTS idx_countries_name
  ON public.countries(name);

CREATE INDEX IF NOT EXISTS idx_countries_slug
  ON public.countries(slug);

CREATE INDEX IF NOT EXISTS idx_countries_is_regional
  ON public.countries(is_regional);

-- Composite index for homepage popular countries query
CREATE INDEX IF NOT EXISTS idx_countries_popular_active
  ON public.countries(is_popular, is_active)
  WHERE is_active = true;

-- Composite index for admin filtering
CREATE INDEX IF NOT EXISTS idx_countries_active_region
  ON public.countries(is_active, region_id);

-- ============================================================
-- 4. DATAPLANS INDEXES
-- ============================================================

-- Single column indexes for common filters
CREATE INDEX IF NOT EXISTS idx_dataplans_country_id
  ON public.dataplans(country_id);

CREATE INDEX IF NOT EXISTS idx_dataplans_type
  ON public.dataplans(type);

CREATE INDEX IF NOT EXISTS idx_dataplans_status
  ON public.dataplans(status);

CREATE INDEX IF NOT EXISTS idx_dataplans_price
  ON public.dataplans(price);

CREATE INDEX IF NOT EXISTS idx_dataplans_is_regional
  ON public.dataplans(is_regional);

CREATE INDEX IF NOT EXISTS idx_dataplans_data_amount
  ON public.dataplans(data_amount_mb);

CREATE INDEX IF NOT EXISTS idx_dataplans_validity
  ON public.dataplans(validity_days);

CREATE INDEX IF NOT EXISTS idx_dataplans_enabled
  ON public.dataplans(enabled);

-- Composite index for country detail page (plans sorted by price)
CREATE INDEX IF NOT EXISTS idx_dataplans_country_price
  ON public.dataplans(country_id, price)
  WHERE status = 'active';

-- Composite index for admin filtering by status and price
CREATE INDEX IF NOT EXISTS idx_dataplans_status_price
  ON public.dataplans(status, price);

-- Composite index for type filtering
CREATE INDEX IF NOT EXISTS idx_dataplans_type_status
  ON public.dataplans(type, status);

-- Composite index for regional plans lookup
CREATE INDEX IF NOT EXISTS idx_dataplans_regional_status
  ON public.dataplans(is_regional, status)
  WHERE is_regional = true;

-- ============================================================
-- 5. COVERED_COUNTRIES ARRAY INDEX (GIN)
-- ============================================================
-- For queries like "find all plans that cover France"

CREATE INDEX IF NOT EXISTS idx_dataplans_covered_countries_gin
  ON public.dataplans
  USING GIN (covered_countries);

-- ============================================================
-- 6. VALIDATION QUERIES
-- ============================================================
-- Run these after applying schema changes to verify

-- Check countries columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'countries'
ORDER BY ordinal_position;

-- Check dataplans indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('countries', 'dataplans')
ORDER BY tablename, indexname;

-- Count regions
SELECT COUNT(*) as region_count FROM public.regions;

-- ============================================================
-- END OF SCHEMA ALTERATIONS
-- ============================================================
