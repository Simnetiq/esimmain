-- ============================================================
-- PROMO CODE SYSTEM — Migration
-- Run in Supabase SQL editor (Project: eujmomonscnlmwcbkbfy)
-- ============================================================

-- 1. Extend promo_codes with missing columns
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS max_uses_per_user INTEGER DEFAULT NULL,   -- NULL = unlimited per user
  ADD COLUMN IF NOT EXISTS valid_from        TIMESTAMPTZ DEFAULT NULL, -- NULL = active immediately
  ADD COLUMN IF NOT EXISTS countries         TEXT[] DEFAULT '{}';    -- empty = all countries

-- 2. promo_redemptions — tracks every usage (reserved + confirmed)
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id    UUID        NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  promo_code       TEXT        NOT NULL,             -- denormalised for audit logs
  user_id          UUID        DEFAULT NULL,         -- NULL for guest checkout
  user_email       TEXT        NOT NULL,             -- normalised to lowercase
  order_id         TEXT        NOT NULL,             -- references orders.id
  status           TEXT        NOT NULL DEFAULT 'reserved'  -- reserved | confirmed | failed | expired
                                CHECK (status IN ('reserved', 'confirmed', 'failed', 'expired')),
  original_price   NUMERIC(10,2) NOT NULL,
  discount_amount  NUMERIC(10,2) NOT NULL,
  discounted_price NUMERIC(10,2) NOT NULL,
  discount_percent NUMERIC(5,2)  NOT NULL,
  redeemed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at     TIMESTAMPTZ DEFAULT NULL,
  metadata         JSONB       DEFAULT '{}'
);

-- Per-user uniqueness: one active redemption per code per email
-- (allows a new reservation if the old one expired/failed)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_promo_redemptions_active_per_email
  ON public.promo_redemptions (promo_code_id, user_email)
  WHERE status IN ('reserved', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code_id  ON public.promo_redemptions(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_email    ON public.promo_redemptions(user_email);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_order_id ON public.promo_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_status   ON public.promo_redemptions(status);

-- 3. Atomic promo reservation: locks the row, checks cap, increments counter
--    Returns: 'ok' | 'exhausted' | 'not_found'
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
     FOR UPDATE;              -- row-level lock prevents concurrent over-redemption

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF v_max_uses IS NOT NULL AND v_current_uses >= v_max_uses THEN
    RETURN 'exhausted';
  END IF;

  UPDATE public.promo_codes
     SET current_uses = current_uses + 1,
         updated_at   = NOW()
   WHERE id = p_promo_id;

  RETURN 'ok';
END;
$$;

-- 4. Release a reservation (on payment failure / expiry)
CREATE OR REPLACE FUNCTION public.release_promo_reservation(p_promo_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.promo_codes
     SET current_uses = GREATEST(0, current_uses - 1),
         updated_at   = NOW()
   WHERE id = p_promo_id;
END;
$$;

-- 5. RLS — promo_redemptions is service-role only (no anon access)
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
-- No permissive policies → only service role (which bypasses RLS) can access it.

-- 6. RLS — promo_codes: anon can read active codes for validation preview
--    but cannot write. All writes via service role.
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_codes_anon_read" ON public.promo_codes;
CREATE POLICY "promo_codes_anon_read"
  ON public.promo_codes FOR SELECT
  USING (is_active = true);
