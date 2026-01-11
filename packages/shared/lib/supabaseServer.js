import { createClient } from '@supabase/supabase-js';

let supabaseServer = null;

/**
 * Get a Supabase client configured for server-side usage
 * Uses the service key for full database access
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseServer() {
  if (supabaseServer) {
    return supabaseServer;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Supabase server configuration missing. Required environment variables:\n' +
      '  SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)\n' +
      '  SUPABASE_SERVICE_KEY'
    );
  }

  supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabaseServer;
}

/**
 * Verify a Supabase JWT token and get user data
 * @param {string} token - The JWT access token
 * @returns {Promise<{user: Object|null, error: Error|null}>}
 */
export async function verifySupabaseToken(token) {
  try {
    const supabase = getSupabaseServer();

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      return { user: null, error };
    }

    return { user, error: null };
  } catch (error) {
    return { user: null, error };
  }
}

export default { getSupabaseServer, verifySupabaseToken };
