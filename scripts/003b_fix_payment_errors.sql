-- ============================================================
-- 003b_fix_payment_errors.sql — patch payment_errors table
--
-- Run this in Supabase SQL editor INSTEAD of 003 (which already
-- partially ran). Adds the missing columns and index.
-- ============================================================

-- Add columns that were missing from the partial table creation
ALTER TABLE public.payment_errors
  ADD COLUMN IF NOT EXISTS ip          TEXT,
  ADD COLUMN IF NOT EXISTS user_agent  TEXT,
  ADD COLUMN IF NOT EXISTS user_id     UUID,
  ADD COLUMN IF NOT EXISTS email       TEXT,
  ADD COLUMN IF NOT EXISTS package_id  TEXT,
  ADD COLUMN IF NOT EXISTS order_id    TEXT,
  ADD COLUMN IF NOT EXISTS context     JSONB DEFAULT '{}';

-- Now the indexes can be created safely
CREATE INDEX IF NOT EXISTS idx_payment_errors_created_at ON public.payment_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_errors_ip         ON public.payment_errors(ip);

-- Index for the webhook atomic mutex (from 003 — add if not there)
CREATE INDEX IF NOT EXISTS idx_orders_esim_created ON public.orders(esim_created, status);

-- fraud_warnings indexes (already created in 003, IF NOT EXISTS is safe to re-run)
CREATE INDEX IF NOT EXISTS idx_fraud_warnings_order_id ON public.fraud_warnings(order_id);
CREATE INDEX IF NOT EXISTS idx_fraud_warnings_reviewed  ON public.fraud_warnings(reviewed) WHERE reviewed = false;
