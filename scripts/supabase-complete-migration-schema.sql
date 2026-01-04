-- ============================================================
-- SUPABASE COMPLETE MIGRATION SCHEMA
-- ============================================================
-- Run this entire script in the Supabase SQL Editor
--
-- This script sets up:
-- 1. Regions seed data
-- 2. Countries table alterations
-- 3. Dataplans indexes
-- 4. User eSIMs table (purchased SIMs)
-- 5. Usage history table
-- 6. Analytics views
-- 7. Helper functions
-- 8. Row Level Security policies
--
-- Version: 1.0
-- Date: 2026-01-04
-- ============================================================

-- ============================================================
-- PART 1: REGIONS SEED DATA
-- ============================================================

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
-- PART 2: COUNTRIES TABLE ALTERATIONS
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

-- Add comments
COMMENT ON COLUMN public.countries.name IS 'Display name of the country';
COMMENT ON COLUMN public.countries.slug IS 'URL-safe identifier';
COMMENT ON COLUMN public.countries.plan_count IS 'Cached count of available plans';
COMMENT ON COLUMN public.countries.min_price IS 'Cached minimum plan price in USD';

-- Countries indexes
CREATE INDEX IF NOT EXISTS idx_countries_is_active ON public.countries(is_active);
CREATE INDEX IF NOT EXISTS idx_countries_is_popular ON public.countries(is_popular);
CREATE INDEX IF NOT EXISTS idx_countries_region_id ON public.countries(region_id);
CREATE INDEX IF NOT EXISTS idx_countries_name ON public.countries(name);
CREATE INDEX IF NOT EXISTS idx_countries_slug ON public.countries(slug);
CREATE INDEX IF NOT EXISTS idx_countries_is_regional ON public.countries(is_regional);

-- Composite index for homepage
CREATE INDEX IF NOT EXISTS idx_countries_popular_active
  ON public.countries(is_popular, is_active)
  WHERE is_active = true;

-- ============================================================
-- PART 3: DATAPLANS INDEXES
-- ============================================================

-- Single column indexes
CREATE INDEX IF NOT EXISTS idx_dataplans_country_id ON public.dataplans(country_id);
CREATE INDEX IF NOT EXISTS idx_dataplans_type ON public.dataplans(type);
CREATE INDEX IF NOT EXISTS idx_dataplans_status ON public.dataplans(status);
CREATE INDEX IF NOT EXISTS idx_dataplans_price ON public.dataplans(price);
CREATE INDEX IF NOT EXISTS idx_dataplans_is_regional ON public.dataplans(is_regional);
CREATE INDEX IF NOT EXISTS idx_dataplans_data_amount ON public.dataplans(data_amount_mb);
CREATE INDEX IF NOT EXISTS idx_dataplans_validity ON public.dataplans(validity_days);
CREATE INDEX IF NOT EXISTS idx_dataplans_enabled ON public.dataplans(enabled);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_dataplans_country_price
  ON public.dataplans(country_id, price)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_dataplans_status_price
  ON public.dataplans(status, price);

CREATE INDEX IF NOT EXISTS idx_dataplans_type_status
  ON public.dataplans(type, status);

-- GIN index for covered_countries array
CREATE INDEX IF NOT EXISTS idx_dataplans_covered_countries_gin
  ON public.dataplans USING GIN (covered_countries);

-- ============================================================
-- PART 4: USER ESIMS TABLE (Purchased SIM Cards)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_esims (
  -- Primary identifiers (synced from Firebase)
  id text NOT NULL,
  user_id text NOT NULL,
  iccid text,

  -- Plan reference (denormalized)
  plan_id text,
  plan_name text NOT NULL,
  country_id text,
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
  remaining_voice integer DEFAULT 0,
  remaining_sms integer DEFAULT 0,

  -- SIM lifecycle
  sim_status text DEFAULT 'NOT_ACTIVE',
  expired_at timestamp with time zone,
  activated_at timestamp with time zone,

  -- Usage sync tracking
  last_usage_sync timestamp with time zone,
  usage_sync_count integer DEFAULT 0,
  usage_sync_failed boolean DEFAULT false,
  usage_sync_error text,

  -- Purchase details (display only)
  purchase_price numeric NOT NULL,
  currency text DEFAULT 'USD',
  payment_provider text,
  purchase_status text DEFAULT 'pending',

  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  synced_at timestamp with time zone DEFAULT now(),
  firebase_updated_at timestamp with time zone,

  -- Constraints
  CONSTRAINT user_esims_pkey PRIMARY KEY (id),
  CONSTRAINT user_esims_sim_status_check CHECK (sim_status = ANY (ARRAY[
    'NOT_ACTIVE'::text, 'ACTIVE'::text, 'FINISHED'::text, 'EXPIRED'::text, 'UNKNOWN'::text
  ])),
  CONSTRAINT user_esims_purchase_status_check CHECK (purchase_status = ANY (ARRAY[
    'pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'refunded'::text
  ]))
);

-- Add computed columns (if table was just created)
DO $$
BEGIN
  -- Add data_used_mb computed column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_esims'
    AND column_name = 'data_used_mb'
  ) THEN
    ALTER TABLE public.user_esims ADD COLUMN data_used_mb integer
      GENERATED ALWAYS AS (
        CASE
          WHEN data_remaining_mb IS NULL THEN 0
          WHEN is_unlimited THEN 0
          ELSE GREATEST(0, data_total_mb - data_remaining_mb)
        END
      ) STORED;
  END IF;

  -- Add data_usage_percent computed column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_esims'
    AND column_name = 'data_usage_percent'
  ) THEN
    ALTER TABLE public.user_esims ADD COLUMN data_usage_percent numeric
      GENERATED ALWAYS AS (
        CASE
          WHEN is_unlimited THEN 0
          WHEN data_total_mb = 0 THEN 0
          WHEN data_remaining_mb IS NULL THEN 0
          ELSE ROUND((1 - (data_remaining_mb::numeric / data_total_mb)) * 100, 1)
        END
      ) STORED;
  END IF;
END $$;

-- Comments
COMMENT ON TABLE public.user_esims IS 'Read replica of Firebase orders. QR codes are NOT stored here.';
COMMENT ON COLUMN public.user_esims.id IS 'Same as Firebase orderId';
COMMENT ON COLUMN public.user_esims.iccid IS 'eSIM identifier - null until provisioned';
COMMENT ON COLUMN public.user_esims.data_remaining_mb IS 'Cached from Airalo API - may be stale';
COMMENT ON COLUMN public.user_esims.sim_status IS 'NOT_ACTIVE, ACTIVE, FINISHED, EXPIRED, UNKNOWN';
COMMENT ON COLUMN public.user_esims.purchase_price IS 'Display only - NOT for payment validation';

-- ============================================================
-- PART 5: USER ESIMS INDEXES
-- ============================================================

-- User dashboard queries
CREATE INDEX IF NOT EXISTS idx_user_esims_user_id ON public.user_esims(user_id);
CREATE INDEX IF NOT EXISTS idx_user_esims_user_created ON public.user_esims(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_esims_user_status ON public.user_esims(user_id, sim_status);

-- Active eSIMs needing sync
CREATE INDEX IF NOT EXISTS idx_user_esims_active_stale
  ON public.user_esims(sim_status, last_usage_sync)
  WHERE sim_status = 'ACTIVE';

-- ICCID lookup
CREATE INDEX IF NOT EXISTS idx_user_esims_iccid ON public.user_esims(iccid) WHERE iccid IS NOT NULL;

-- Analytics
CREATE INDEX IF NOT EXISTS idx_user_esims_country ON public.user_esims(country_id);
CREATE INDEX IF NOT EXISTS idx_user_esims_plan ON public.user_esims(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_esims_created_at ON public.user_esims(created_at);
CREATE INDEX IF NOT EXISTS idx_user_esims_completed ON public.user_esims(created_at) WHERE purchase_status = 'completed';

-- Expiration tracking
CREATE INDEX IF NOT EXISTS idx_user_esims_expiring
  ON public.user_esims(expired_at)
  WHERE sim_status = 'ACTIVE' AND expired_at IS NOT NULL;

-- ============================================================
-- PART 6: USAGE HISTORY TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.esim_usage_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  esim_id text NOT NULL,
  iccid text NOT NULL,
  data_remaining_mb integer,
  data_total_mb integer,
  data_used_mb integer,
  sim_status text,
  remaining_voice integer,
  remaining_sms integer,
  recorded_at timestamp with time zone DEFAULT now(),

  CONSTRAINT esim_usage_history_esim_id_fkey
    FOREIGN KEY (esim_id) REFERENCES public.user_esims(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.esim_usage_history IS 'Time-series usage snapshots for analytics';

CREATE INDEX IF NOT EXISTS idx_usage_history_esim_time ON public.esim_usage_history(esim_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_history_time ON public.esim_usage_history(recorded_at DESC);

-- ============================================================
-- PART 7: UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_user_esims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_esims_updated_at ON public.user_esims;
CREATE TRIGGER user_esims_updated_at
  BEFORE UPDATE ON public.user_esims
  FOR EACH ROW
  EXECUTE FUNCTION update_user_esims_updated_at();

-- ============================================================
-- PART 8: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.user_esims ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS user_esims_select_own ON public.user_esims;
DROP POLICY IF EXISTS user_esims_service_all ON public.user_esims;
DROP POLICY IF EXISTS user_esims_anon_deny ON public.user_esims;

-- Users can only see their own eSIMs
CREATE POLICY user_esims_select_own ON public.user_esims
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Service role can do everything (for sync jobs)
CREATE POLICY user_esims_service_all ON public.user_esims
  FOR ALL
  USING (auth.role() = 'service_role');

-- RLS for usage history
ALTER TABLE public.esim_usage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usage_history_service_all ON public.esim_usage_history;
CREATE POLICY usage_history_service_all ON public.esim_usage_history
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- PART 9: HELPER FUNCTIONS
-- ============================================================

-- Get eSIMs needing usage sync
CREATE OR REPLACE FUNCTION get_esims_needing_sync(
  max_count integer DEFAULT 100,
  stale_minutes integer DEFAULT 30
)
RETURNS TABLE (
  id text,
  iccid text,
  last_usage_sync timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ue.id,
    ue.iccid,
    ue.last_usage_sync
  FROM public.user_esims ue
  WHERE ue.sim_status = 'ACTIVE'
    AND ue.iccid IS NOT NULL
    AND (
      ue.last_usage_sync IS NULL
      OR ue.last_usage_sync < now() - (stale_minutes || ' minutes')::interval
    )
  ORDER BY ue.last_usage_sync ASC NULLS FIRST
  LIMIT max_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update usage from Airalo API
CREATE OR REPLACE FUNCTION update_esim_usage(
  p_esim_id text,
  p_remaining integer,
  p_total integer,
  p_status text,
  p_expired_at timestamp with time zone,
  p_is_unlimited boolean DEFAULT false,
  p_remaining_voice integer DEFAULT 0,
  p_remaining_sms integer DEFAULT 0,
  p_record_history boolean DEFAULT true
)
RETURNS void AS $$
DECLARE
  v_iccid text;
BEGIN
  -- Update the eSIM record
  UPDATE public.user_esims
  SET
    data_remaining_mb = p_remaining,
    data_total_mb = COALESCE(p_total, data_total_mb),
    sim_status = p_status,
    expired_at = p_expired_at,
    is_unlimited = COALESCE(p_is_unlimited, is_unlimited),
    remaining_voice = p_remaining_voice,
    remaining_sms = p_remaining_sms,
    last_usage_sync = now(),
    usage_sync_count = usage_sync_count + 1,
    usage_sync_failed = false,
    usage_sync_error = NULL,
    -- Set activated_at on first ACTIVE status
    activated_at = CASE
      WHEN activated_at IS NULL AND p_status = 'ACTIVE' THEN now()
      ELSE activated_at
    END
  WHERE id = p_esim_id
  RETURNING iccid INTO v_iccid;

  -- Record history if requested
  IF p_record_history AND v_iccid IS NOT NULL THEN
    INSERT INTO public.esim_usage_history (
      esim_id, iccid, data_remaining_mb, data_total_mb,
      data_used_mb, sim_status, remaining_voice, remaining_sms
    )
    VALUES (
      p_esim_id, v_iccid, p_remaining, p_total,
      GREATEST(0, COALESCE(p_total, 0) - COALESCE(p_remaining, 0)),
      p_status, p_remaining_voice, p_remaining_sms
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark usage sync as failed
CREATE OR REPLACE FUNCTION mark_usage_sync_failed(
  p_esim_id text,
  p_error text
)
RETURNS void AS $$
BEGIN
  UPDATE public.user_esims
  SET
    usage_sync_failed = true,
    usage_sync_error = p_error,
    last_usage_sync = now()
  WHERE id = p_esim_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PART 10: ANALYTICS VIEWS
-- ============================================================

-- eSIM summary by status
CREATE OR REPLACE VIEW public.v_esim_summary AS
SELECT
  sim_status,
  COUNT(*) as count,
  SUM(purchase_price) as total_revenue,
  ROUND(AVG(purchase_price)::numeric, 2) as avg_price,
  ROUND(AVG(data_usage_percent)::numeric, 1) as avg_data_usage_pct
FROM public.user_esims
WHERE purchase_status = 'completed'
GROUP BY sim_status;

-- Daily stats
CREATE OR REPLACE VIEW public.v_esim_daily_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as purchases,
  SUM(purchase_price) as revenue,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT country_id) as unique_countries
FROM public.user_esims
WHERE purchase_status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Country popularity
CREATE OR REPLACE VIEW public.v_esim_country_stats AS
SELECT
  country_id,
  country_name,
  COUNT(*) as purchase_count,
  SUM(purchase_price) as total_revenue,
  ROUND(AVG(purchase_price)::numeric, 2) as avg_order_value
FROM public.user_esims
WHERE purchase_status = 'completed'
GROUP BY country_id, country_name
ORDER BY purchase_count DESC;

-- Plan popularity
CREATE OR REPLACE VIEW public.v_esim_plan_stats AS
SELECT
  plan_id,
  plan_name,
  country_name,
  COUNT(*) as purchase_count,
  SUM(purchase_price) as total_revenue,
  ROUND(AVG(purchase_price)::numeric, 2) as avg_price
FROM public.user_esims
WHERE purchase_status = 'completed'
GROUP BY plan_id, plan_name, country_name
ORDER BY purchase_count DESC;

-- ============================================================
-- PART 11: VERIFICATION QUERIES
-- ============================================================

-- Run these to verify the schema was applied correctly:

SELECT 'Regions count: ' || COUNT(*)::text FROM public.regions;

SELECT 'Countries columns: ' || string_agg(column_name, ', ')
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'countries';

SELECT 'Dataplans indexes: ' || COUNT(*)::text
FROM pg_indexes WHERE tablename = 'dataplans';

SELECT 'user_esims table exists: ' ||
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_esims')
  THEN 'YES' ELSE 'NO' END;

SELECT 'esim_usage_history table exists: ' ||
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'esim_usage_history')
  THEN 'YES' ELSE 'NO' END;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
--
-- Next steps:
-- 1. Run the Firebase → Supabase migration script for countries/dataplans
-- 2. Set up webhook sync for user_esims
-- 3. Set up usage sync cron job
--
-- ============================================================
