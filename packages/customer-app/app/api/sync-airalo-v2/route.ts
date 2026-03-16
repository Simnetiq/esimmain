import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminKey, verifyCronSecret } from '@esim/shared/lib/apiAuth';

// All config from environment — no hardcoded values
function getEnvOrFail(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing environment variable: ${key}`);
  return val;
}

function getSupabase() {
  return createClient(
    getEnvOrFail('SUPABASE_URL'),
    getEnvOrFail('SUPABASE_SERVICE_ROLE_KEY')
  );
}

async function getAiraloAccessToken(): Promise<string> {
  const clientId = getEnvOrFail('AIRALO_CLIENT_ID');
  const clientSecret = getEnvOrFail('AIRALO_CLIENT_SECRET');
  const baseUrl = process.env.AIRALO_BASE_URL || process.env.AIRALO_BASE_URL_SANDBOX;
  if (!baseUrl) throw new Error('Missing AIRALO_BASE_URL or AIRALO_BASE_URL_SANDBOX');

  const res = await fetch(`${baseUrl}/v2/token`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Airalo auth failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const token = data.data?.access_token;
  if (!token) throw new Error('No access_token in Airalo response');
  return token;
}

interface AiraloPackage {
  id: string;
  title: string;
  type: string;
  amount: number;
  day: number;
  price: number;
  is_unlimited: boolean;
  short_info?: string;
  qr_installation?: string;
  manual_installation?: string;
  [key: string]: unknown;
}

interface AiraloOperator {
  id: number;
  title: string;
  type: string;
  style: string;
  gradient_start: string;
  gradient_end: string;
  image?: { url: string };
  is_prepaid: boolean;
  is_roaming: boolean;
  apn_type: string;
  apn_value: string;
  apn: Record<string, unknown>;
  info: unknown[];
  coverages: unknown[];
  plan_type: string;
  activation_policy: string;
  rechargeability: boolean;
  packages: AiraloPackage[];
}

interface AiraloCountry {
  country_code: string;
  slug: string;
  title: string;
  image?: { url: string };
  operators: AiraloOperator[];
}

async function fetchAllPackages(baseUrl: string, token: string) {
  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const allPackages: Array<AiraloPackage & {
    country_code: string;
    country_slug: string;
    country_title: string;
    country_image: string;
    operator_id: number;
    operator_title: string;
    operator_type: string;
    operator_style: string;
    operator_gradient_start: string;
    operator_gradient_end: string;
    operator_image: string;
    operator_is_prepaid: boolean;
    operator_is_roaming: boolean;
    operator_apn_type: string;
    operator_plan_type: string;
    operator_activation_policy: string;
    operator_rechargeability: boolean;
  }> = [];

  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 100) {
    const url = new URL(`${baseUrl}/v2/packages`);
    url.searchParams.set('limit', '500');
    url.searchParams.set('page', String(page));
    url.searchParams.set('include', 'topup');

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) throw new Error(`Packages page ${page} failed: ${res.status}`);

    const data = await res.json();
    const countries: AiraloCountry[] = data.data || [];

    for (const country of countries) {
      for (const op of country.operators || []) {
        for (const pkg of op.packages || []) {
          allPackages.push({
            ...pkg,
            country_code: country.country_code,
            country_slug: country.slug,
            country_title: country.title,
            country_image: country.image?.url || '',
            operator_id: op.id,
            operator_title: op.title,
            operator_type: op.type,
            operator_style: op.style,
            operator_gradient_start: op.gradient_start,
            operator_gradient_end: op.gradient_end,
            operator_image: op.image?.url || '',
            operator_is_prepaid: op.is_prepaid,
            operator_is_roaming: op.is_roaming,
            operator_apn_type: op.apn_type,
            operator_plan_type: op.plan_type,
            operator_activation_policy: op.activation_policy,
            operator_rechargeability: op.rechargeability,
          });
        }
      }
    }

    const meta = data.meta || {};
    hasMore = (meta.current_page || page) < (meta.last_page || 1);
    page++;
  }

  return allPackages;
}

async function handleSync(source: string) {
  const startTime = Date.now();
  const supabase = getSupabase();
  const baseUrl = process.env.AIRALO_BASE_URL || process.env.AIRALO_BASE_URL_SANDBOX;
  if (!baseUrl) throw new Error('Missing AIRALO_BASE_URL');

  // 1. Auth with Airalo
  const token = await getAiraloAccessToken();

  // 2. Fetch all packages
  const allPackages = await fetchAllPackages(baseUrl, token);
  const receivedIds = new Set(allPackages.map(p => p.id));

  // 3. Upsert to Supabase in batches
  let synced = 0;
  let topups = 0;
  const BATCH = 200;

  for (let i = 0; i < allPackages.length; i += BATCH) {
    const batch = allPackages.slice(i, i + BATCH).map(pkg => ({
      id: pkg.id,
      name: pkg.title || `${(pkg.amount || 0) / 1024}GB - ${pkg.day} Days`,
      title: pkg.title,
      country_name: pkg.country_title,
      country_iso: pkg.country_code,
      data_amount_mb: pkg.amount || 0,
      is_unlimited: pkg.is_unlimited || false,
      validity_days: pkg.day || 0,
      price: parseFloat(String(pkg.price)) || 0,
      net_price: parseFloat(String(pkg.price)) || 0,
      currency: 'USD',
      operator_id: String(pkg.operator_id),
      operator_name: pkg.operator_title,
      operator_image_url: pkg.operator_image,
      operator_style: pkg.operator_style,
      operator_gradient_start: pkg.operator_gradient_start,
      operator_gradient_end: pkg.operator_gradient_end,
      activation_policy: pkg.operator_activation_policy,
      apn_type: pkg.operator_apn_type,
      status: 'active',
      provider: 'airalo',
      package_type: pkg.type || 'sim',
      plan_type: ['global', 'regional'].includes(pkg.operator_type) ? 'regional' : 'country',
      is_enabled: true,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('dataplans')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`Batch upsert error at offset ${i}:`, error.message);
    } else {
      for (const pkg of allPackages.slice(i, i + BATCH)) {
        if (pkg.type === 'topup') topups++;
        else synced++;
      }
    }
  }

  // 4. Deactivate packages no longer in Airalo response
  let deactivated = 0;
  if (allPackages.length > 100) {
    const { data: existing } = await supabase
      .from('dataplans')
      .select('id')
      .eq('provider', 'airalo')
      .eq('status', 'active');

    if (existing) {
      const toDeactivate = existing.filter(p => !receivedIds.has(p.id)).map(p => p.id);
      if (toDeactivate.length > 0) {
        for (let i = 0; i < toDeactivate.length; i += BATCH) {
          const ids = toDeactivate.slice(i, i + BATCH);
          await supabase
            .from('dataplans')
            .update({
              status: 'out_of_stock',
              is_enabled: false,
              updated_at: new Date().toISOString(),
            })
            .in('id', ids);
        }
        deactivated = toDeactivate.length;
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const now = new Date().toISOString();

  // Record last_synced_at so we can monitor sync health
  try {
    await supabase.from('app_config').upsert({
      id: 'airalo_sync',
      key: 'airalo_sync',
      value: {
        last_synced_at: now,
        packages_synced: synced,
        topups_synced: topups,
        deactivated,
        total_from_api: allPackages.length,
        duration_seconds: parseFloat((durationMs / 1000).toFixed(2)),
        source,
      },
      updated_at: now,
    });
  } catch (e) {
    console.warn('[Airalo Sync v2] Failed to record last_synced_at:', (e as Error).message);
  }

  return {
    success: true,
    packages_synced: synced,
    topups_synced: topups,
    deactivated,
    total_from_api: allPackages.length,
    duration_seconds: (durationMs / 1000).toFixed(2),
    last_synced_at: now,
    source,
  };
}

// GET for Vercel cron
export async function GET(request: NextRequest) {
  const cronError = verifyCronSecret(request);
  if (cronError) return cronError;

  try {
    const result = await handleSync('cron');
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Airalo Sync v2] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST for manual triggers
export async function POST(request: NextRequest) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  try {
    const result = await handleSync('manual');
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Airalo Sync v2] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
