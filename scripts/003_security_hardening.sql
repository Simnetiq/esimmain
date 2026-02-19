-- ============================================================
-- 003_security_hardening.sql — Checkout security hardening
-- Run in Supabase SQL editor (Project: eujmomonscnlmwcbkbfy)
-- ============================================================

-- ── 1. payment_errors — visibility into all internal server errors ───────────
-- Referenced in create-payment-order catch block but table never existed.
CREATE TABLE IF NOT EXISTS public.payment_errors (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  error        TEXT,
  stack        TEXT,
  ip           TEXT,
  user_agent   TEXT,
  user_id      UUID,
  email        TEXT,
  package_id   TEXT,
  order_id     TEXT,
  context      JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_errors_created_at ON public.payment_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_errors_ip         ON public.payment_errors(ip);

ALTER TABLE public.payment_errors ENABLE ROW LEVEL SECURITY;
-- Service role only — no anon/user access

-- ── 2. orders — add 'creating_esim' status ──────────────────────────────────
-- This status is used as a DB-level mutex to prevent concurrent eSIM creation
-- for the same order when both checkout.session.completed AND
-- payment_intent.succeeded webhooks fire simultaneously.
-- 
-- The atomic UPDATE-WHERE pattern:
--   UPDATE orders SET status='creating_esim'
--   WHERE id=$id AND esim_created=false
--   AND status NOT IN ('creating_esim','completed','esim_creation_failed')
-- Only one process wins this update; the loser gets 0 rows back and exits.

COMMENT ON COLUMN public.orders.status IS
  'pending | processing | creating_esim | completed | failed | esim_creation_failed | payment_mismatch | blocked | refunded | disputed';

-- ── 3. Useful index for webhook atomic mutex ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_esim_created ON public.orders(esim_created, status);

-- ── 4. fraud_warnings — used by handleEarlyFraudWarning ─────────────────────
CREATE TABLE IF NOT EXISTS public.fraud_warnings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  warning_id       TEXT        UNIQUE,      -- Stripe early_fraud_warning.id
  charge_id        TEXT,
  order_id         TEXT,
  user_id          UUID,
  email            TEXT,
  card_fingerprint TEXT,
  card_last4       TEXT,
  card_brand       TEXT,
  fraud_type       TEXT,
  actionable       BOOLEAN     DEFAULT false,
  reviewed         BOOLEAN     DEFAULT false,
  action           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_warnings_order_id ON public.fraud_warnings(order_id);
CREATE INDEX IF NOT EXISTS idx_fraud_warnings_reviewed  ON public.fraud_warnings(reviewed) WHERE reviewed = false;

ALTER TABLE public.fraud_warnings ENABLE ROW LEVEL SECURITY;
-- Service role only
