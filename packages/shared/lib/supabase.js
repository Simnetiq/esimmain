import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase client for browser/client-side usage
 * Uses the anon key for public read operations
 */
let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-client-info': '@esim/shared'
      }
    }
  });
} else if (typeof window !== 'undefined') {
  console.warn(
    '⚠️ Supabase client not initialized. Missing environment variables.\n' +
    'Add to .env.local:\n' +
    '  NEXT_PUBLIC_SUPABASE_URL=your-supabase-url\n' +
    '  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key'
  );
}

/**
 * Check if Supabase is available
 * @returns {boolean}
 */
export function isSupabaseAvailable() {
  return supabase !== null;
}

/**
 * Get Supabase client with safety check
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 * @throws {Error} if Supabase is not initialized
 */
export function getSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase client not initialized. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.'
    );
  }
  return supabase;
}

export { supabase };
export default supabase;
