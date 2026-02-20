/**
 * Push Token API — stores and deactivates Expo push tokens for mobile.
 * Uses the existing fcm_tokens table.
 *
 * POST  /api/push-token  — register / update token
 * DELETE /api/push-token — deactivate token on logout
 */
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * Verify Supabase JWT from Authorization header.
 * Returns the user object or null.
 */
async function verifyJWT(request, supabase) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    return error ? null : user;
  } catch {
    return null;
  }
}

export async function POST(request) {
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { token, platform, userId: bodyUserId } = body;

    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    // Prefer JWT-verified userId, fall back to body (for server-to-server calls)
    const jwtUser = await verifyJWT(request, supabase);
    const userId = jwtUser?.id || bodyUserId || null;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized — no valid user' }, { status: 401 });
    }

    const now = new Date().toISOString();

    // Upsert by token value — one row per token across all users
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert(
        {
          token,
          user_id: userId,
          platform: platform || 'unknown',
          active: true,
          updated_at: now,
          last_used_at: now,
        },
        {
          onConflict: 'token',
          ignoreDuplicates: false,
        }
      );

    if (error) {
      console.error('[push-token] Upsert error:', error.message);
      // Non-fatal — token registration failure should not block the user
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[push-token] POST error:', error.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { userId: bodyUserId, platform } = body;

    const jwtUser = await verifyJWT(request, supabase);
    const userId = jwtUser?.id || bodyUserId || null;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();

    // Deactivate all tokens for this user + platform on logout
    const query = supabase
      .from('fcm_tokens')
      .update({ active: false, updated_at: now })
      .eq('user_id', userId);

    if (platform) {
      query.eq('platform', platform);
    }

    const { error } = await query;
    if (error) {
      console.error('[push-token] Deactivate error:', error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[push-token] DELETE error:', error.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
