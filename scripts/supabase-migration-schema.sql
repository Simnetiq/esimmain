-- ============================================================
-- SUPABASE SCHEMA FOR ESIM CATALOG
-- ============================================================
-- Run this in Supabase SQL Editor before syncing
-- ============================================================

-- ============================================================
-- 1. REGIONS TABLE (simplified - no icon/color needed)
-- ============================================================

-- Drop and recreate regions with proper structure
DROP TABLE IF EXISTS public.regions CASCADE;

CREATE TABLE public.regions (
  id text PRIMARY KEY,
  name text NOT NULL,
  display_name text,              -- Human-readable name
  type text DEFAULT 'region',     -- 'continent', 'region', 'global'
  display_order integer DEFAULT 0,
  country_count integer DEFAULT 0,
  plan_count integer DEFAULT 0,
  translations jsonb DEFAULT '{}'::jsonb,
  synced_at timestamp with time zone DEFAULT now()
);

-- Seed regions based on actual Airalo data
INSERT INTO public.regions (id, name, display_name, type, display_order) VALUES
  ('global', 'Global', 'Discover Global', 'global', 0),
  ('europe', 'Europe', 'Europe', 'continent', 1),
  ('european-union', 'European Union', 'European Union and United Kingdom', 'region', 2),
  ('asia', 'Asia', 'Asia', 'continent', 3),
  ('north-america', 'North America', 'North America', 'region', 4),
  ('latin-america', 'Latin America', 'Latin America', 'region', 5),
  ('south-america', 'South America', 'South America', 'region', 6),
  ('caribbean', 'Caribbean', 'Caribbean Islands', 'region', 7),
  ('middle-east', 'Middle East', 'Middle East and North Africa', 'region', 8),
  ('africa', 'Africa', 'Africa', 'continent', 9),
  ('oceania', 'Oceania', 'Oceania', 'continent', 10)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  type = EXCLUDED.type,
  display_order = EXCLUDED.display_order;

-- ============================================================
-- 2. COUNTRIES TABLE
-- ============================================================

DROP TABLE IF EXISTS public.countries CASCADE;

CREATE TABLE public.countries (
  id text PRIMARY KEY,                    -- slug: "united-states"
  name text NOT NULL,                     -- "United States"
  iso_code text,                          -- "US" (2-letter)
  slug text,                              -- same as id
  image_url text,
  region_id text REFERENCES public.regions(id),
  is_active boolean DEFAULT true,
  is_popular boolean DEFAULT false,
  is_regional boolean DEFAULT false,      -- true for regional entries like "Europe"
  plan_count integer DEFAULT 0,
  min_price numeric,
  translations jsonb DEFAULT '{}'::jsonb,
  synced_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX idx_countries_region ON public.countries(region_id);
CREATE INDEX idx_countries_active ON public.countries(is_active);
CREATE INDEX idx_countries_popular ON public.countries(is_popular) WHERE is_popular = true;
CREATE INDEX idx_countries_name ON public.countries(name);

-- ============================================================
-- 3. DATAPLANS TABLE
-- ============================================================

DROP TABLE IF EXISTS public.dataplans CASCADE;

CREATE TABLE public.dataplans (
  id text PRIMARY KEY,                    -- package slug
  name text NOT NULL,
  title text,

  -- Plan type
  type text DEFAULT 'sim',                -- 'sim' or 'topup'
  plan_category text,                     -- 'global', 'regional', 'country'

  -- Location
  country_id text,                        -- FK to countries (null for regional)
  country_name text,                      -- Denormalized for display
  country_iso text,                       -- 2-letter ISO code
  region_id text REFERENCES public.regions(id),
  is_regional boolean DEFAULT false,
  covered_countries text[] DEFAULT '{}',  -- Array of country slugs
  covered_countries_count integer DEFAULT 0,

  -- Data
  data_display text,                      -- "1 GB", "Unlimited"
  data_amount_mb integer DEFAULT 0,
  is_unlimited boolean DEFAULT false,

  -- Validity
  validity_days integer NOT NULL,

  -- Voice/SMS
  has_voice boolean DEFAULT false,
  voice_minutes integer DEFAULT 0,
  has_sms boolean DEFAULT false,
  sms_count integer DEFAULT 0,

  -- Pricing
  price numeric NOT NULL,
  net_price numeric,
  currency text DEFAULT 'USD',

  -- Operator
  operator_id text,
  operator_name text,
  operator_image_url text,
  operator_style text,
  operator_gradient_start text,
  operator_gradient_end text,

  -- Policies
  activation_policy text,
  fair_usage_policy text,
  short_info text,

  -- Installation
  apn_type text,
  apn_value text,

  -- Status
  status text DEFAULT 'active',
  enabled boolean DEFAULT true,
  provider text DEFAULT 'airalo',

  -- Metadata
  synced_at timestamp with time zone DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_dataplans_country ON public.dataplans(country_id);
CREATE INDEX idx_dataplans_region ON public.dataplans(region_id);
CREATE INDEX idx_dataplans_type ON public.dataplans(type);
CREATE INDEX idx_dataplans_status ON public.dataplans(status);
CREATE INDEX idx_dataplans_price ON public.dataplans(price);
CREATE INDEX idx_dataplans_category ON public.dataplans(plan_category);
CREATE INDEX idx_dataplans_is_regional ON public.dataplans(is_regional);
CREATE INDEX idx_dataplans_data ON public.dataplans(data_amount_mb);
CREATE INDEX idx_dataplans_validity ON public.dataplans(validity_days);

-- GIN index for covered countries array searches
CREATE INDEX idx_dataplans_covered_gin ON public.dataplans USING GIN (covered_countries);

-- Composite indexes for common queries
CREATE INDEX idx_dataplans_country_price ON public.dataplans(country_id, price) WHERE status = 'active';
CREATE INDEX idx_dataplans_region_price ON public.dataplans(region_id, price) WHERE status = 'active';

-- ============================================================
-- 4. VIEWS FOR EASY QUERYING
-- ============================================================

-- Regional plans with countries list
CREATE OR REPLACE VIEW public.v_regional_plans AS
SELECT
  d.*,
  r.name as region_name,
  r.display_name as region_display_name,
  array_length(d.covered_countries, 1) as country_count
FROM public.dataplans d
LEFT JOIN public.regions r ON d.region_id = r.id
WHERE d.is_regional = true
ORDER BY d.price;

-- Country plans with region info
CREATE OR REPLACE VIEW public.v_country_plans AS
SELECT
  d.*,
  c.name as country_display_name,
  c.image_url as country_image,
  r.name as region_name
FROM public.dataplans d
LEFT JOIN public.countries c ON d.country_id = c.id
LEFT JOIN public.regions r ON c.region_id = r.id
WHERE d.is_regional = false AND d.type = 'sim'
ORDER BY c.name, d.price;

-- Plans summary by region
CREATE OR REPLACE VIEW public.v_region_summary AS
SELECT
  r.id,
  r.name,
  r.display_name,
  r.type,
  r.display_order,
  COUNT(DISTINCT c.id) as country_count,
  COUNT(DISTINCT d.id) as plan_count,
  MIN(d.price) as min_price
FROM public.regions r
LEFT JOIN public.countries c ON c.region_id = r.id
LEFT JOIN public.dataplans d ON d.region_id = r.id OR d.country_id = c.id
WHERE d.status = 'active' OR d.status IS NULL
GROUP BY r.id, r.name, r.display_name, r.type, r.display_order
ORDER BY r.display_order;

-- ============================================================
-- 5. FUNCTIONS
-- ============================================================

-- Get plans for a country with optional filters
CREATE OR REPLACE FUNCTION get_country_plans(
  p_country_id text,
  p_limit integer DEFAULT 50,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL
)
RETURNS TABLE (
  id text,
  name text,
  data_display text,
  validity_days integer,
  price numeric,
  has_voice boolean,
  has_sms boolean,
  operator_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.name,
    d.data_display,
    d.validity_days,
    d.price,
    d.has_voice,
    d.has_sms,
    d.operator_name
  FROM public.dataplans d
  WHERE d.country_id = p_country_id
    AND d.status = 'active'
    AND d.type = 'sim'
    AND (p_min_price IS NULL OR d.price >= p_min_price)
    AND (p_max_price IS NULL OR d.price <= p_max_price)
  ORDER BY d.price
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get regional plans that cover a specific country
CREATE OR REPLACE FUNCTION get_regional_plans_for_country(
  p_country_slug text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id text,
  name text,
  data_display text,
  validity_days integer,
  price numeric,
  covered_countries_count integer,
  region_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.name,
    d.data_display,
    d.validity_days,
    d.price,
    d.covered_countries_count,
    r.display_name as region_name
  FROM public.dataplans d
  LEFT JOIN public.regions r ON d.region_id = r.id
  WHERE p_country_slug = ANY(d.covered_countries)
    AND d.status = 'active'
    AND d.is_regional = true
  ORDER BY d.price
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. ROW LEVEL SECURITY (optional - for public access)
-- ============================================================

-- Enable RLS
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataplans ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can read)
CREATE POLICY regions_public_read ON public.regions FOR SELECT USING (true);
CREATE POLICY countries_public_read ON public.countries FOR SELECT USING (true);
CREATE POLICY dataplans_public_read ON public.dataplans FOR SELECT USING (true);

-- Service role full access (using TO clause for proper role targeting)
CREATE POLICY regions_service_all ON public.regions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY countries_service_all ON public.countries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY dataplans_service_all ON public.dataplans FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 'Regions created: ' || COUNT(*)::text FROM public.regions;
SELECT 'Schema ready for sync!' as status;
