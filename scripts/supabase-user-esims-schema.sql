-- ============================================================
-- SUPABASE SCHEMA: USER ESIMS (Purchased SIM Cards)
-- ============================================================
-- Purpose: Read replica for frontend display + usage cache
-- Source of Truth: Firebase orders/{orderId}
--
-- SECURITY: QR codes, activation codes, and payment credentials
--           are NEVER stored in this table.
-- ============================================================

-- ============================================================
-- 1. USER ESIMS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_esims (
  -- Primary identifiers (synced from Firebase)
  id text NOT NULL,                      -- Same as Firebase orderId
  user_id text NOT NULL,                 -- Firebase Auth UID
  iccid text,                            -- eSIM identifier (null until provisioned)

  -- Plan reference (denormalized for read performance)
  plan_id text,                          -- FK to dataplans (optional, for joins)
  plan_name text NOT NULL,               -- Denormalized for display
  country_id text,                       -- FK to countries (optional, for joins)
  country_name text,                     -- Denormalized for display
  is_regional boolean DEFAULT false,

  -- Data allocation (from purchase)
  data_total_mb integer NOT NULL,
  validity_days integer NOT NULL,
  has_voice boolean DEFAULT false,
  total_voice_minutes integer DEFAULT 0,
  has_sms boolean DEFAULT false,
  total_sms integer DEFAULT 0,
  is_unlimited boolean DEFAULT false,

  -- Usage cache (updated from Airalo API)
  data_remaining_mb integer,
  data_used_mb integer GENERATED ALWAYS AS (
    CASE
      WHEN data_remaining_mb IS NULL THEN 0
      WHEN is_unlimited THEN 0
      ELSE GREATEST(0, data_total_mb - data_remaining_mb)
    END
  ) STORED,
  data_usage_percent numeric GENERATED ALWAYS AS (
    CASE
      WHEN is_unlimited THEN 0
      WHEN data_total_mb = 0 THEN 0
      WHEN data_remaining_mb IS NULL THEN 0
      ELSE ROUND((1 - (data_remaining_mb::numeric / data_total_mb)) * 100, 1)
    END
  ) STORED,
  remaining_voice integer DEFAULT 0,
  remaining_sms integer DEFAULT 0,

  -- SIM lifecycle status (from Airalo API)
  sim_status text DEFAULT 'NOT_ACTIVE',
  expired_at timestamp with time zone,
  activated_at timestamp with time zone,

  -- Usage sync tracking
  last_usage_sync timestamp with time zone,
  usage_sync_count integer DEFAULT 0,
  usage_sync_failed boolean DEFAULT false,
  usage_sync_error text,

  -- Purchase details (display only - NOT for validation)
  purchase_price numeric NOT NULL,
  currency text DEFAULT 'USD',
  payment_provider text,                 -- stripe, coinbase
  purchase_status text DEFAULT 'pending',

  -- Sync metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  synced_at timestamp with time zone DEFAULT now(),
  firebase_updated_at timestamp with time zone,

  -- Constraints
  CONSTRAINT user_esims_pkey PRIMARY KEY (id),
  CONSTRAINT user_esims_sim_status_check CHECK (sim_status = ANY (ARRAY[
    'NOT_ACTIVE'::text,
    'ACTIVE'::text,
    'FINISHED'::text,
    'EXPIRED'::text,
    'UNKNOWN'::text
  ])),
  CONSTRAINT user_esims_purchase_status_check CHECK (purchase_status = ANY (ARRAY[
    'pending'::text,
    'processing'::text,
    'completed'::text,
    'failed'::text,
    'refunded'::text
  ]))
);

-- Add comments for documentation
COMMENT ON TABLE public.user_esims IS 'Read replica of Firebase orders for frontend display. QR codes and payment credentials are NOT stored here.';
COMMENT ON COLUMN public.user_esims.id IS 'Same as Firebase orderId - primary key for sync';
COMMENT ON COLUMN public.user_esims.user_id IS 'Firebase Auth UID - used for RLS and queries';
COMMENT ON COLUMN public.user_esims.iccid IS 'eSIM identifier from Airalo - null until provisioned';
COMMENT ON COLUMN public.user_esims.data_remaining_mb IS 'Cached from Airalo usage API - may be stale';
COMMENT ON COLUMN public.user_esims.data_used_mb IS 'Computed column: total - remaining';
COMMENT ON COLUMN public.user_esims.sim_status IS 'Lifecycle status: NOT_ACTIVE, ACTIVE, FINISHED, EXPIRED, UNKNOWN';
COMMENT ON COLUMN public.user_esims.last_usage_sync IS 'Timestamp of last successful Airalo usage API call';
COMMENT ON COLUMN public.user_esims.purchase_price IS 'Display only - NOT for payment validation';

-- ============================================================
-- 2. INDEXES FOR COMMON QUERIES
-- ============================================================

-- User's eSIM dashboard (primary query pattern)
CREATE INDEX IF NOT EXISTS idx_user_esims_user_id
  ON public.user_esims(user_id);

CREATE INDEX IF NOT EXISTS idx_user_esims_user_created
  ON public.user_esims(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_esims_user_status
  ON public.user_esims(user_id, sim_status);

-- Active eSIMs needing usage sync (cron job query)
CREATE INDEX IF NOT EXISTS idx_user_esims_active_stale
  ON public.user_esims(sim_status, last_usage_sync)
  WHERE sim_status = 'ACTIVE'
    AND (last_usage_sync IS NULL OR last_usage_sync < now() - interval '30 minutes');

-- ICCID lookup (for usage updates)
CREATE INDEX IF NOT EXISTS idx_user_esims_iccid
  ON public.user_esims(iccid)
  WHERE iccid IS NOT NULL;

-- Analytics: by country
CREATE INDEX IF NOT EXISTS idx_user_esims_country
  ON public.user_esims(country_id);

-- Analytics: by plan
CREATE INDEX IF NOT EXISTS idx_user_esims_plan
  ON public.user_esims(plan_id);

-- Analytics: time-series
CREATE INDEX IF NOT EXISTS idx_user_esims_created_at
  ON public.user_esims(created_at);

-- Expiration tracking (for notifications)
CREATE INDEX IF NOT EXISTS idx_user_esims_expiring
  ON public.user_esims(expired_at)
  WHERE sim_status = 'ACTIVE'
    AND expired_at IS NOT NULL;

-- Completed purchases only
CREATE INDEX IF NOT EXISTS idx_user_esims_completed
  ON public.user_esims(created_at)
  WHERE purchase_status = 'completed';

-- ============================================================
-- 3. ROW LEVEL SECURITY
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

-- Anon users cannot access
CREATE POLICY user_esims_anon_deny ON public.user_esims
  FOR ALL
  TO anon
  USING (false);

-- ============================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_user_esims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_esims_updated_at
  BEFORE UPDATE ON public.user_esims
  FOR EACH ROW
  EXECUTE FUNCTION update_user_esims_updated_at();

-- ============================================================
-- 5. USAGE HISTORY TABLE (Optional - for analytics)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.esim_usage_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  esim_id text NOT NULL,
  iccid text NOT NULL,

  -- Snapshot data at time of recording
  data_remaining_mb integer,
  data_total_mb integer,
  data_used_mb integer,
  sim_status text,
  remaining_voice integer,
  remaining_sms integer,

  -- Timestamp
  recorded_at timestamp with time zone DEFAULT now(),

  -- Reference (not enforced FK for performance)
  CONSTRAINT esim_usage_history_esim_id_fkey
    FOREIGN KEY (esim_id) REFERENCES public.user_esims(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.esim_usage_history IS 'Time-series usage snapshots for analytics and trend analysis';

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_usage_history_esim_time
  ON public.esim_usage_history(esim_id, recorded_at DESC);

-- Index for global time-series
CREATE INDEX IF NOT EXISTS idx_usage_history_time
  ON public.esim_usage_history(recorded_at DESC);

-- ============================================================
-- 6. ANALYTICS VIEWS
-- ============================================================

-- Summary view for admin dashboard
CREATE OR REPLACE VIEW public.esim_summary AS
SELECT
  sim_status,
  COUNT(*) as count,
  SUM(purchase_price) as total_revenue,
  AVG(purchase_price) as avg_price,
  AVG(data_usage_percent) as avg_data_usage
FROM public.user_esims
WHERE purchase_status = 'completed'
GROUP BY sim_status;

-- Daily purchases view
CREATE OR REPLACE VIEW public.esim_daily_stats AS
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

-- Country popularity view
CREATE OR REPLACE VIEW public.esim_country_stats AS
SELECT
  country_id,
  country_name,
  COUNT(*) as purchase_count,
  SUM(purchase_price) as total_revenue,
  AVG(purchase_price) as avg_order_value
FROM public.user_esims
WHERE purchase_status = 'completed'
GROUP BY country_id, country_name
ORDER BY purchase_count DESC;

-- ============================================================
-- 7. HELPER FUNCTIONS
-- ============================================================

-- Function to get eSIMs needing usage sync
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

-- Function to update usage from Airalo API response
CREATE OR REPLACE FUNCTION update_esim_usage(
  p_esim_id text,
  p_remaining integer,
  p_total integer,
  p_status text,
  p_expired_at timestamp with time zone,
  p_is_unlimited boolean,
  p_remaining_voice integer DEFAULT 0,
  p_remaining_sms integer DEFAULT 0
)
RETURNS void AS $$
BEGIN
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
    usage_sync_error = NULL
  WHERE id = p_esim_id;

  -- Optionally record history
  INSERT INTO public.esim_usage_history (
    esim_id, iccid, data_remaining_mb, data_total_mb,
    sim_status, remaining_voice, remaining_sms
  )
  SELECT
    id, iccid, p_remaining, COALESCE(p_total, data_total_mb),
    p_status, p_remaining_voice, p_remaining_sms
  FROM public.user_esims
  WHERE id = p_esim_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. FOREIGN KEY SETUP (Optional - adds after dataplans exists)
-- ============================================================

-- Run these after dataplans and countries tables are populated:
-- ALTER TABLE public.user_esims
--   ADD CONSTRAINT user_esims_plan_id_fkey
--   FOREIGN KEY (plan_id) REFERENCES public.dataplans(id);

-- ALTER TABLE public.user_esims
--   ADD CONSTRAINT user_esims_country_id_fkey
--   FOREIGN KEY (country_id) REFERENCES public.countries(id);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
