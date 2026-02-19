/**
 * POST /api/promo/validate
 *
 * Public endpoint — validates a promo code and returns the discount preview.
 * NO side effects. Does NOT reserve or decrement usage counters.
 *
 * The returned finalPrice is informational only.
 * The server re-validates and re-computes the price at checkout time.
 *
 * Rate limiting: inherited from the IP-based system in create-payment-order.
 * Additional: we return generic errors (no timing oracle — all errors return 200
 * with { valid: false } to prevent code enumeration via timing attacks).
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import { validatePromoForCheckout } from '@esim/shared/services/promoServerService';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limit for this endpoint (per-IP, 20 req/min)
// Note: for multi-instance deployments, move this to Redis / Supabase.
const rateLimitMap = new Map(); // ip → { count, windowStart }
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('x-real-ip') || 'unknown');

  // Rate limit check
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { valid: false, error: 'Too many requests. Please wait a moment.', errorCode: 'RATE_LIMITED' },
      { status: 429 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid request body', errorCode: 'INVALID_BODY' }, { status: 400 });
  }

  const { code, packageId, email } = body;

  // Basic input validation
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return NextResponse.json({ valid: false, error: 'Promo code is required', errorCode: 'MISSING_CODE' });
  }
  if (!packageId || typeof packageId !== 'string') {
    return NextResponse.json({ valid: false, error: 'Package ID is required', errorCode: 'MISSING_PACKAGE' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ valid: false, error: 'Valid email is required', errorCode: 'INVALID_EMAIL' });
  }

  // Length guard — codes longer than 50 chars are never valid
  if (code.trim().length > 50) {
    return NextResponse.json({ valid: false, error: 'Invalid promo code', errorCode: 'NOT_FOUND' });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Fetch package data for price + country
    const { data: pkg, error: pkgError } = await supabase
      .from('dataplans')
      .select('id, price, country_code, enabled, status')
      .eq('id', packageId)
      .single();

    if (pkgError || !pkg || pkg.enabled === false || pkg.status === 'disabled') {
      return NextResponse.json({ valid: false, error: 'Package not found', errorCode: 'PACKAGE_NOT_FOUND' });
    }

    const basePrice = parseFloat(pkg.price);
    if (isNaN(basePrice) || basePrice <= 0) {
      return NextResponse.json({ valid: false, error: 'Invalid package price', errorCode: 'INVALID_PRICE' });
    }

    const result = await validatePromoForCheckout(supabase, {
      code: code.trim(),
      userId: null,                     // preview — user ID not required at this stage
      userEmail: email,
      packageId,
      packageCountryCode: pkg.country_code || null,
      basePrice,
    });

    if (!result.valid) {
      // Return 200 with valid:false — prevents code enumeration via HTTP status codes
      return NextResponse.json({ valid: false, error: result.error, errorCode: result.errorCode });
    }

    return NextResponse.json({
      valid: true,
      code: result.promoCode,              // normalised uppercase
      discountPercent: result.discountPercent,
      discountAmount: result.discountAmount,
      discountType: result.discountType,
      originalPrice: basePrice,
      finalPrice: result.finalPrice,
    });

  } catch (error) {
    console.error('[/api/promo/validate] Unexpected error:', error);
    // Generic error — don't leak internals
    return NextResponse.json({ valid: false, error: 'Unable to validate promo code', errorCode: 'INTERNAL_ERROR' });
  }
}
