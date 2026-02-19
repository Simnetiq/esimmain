/**
 * promoServerService.js — SERVER-ONLY promo validation & redemption.
 *
 * SECURITY CONTRACT:
 * - Import this file ONLY from Next.js Route Handlers (app/api/**) or server actions.
 * - NEVER import from client components or pages.
 * - All functions require a service-role Supabase client (getSupabaseAdmin()).
 * - The client NEVER computes discounted prices — only this service does.
 *
 * DB column reference (actual promo_codes schema):
 *   id, code, discount_type ('percentage'|'fixed'), discount_value,
 *   max_uses (global cap), current_uses, min_purchase, applicable_plans (text[]),
 *   is_active, expires_at, valid_from, max_uses_per_user, countries (text[]),
 *   created_by, metadata, created_at, updated_at
 */

const STRIPE_MIN_AMOUNT_USD = 0.50; // Stripe minimum chargeable amount

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Round to 2 decimal places — always use this, never raw float arithmetic */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Apply a promo discount to a base price.
 * Returns the final price floored at STRIPE_MIN_AMOUNT_USD.
 */
function applyDiscount(basePrice, discountType, discountValue) {
  let discountAmount;
  if (discountType === 'percentage') {
    discountAmount = round2(basePrice * discountValue / 100);
  } else if (discountType === 'fixed') {
    discountAmount = round2(Math.min(discountValue, basePrice - STRIPE_MIN_AMOUNT_USD));
  } else {
    discountAmount = 0;
  }
  discountAmount = Math.max(0, discountAmount);
  const finalPrice = round2(Math.max(STRIPE_MIN_AMOUNT_USD, basePrice - discountAmount));
  // Recompute actual discount after floor
  const actualDiscount = round2(basePrice - finalPrice);
  const actualPercent = basePrice > 0 ? round2((actualDiscount / basePrice) * 100) : 0;
  return { discountAmount: actualDiscount, finalPrice, discountPercent: actualPercent };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATE — read-only, no side effects
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a promo code for a given checkout context.
 * MUST be called with a service-role client (bypasses RLS for accurate counts).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Service role client
 * @param {object} opts
 * @param {string}      opts.code              - Raw promo code (normalised internally)
 * @param {string|null} opts.userId            - Authenticated user ID or null (guest)
 * @param {string}      opts.userEmail         - Customer email (required, normalised to lowercase)
 * @param {string}      opts.packageId         - eSIM package ID being purchased
 * @param {string|null} opts.packageCountryCode- Country code of the package (ISO 2-letter)
 * @param {number}      opts.basePrice         - Base price in USD (post-referral if applicable)
 *
 * @returns {Promise<
 *   | { valid: true; discountPercent: number; discountAmount: number; finalPrice: number;
 *         promoId: string; promoCode: string; discountType: string; discountValue: number }
 *   | { valid: false; error: string; errorCode: string }
 * >}
 */
export async function validatePromoForCheckout(supabase, {
  code,
  userId,
  userEmail,
  packageId,
  packageCountryCode,
  basePrice,
}) {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'No promo code provided', errorCode: 'MISSING_CODE' };
  }

  const normalizedCode = code.toUpperCase().trim();
  // null email = preview mode: structural validation only, per-user cap skipped.
  // Empty string also treated as preview (unauthenticated user).
  const normalizedEmail = userEmail ? userEmail.toLowerCase().trim() : null;
  const isPreview = !normalizedEmail;

  // ── 1. Fetch promo (service role bypasses RLS → sees even disabled codes) ──
  const { data: promo, error: fetchError } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', normalizedCode)
    .single();

  if (fetchError || !promo) {
    return { valid: false, error: 'Promo code not found', errorCode: 'NOT_FOUND' };
  }

  // ── 2. Active flag ──────────────────────────────────────────────────────────
  if (!promo.is_active) {
    return { valid: false, error: 'This promo code is no longer active', errorCode: 'INACTIVE' };
  }

  // ── 3. Date window ─────────────────────────────────────────────────────────
  const now = new Date();
  if (promo.valid_from && new Date(promo.valid_from) > now) {
    return { valid: false, error: 'This promo code is not yet active', errorCode: 'NOT_YET_ACTIVE' };
  }
  if (promo.expires_at && new Date(promo.expires_at) <= now) {
    return { valid: false, error: 'This promo code has expired', errorCode: 'EXPIRED' };
  }

  // ── 4. Global usage cap ─────────────────────────────────────────────────────
  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
    return { valid: false, error: 'This promo code is no longer available', errorCode: 'EXHAUSTED' };
  }

  // ── 5. Per-user usage cap (skipped in preview mode when email is null) ────
  const perUserLimit = promo.max_uses_per_user ?? 1; // default: once per user
  if (!isPreview && perUserLimit !== null) {
    const { count: userUseCount, error: countError } = await supabase
      .from('promo_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('promo_code_id', promo.id)
      .eq('user_email', normalizedEmail)
      .in('status', ['reserved', 'confirmed']);

    if (!countError && (userUseCount || 0) >= perUserLimit) {
      return { valid: false, error: 'You have already used this promo code', errorCode: 'ALREADY_USED' };
    }
  }

  // ── 6. Country restriction ─────────────────────────────────────────────────
  if (promo.countries && promo.countries.length > 0) {
    if (!packageCountryCode || !promo.countries.includes(packageCountryCode.toUpperCase())) {
      return { valid: false, error: 'This promo code is not valid for this plan', errorCode: 'COUNTRY_MISMATCH' };
    }
  }

  // ── 7. Plan restriction ────────────────────────────────────────────────────
  if (promo.applicable_plans && promo.applicable_plans.length > 0) {
    if (!packageId || !promo.applicable_plans.includes(packageId)) {
      return { valid: false, error: 'This promo code is not valid for this plan', errorCode: 'PLAN_MISMATCH' };
    }
  }

  // ── 8. Minimum purchase amount ─────────────────────────────────────────────
  if (promo.min_purchase !== null && basePrice < parseFloat(promo.min_purchase)) {
    return {
      valid: false,
      error: `This promo code requires a minimum purchase of $${parseFloat(promo.min_purchase).toFixed(2)}`,
      errorCode: 'BELOW_MINIMUM',
    };
  }

  // ── 9. Compute discount ────────────────────────────────────────────────────
  const { discountAmount, finalPrice, discountPercent } = applyDiscount(
    basePrice,
    promo.discount_type,
    parseFloat(promo.discount_value),
  );

  return {
    valid: true,
    promoId: promo.id,
    promoCode: promo.code,
    discountType: promo.discount_type,
    discountValue: parseFloat(promo.discount_value),
    discountPercent,
    discountAmount,
    finalPrice,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RESERVE — call at checkout session creation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reserve a promo code slot when a Stripe checkout session is created.
 * Uses an atomic DB function (row-level lock) to prevent race conditions.
 * Inserts a 'reserved' redemption row — confirmed later via webhook.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Service role client
 * @param {object} opts
 * @param {string}      opts.promoId
 * @param {string}      opts.promoCode
 * @param {string|null} opts.userId
 * @param {string}      opts.userEmail
 * @param {string}      opts.orderId
 * @param {number}      opts.originalPrice
 * @param {number}      opts.discountedPrice
 * @param {number}      opts.discountPercent
 * @param {number}      opts.discountAmount
 * @param {object}      [opts.metadata]
 *
 * @returns {Promise<{ success: true; redemptionId: string } | { success: false; error: string; errorCode: string }>}
 */
export async function reservePromo(supabase, {
  promoId,
  promoCode,
  userId,
  userEmail,
  orderId,
  originalPrice,
  discountedPrice,
  discountPercent,
  discountAmount,
  metadata = {},
}) {
  if (!userEmail) {
    return { success: false, error: 'Email is required to redeem a promo code', errorCode: 'MISSING_EMAIL' };
  }
  const normalizedEmail = userEmail.toLowerCase().trim();

  // ── Step 1: Atomic counter increment (row-locked, prevents over-redemption) ──
  const { data: reserveResult, error: rpcError } = await supabase
    .rpc('try_reserve_promo', { p_promo_id: promoId });

  if (rpcError) {
    console.error('[promoServerService] try_reserve_promo RPC error:', rpcError);
    return { success: false, error: 'Failed to reserve promo code', errorCode: 'RPC_ERROR' };
  }

  if (reserveResult === 'not_found') {
    return { success: false, error: 'Promo code not found', errorCode: 'NOT_FOUND' };
  }

  if (reserveResult === 'exhausted') {
    return { success: false, error: 'This promo code is no longer available', errorCode: 'EXHAUSTED' };
  }

  // ── Step 2: Insert redemption record (unique constraint catches per-user race) ──
  const { data: redemption, error: insertError } = await supabase
    .from('promo_redemptions')
    .insert({
      promo_code_id:    promoId,
      promo_code:       promoCode,
      user_id:          userId || null,
      user_email:       normalizedEmail,
      order_id:         orderId,
      status:           'reserved',
      original_price:   round2(originalPrice),
      discount_amount:  round2(discountAmount),
      discounted_price: round2(discountedPrice),
      discount_percent: round2(discountPercent),
      redeemed_at:      new Date().toISOString(),
      metadata,
    })
    .select('id')
    .single();

  if (insertError) {
    // Roll back the counter increment — someone else already used this code
    console.warn('[promoServerService] Insert failed, releasing reservation:', insertError.message);
    await supabase.rpc('release_promo_reservation', { p_promo_id: promoId });

    // Postgres unique violation = already used by this email
    if (insertError.code === '23505') {
      return { success: false, error: 'You have already used this promo code', errorCode: 'ALREADY_USED' };
    }
    return { success: false, error: 'Failed to record promo redemption', errorCode: 'INSERT_ERROR' };
  }

  return { success: true, redemptionId: redemption.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM — call from Stripe webhook on checkout.session.completed
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Confirm a promo reservation after successful payment.
 * Updates status from 'reserved' → 'confirmed'.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orderId
 */
export async function confirmPromoRedemption(supabase, orderId) {
  try {
    const { error } = await supabase
      .from('promo_redemptions')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .eq('status', 'reserved');

    if (error) {
      console.error('[promoServerService] confirmPromoRedemption error:', error);
    }
  } catch (err) {
    console.error('[promoServerService] confirmPromoRedemption unexpected error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RELEASE — call from Stripe webhook on payment failure / cancellation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Release a promo reservation after payment failure or cancellation.
 * Updates status to 'failed' and decrements the global counter so the slot
 * becomes available again.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orderId
 */
export async function releasePromoReservation(supabase, orderId) {
  try {
    // Find the reserved redemption for this order
    const { data: redemption, error: fetchError } = await supabase
      .from('promo_redemptions')
      .select('id, promo_code_id')
      .eq('order_id', orderId)
      .eq('status', 'reserved')
      .single();

    if (fetchError || !redemption) return; // Nothing to release

    // Mark as failed
    await supabase
      .from('promo_redemptions')
      .update({ status: 'failed' })
      .eq('id', redemption.id);

    // Decrement the counter (give the slot back)
    await supabase.rpc('release_promo_reservation', { p_promo_id: redemption.promo_code_id });
  } catch (err) {
    console.error('[promoServerService] releasePromoReservation unexpected error:', err);
  }
}
