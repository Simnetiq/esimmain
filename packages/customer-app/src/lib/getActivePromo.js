import { createClient } from '@supabase/supabase-js';

/**
 * Fetches the currently active promo code from Supabase.
 * Returns { code, discount_percent, discount_type, description } or null.
 * Server-side only — uses service role key.
 */
export async function getActivePromo() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('promo_codes')
    .select('code, discount_percent, discount_type, description')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
