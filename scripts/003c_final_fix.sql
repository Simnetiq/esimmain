-- ============================================================
-- 003c_final_fix.sql — adds only the CONFIRMED missing columns
-- Verified against live DB before writing. Safe to run once.
-- ============================================================

-- fraud_warnings: has id, user_id, created_at — adding everything else
ALTER TABLE public.fraud_warnings
  ADD COLUMN IF NOT EXISTS warning_id       TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS charge_id        TEXT,
  ADD COLUMN IF NOT EXISTS order_id         TEXT,
  ADD COLUMN IF NOT EXISTS email            TEXT,
  ADD COLUMN IF NOT EXISTS card_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS card_last4       TEXT,
  ADD COLUMN IF NOT EXISTS card_brand       TEXT,
  ADD COLUMN IF NOT EXISTS fraud_type       TEXT,
  ADD COLUMN IF NOT EXISTS actionable       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS action           TEXT;

-- payment_errors: has id, user_id, order_id, created_at — adding everything else
ALTER TABLE public.payment_errors
  ADD COLUMN IF NOT EXISTS error      TEXT,
  ADD COLUMN IF NOT EXISTS stack      TEXT,
  ADD COLUMN IF NOT EXISTS ip         TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS email      TEXT,
  ADD COLUMN IF NOT EXISTS package_id TEXT,
  ADD COLUMN IF NOT EXISTS context    JSONB DEFAULT '{}';

-- Indexes (all IF NOT EXISTS — safe to re-run)
CREATE INDEX IF NOT EXISTS idx_fraud_warnings_order_id ON public.fraud_warnings(order_id);
CREATE INDEX IF NOT EXISTS idx_fraud_warnings_reviewed  ON public.fraud_warnings(reviewed) WHERE reviewed = false;
CREATE INDEX IF NOT EXISTS idx_payment_errors_created_at ON public.payment_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_errors_ip         ON public.payment_errors(ip);
CREATE INDEX IF NOT EXISTS idx_orders_esim_created       ON public.orders(esim_created, status);
