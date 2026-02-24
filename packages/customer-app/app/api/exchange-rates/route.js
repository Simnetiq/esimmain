import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUPPORTED_TARGETS = ['EUR', 'GBP', 'ILS', 'RUB', 'BRL', 'CAD', 'AUD'];

export async function GET(request) {
  // Accept Vercel cron secret or manual secret
  const authHeader = request.headers.get('authorization');
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isManual = authHeader === `Bearer ${process.env.EXCHANGE_RATE_CRON_SECRET}`;

  if (!isVercelCron && !isManual) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return Response.json({ error: 'Missing Supabase config' }, { status: 500 });
  }

  const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;
  if (!appId) {
    return Response.json({ error: 'Missing OPEN_EXCHANGE_RATES_APP_ID' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const res = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${appId}&base=USD`,
      { next: { revalidate: 0 } }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OXR API returned ${res.status}: ${text}`);
    }

    const data = await res.json();
    const now = new Date().toISOString();

    const rows = SUPPORTED_TARGETS
      .filter((code) => data.rates?.[code])
      .map((code) => ({
        base_currency: 'USD',
        target_currency: code,
        rate: data.rates[code],
        source: 'openexchangerates',
        fetched_at: now,
      }));

    if (rows.length === 0) {
      throw new Error('No valid rates found in OXR response');
    }

    const { error } = await supabaseAdmin
      .from('exchange_rates')
      .upsert(rows, { onConflict: 'base_currency,target_currency' });

    if (error) throw error;

    return Response.json({ updated: rows.length, timestamp: now });
  } catch (err) {
    console.error('Exchange rate fetch failed:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
