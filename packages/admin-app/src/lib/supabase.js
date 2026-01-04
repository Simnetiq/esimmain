import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create Supabase client only if env vars are present
let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });
} else {
  console.warn(
    '⚠️ Missing Supabase environment variables.\n' +
    'Add to .env.local:\n' +
    '  NEXT_PUBLIC_SUPABASE_URL=your-supabase-url\n' +
    '  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key'
  );
}

export { supabase };
export default supabase;
