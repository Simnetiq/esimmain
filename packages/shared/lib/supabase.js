import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase client for browser/client-side usage
 * Uses @supabase/ssr createBrowserClient which stores auth in cookies
 * This is required for PKCE OAuth flow to work with server-side callback
 */
let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
} else if (typeof window !== 'undefined') {
  console.warn(
    '⚠️ Supabase client not initialized. Missing environment variables.\n' +
    'Add to .env.local:\n' +
    '  NEXT_PUBLIC_SUPABASE_URL=your-supabase-url\n' +
    '  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key'
  );
}

export function isSupabaseAvailable() {
  return supabase !== null;
}

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
