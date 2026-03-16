import { createClient } from '@supabase/supabase-js';

let adminClient = null;

/**
 * Get or create a Supabase admin client (server-side only)
 * Uses the service role key for full database access
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase admin client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  adminClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

/**
 * Alias for getSupabaseAdmin — used by password-reset and similar routes
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getAdminDb() {
  return getSupabaseAdmin();
}

/**
 * Get Admin Auth - Supabase admin auth operations
 * @returns {{ updateUserById: Function }}
 */
export function getAdminAuth() {
  return getSupabaseAdmin().auth.admin;
}

/**
 * Verify a Supabase JWT token and get user data
 * @param {string} token - The JWT access token
 * @returns {Promise<{user: Object|null, error: Error|null}>}
 */
export async function verifySupabaseToken(token) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      return { user: null, error };
    }
    return { user, error: null };
  } catch (error) {
    return { user: null, error };
  }
}

export default getSupabaseAdmin;
