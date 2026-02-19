// Re-export the shared Supabase client so all admin components
// use the same auth session as AuthContext (cookie-based via @supabase/ssr)
import { getSupabase, supabase, isSupabaseAvailable } from '@esim/shared/lib/supabase';

export { getSupabase, isSupabaseAvailable, supabase };
export default supabase;
