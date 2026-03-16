import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from './supabaseAdmin';
import { timingSafeEqual } from 'crypto';

/**
 * Verify admin API key from Authorization header (timing-safe).
 * Returns null if authorized, or a NextResponse error if not.
 */
export function verifyAdminKey(request) {
  const expectedKey = process.env.ADMIN_SECRET_KEY;
  if (!expectedKey) {
    return NextResponse.json(
      { error: 'Server misconfiguration: ADMIN_SECRET_KEY not set' },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('authorization') || '';
  const providedKey = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  if (!providedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const a = Buffer.from(providedKey);
  const b = Buffer.from(expectedKey);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // authorized
}

/**
 * Verify user JWT from Authorization header via Supabase.
 * Returns { userId, error } where error is a NextResponse if auth fails.
 */
export async function verifyUserJWT(request) {
  const authHeader =
    request.headers.get('authorization') ||
    request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      userId: null,
      error: NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice(7);
  const supabase = getSupabaseAdmin();
  const {
    data: { user },
    error: jwtError,
  } = await supabase.auth.getUser(token);

  if (jwtError || !user) {
    return {
      userId: null,
      error: NextResponse.json(
        { error: 'Invalid or expired token', code: 'AUTH_INVALID' },
        { status: 401 }
      ),
    };
  }

  return { userId: user.id, error: null };
}

/**
 * Verify an internal/cron secret from Authorization header (timing-safe).
 * Checks CRON_SECRET env var.
 */
export function verifyCronSecret(request) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET not set' },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('authorization') || '';
  const providedSecret = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  if (!providedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const a = Buffer.from(providedSecret);
  const b = Buffer.from(expectedSecret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
