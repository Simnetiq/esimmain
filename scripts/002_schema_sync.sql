-- ============================================================
-- 002_schema_sync.sql — Bring DB in line with application code
--
-- Run in Supabase SQL editor (Project: eujmomonscnlmwcbkbfy)
-- Safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS guards).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ORDERS — add all columns the application code writes
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.orders
  -- Identity / deduplication
  ADD COLUMN IF NOT EXISTS order_id               TEXT,
  ADD COLUMN IF NOT EXISTS unique_order_id        TEXT,
  ADD COLUMN IF NOT EXISTS original_order_id      TEXT,
  -- Pricing
  ADD COLUMN IF NOT EXISTS amount                 NUMERIC(10,4),    -- final validated price (USD)
  ADD COLUMN IF NOT EXISTS customer_email         TEXT,
  ADD COLUMN IF NOT EXISTS customer_name          TEXT,
  ADD COLUMN IF NOT EXISTS user_email             TEXT,             -- alias kept for legacy reads
  -- Payment state
  ADD COLUMN IF NOT EXISTS payment_status         TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_completed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  -- Request context
  ADD COLUMN IF NOT EXISTS language               TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS is_test_mode           BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mode                   TEXT,
  ADD COLUMN IF NOT EXISTS source                 TEXT DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS platform               TEXT DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS quantity               TEXT DEFAULT '1',
  -- Geography
  ADD COLUMN IF NOT EXISTS country_region         TEXT,
  ADD COLUMN IF NOT EXISTS country_codes          TEXT[],
  ADD COLUMN IF NOT EXISTS is_regional            BOOLEAN DEFAULT false,
  -- Security audit columns (JSONB for flexibility)
  ADD COLUMN IF NOT EXISTS security               JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS price_validation       JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fraud_check            JSONB DEFAULT '{}',
  -- eSIM delivery
  ADD COLUMN IF NOT EXISTS esim_created           BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS esim_created_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS esim_error             TEXT,
  ADD COLUMN IF NOT EXISTS esim_error_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS airalo_order_data      JSONB,
  ADD COLUMN IF NOT EXISTS order_data             JSONB,
  ADD COLUMN IF NOT EXISTS iccid                  TEXT,
  ADD COLUMN IF NOT EXISTS qr_code                TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_url            TEXT,
  ADD COLUMN IF NOT EXISTS direct_apple_installation_url TEXT,
  ADD COLUMN IF NOT EXISTS matching_id            TEXT,
  ADD COLUMN IF NOT EXISTS activation_code        TEXT,
  ADD COLUMN IF NOT EXISTS smdp_address           TEXT,
  ADD COLUMN IF NOT EXISTS sim_data               JSONB,
  -- Payment method fingerprint (for fraud)
  ADD COLUMN IF NOT EXISTS payment_method_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS payment_method_last4   TEXT,
  ADD COLUMN IF NOT EXISTS payment_method_brand   TEXT,
  -- 3DS
  ADD COLUMN IF NOT EXISTS three_ds_attempts      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_three_ds_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS authentication_three_d_secure JSONB,
  -- Fraud flags
  ADD COLUMN IF NOT EXISTS fraud_blocked          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fraud_warning          JSONB,
  -- Refund / dispute
  ADD COLUMN IF NOT EXISTS refunded_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_amount          NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS disputed               BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispute                JSONB,
  -- Block flags
  ADD COLUMN IF NOT EXISTS blocked_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blocked_reason         TEXT,
  ADD COLUMN IF NOT EXISTS risk_level             TEXT,
  ADD COLUMN IF NOT EXISTS was_blocked_by_radar   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_card           TEXT,
  -- Failure info
  ADD COLUMN IF NOT EXISTS failure_reason         TEXT,
  ADD COLUMN IF NOT EXISTS failure_code           TEXT,
  ADD COLUMN IF NOT EXISTS decline_code           TEXT;

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_email       ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_unique_order_id      ON public.orders(unique_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status       ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_pi            ON public.orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_iccid                ON public.orders(iccid);

-- ────────────────────────────────────────────────────────────
-- 2. PAYMENT_ATTEMPTS — add fraud-tracking columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.payment_attempts
  ADD COLUMN IF NOT EXISTS package_id        TEXT,
  ADD COLUMN IF NOT EXISTS email             TEXT,
  ADD COLUMN IF NOT EXISTS ip                TEXT,
  ADD COLUMN IF NOT EXISTS user_agent        TEXT,
  ADD COLUMN IF NOT EXISTS submitted_price   NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS validated_price   NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS price_match       BOOLEAN,
  ADD COLUMN IF NOT EXISTS request_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blocked           BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS block_reason      TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_ip        ON public.payment_attempts(ip);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_email     ON public.payment_attempts(email);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_blocked   ON public.payment_attempts(blocked);

-- ────────────────────────────────────────────────────────────
-- 3. USER_ESIMS — per-user eSIM tracking (mirrors key orders columns)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_esims (
  id                              TEXT         PRIMARY KEY,
  user_id                         UUID         REFERENCES public.users(id),
  order_id                        TEXT,
  unique_order_id                 TEXT,
  original_order_id               TEXT,
  plan_id                         TEXT,
  plan_name                       TEXT,
  country                         TEXT,
  country_code                    TEXT,
  country_region                  TEXT,
  country_codes                   TEXT[],
  is_regional                     BOOLEAN      DEFAULT false,
  amount                          NUMERIC(10,4),
  currency                        TEXT         DEFAULT 'USD',
  customer_email                  TEXT,
  customer_name                   TEXT,
  user_email                      TEXT,
  status                          TEXT         DEFAULT 'pending',
  payment_status                  TEXT         DEFAULT 'pending',
  payment_completed_at            TIMESTAMPTZ,
  stripe_session_id               TEXT,
  stripe_payment_intent_id        TEXT,
  airalo_order_id                 TEXT,
  airalo_order_data               JSONB,
  esim_created                    BOOLEAN      DEFAULT false,
  esim_created_at                 TIMESTAMPTZ,
  completed_at                    TIMESTAMPTZ,
  esim_error                      TEXT,
  iccid                           TEXT,
  qr_code                         TEXT,
  qr_code_url                     TEXT,
  direct_apple_installation_url   TEXT,
  matching_id                     TEXT,
  activation_code                 TEXT,
  smdp_address                    TEXT,
  sim_data                        JSONB,
  language                        TEXT         DEFAULT 'en',
  source                          TEXT         DEFAULT 'web',
  platform                        TEXT         DEFAULT 'web',
  is_test_mode                    BOOLEAN      DEFAULT false,
  mode                            TEXT,
  security                        JSONB        DEFAULT '{}',
  price_validation                JSONB        DEFAULT '{}',
  fraud_check                     JSONB        DEFAULT '{}',
  metadata                        JSONB        DEFAULT '{}',
  created_at                      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_esims_user_id   ON public.user_esims(user_id);
CREATE INDEX IF NOT EXISTS idx_user_esims_status     ON public.user_esims(status);
CREATE INDEX IF NOT EXISTS idx_user_esims_iccid      ON public.user_esims(iccid);
CREATE INDEX IF NOT EXISTS idx_user_esims_email      ON public.user_esims(customer_email);

ALTER TABLE public.user_esims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_esims_own_read" ON public.user_esims;
CREATE POLICY "user_esims_own_read"
  ON public.user_esims FOR SELECT
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 4. BLOCKED_USERS — used by fraud detection service
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         REFERENCES public.users(id),
  email            TEXT,
  card_fingerprint TEXT,
  card_last4       TEXT,
  card_brand       TEXT,
  ip_address       TEXT,
  reason           TEXT,
  block_type       TEXT         DEFAULT 'manual',  -- manual | auto | radar
  severity         TEXT         DEFAULT 'medium',  -- low | medium | high | critical
  expires_at       TIMESTAMPTZ,
  created_by       TEXT,
  metadata         JSONB        DEFAULT '{}',
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id         ON public.blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_email           ON public.blocked_users(email);
CREATE INDEX IF NOT EXISTS idx_blocked_users_card_fingerprint ON public.blocked_users(card_fingerprint);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
-- Service role only

-- ────────────────────────────────────────────────────────────
-- 5. PROMO_CODES — add missing columns + name
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS name              TEXT,                  -- display name (admin UI)
  ADD COLUMN IF NOT EXISTS max_uses_per_user INTEGER DEFAULT NULL,  -- NULL = unlimited
  ADD COLUMN IF NOT EXISTS valid_from        TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS countries         TEXT[]  DEFAULT '{}';  -- empty = all countries

-- Backfill name from code for existing rows
UPDATE public.promo_codes SET name = code WHERE name IS NULL;

-- ────────────────────────────────────────────────────────────
-- 6. PROMO_REDEMPTIONS — new table for reservation lifecycle
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id    UUID        NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  promo_code       TEXT        NOT NULL,
  user_id          UUID        DEFAULT NULL,
  user_email       TEXT        NOT NULL,
  order_id         TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'reserved'
                               CHECK (status IN ('reserved', 'confirmed', 'failed', 'expired')),
  original_price   NUMERIC(10,2) NOT NULL,
  discount_amount  NUMERIC(10,2) NOT NULL,
  discounted_price NUMERIC(10,2) NOT NULL,
  discount_percent NUMERIC(5,2)  NOT NULL,
  redeemed_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  confirmed_at     TIMESTAMPTZ   DEFAULT NULL,
  metadata         JSONB         DEFAULT '{}'
);

-- One active redemption per code per email (prevents per-user race condition)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_promo_redemptions_active_per_email
  ON public.promo_redemptions (promo_code_id, user_email)
  WHERE status IN ('reserved', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code_id  ON public.promo_redemptions(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_email    ON public.promo_redemptions(user_email);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_order    ON public.promo_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_status   ON public.promo_redemptions(status);

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
-- Service role only — no anon/user access

-- ────────────────────────────────────────────────────────────
-- 7. RPC FUNCTIONS (atomic promo reservation)
-- ────────────────────────────────────────────────────────────

-- Atomic reserve: row-lock → check cap → increment
CREATE OR REPLACE FUNCTION public.try_reserve_promo(p_promo_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_max_uses     INTEGER;
  v_current_uses INTEGER;
BEGIN
  SELECT max_uses, current_uses
    INTO v_max_uses, v_current_uses
    FROM public.promo_codes
   WHERE id = p_promo_id
     FOR UPDATE;

  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v_max_uses IS NOT NULL AND v_current_uses >= v_max_uses THEN RETURN 'exhausted'; END IF;

  UPDATE public.promo_codes
     SET current_uses = current_uses + 1, updated_at = NOW()
   WHERE id = p_promo_id;

  RETURN 'ok';
END;
$$;

-- Release reservation (payment failed → decrement counter)
CREATE OR REPLACE FUNCTION public.release_promo_reservation(p_promo_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.promo_codes
     SET current_uses = GREATEST(0, current_uses - 1), updated_at = NOW()
   WHERE id = p_promo_id;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 8. RLS updates for promo_codes (anon read of active codes)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_codes_anon_read" ON public.promo_codes;
CREATE POLICY "promo_codes_anon_read"
  ON public.promo_codes FOR SELECT
  USING (is_active = true);
