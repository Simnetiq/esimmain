import { createClient } from '@supabase/supabase-js';

let serverClient = null;

/**
 * Get a Supabase client for server-side data fetching (server components, generateMetadata, etc.)
 * Uses the anon key — safe for public read-only queries.
 * Falls back to NEXT_PUBLIC_ vars since we only need read access to public tables.
 */
export function getSupabaseServer() {
  if (serverClient) return serverClient;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  serverClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serverClient;
}
