import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import { verifyAdminKey } from '@esim/shared/lib/apiAuth';

async function getAiraloAccessToken(clientId, clientSecret, baseUrl) {
  const authResponse = await fetch(`${baseUrl}/v2/token`, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' })
  });
  if (!authResponse.ok) throw new Error(`Authentication failed: ${authResponse.statusText} - ${await authResponse.text()}`);
  const authData = await authResponse.json();
  return authData.data?.access_token;
}

async function fetchAllPackages(baseUrl, accessToken, includeTopup = true) {
  const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${accessToken}` };
  let allPackages = [];
  let page = 1;
  let hasMore = true;
  const limit = 500;

  while (hasMore) {
    const url = new URL(`${baseUrl}/v2/packages`);
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('page', page.toString());
    if (includeTopup) url.searchParams.set('include', 'topup');

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) throw new Error(`Failed to fetch packages page ${page}: ${response.statusText}`);

    const data = await response.json();
    const countries = data.data || [];

    for (const country of countries) {
      for (const operator of (country.operators || [])) {
        for (const pkg of (operator.packages || [])) {
          allPackages.push({
            ...pkg,
            country_code: country.country_code, country_slug: country.slug,
            country_title: country.title, country_image: country.image?.url,
            operator_id: operator.id, operator_title: operator.title,
            operator_type: operator.type, operator_style: operator.style,
            operator_gradient_start: operator.gradient_start, operator_gradient_end: operator.gradient_end,
            operator_image: operator.image?.url, operator_is_prepaid: operator.is_prepaid,
            operator_is_roaming: operator.is_roaming, operator_apn_type: operator.apn_type,
            operator_apn_value: operator.apn_value, operator_apn: operator.apn,
            operator_info: operator.info, operator_coverages: operator.coverages,
            operator_plan_type: operator.plan_type, operator_activation_policy: operator.activation_policy,
            operator_rechargeability: operator.rechargeability,
          });
        }
      }
    }

    const meta = data.meta || {};
    hasMore = (meta.current_page || page) < (meta.last_page || 1);
    page++;
    if (page > 100) break;
  }

  return allPackages;
}

export async function GET(request) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;
  return handleSync(request, 'cron');
}
export async function POST(request) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;
  return handleSync(request, 'manual');
}

async function handleSync(request, source = 'manual') {
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();

  try {
    const { searchParams } = new URL(request.url);
    const countriesOnly = searchParams.get('countries_only') === 'true';
    const includeTopup = searchParams.get('include_topup') !== 'false';

    const clientId = process.env.AIRALO_CLIENT_ID;
    const clientSecret = process.env.AIRALO_CLIENT_SECRET;
    const airaloBaseUrl = process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com';

    if (!clientId || !clientSecret) {
      return NextResponse.json({ success: false, error: 'Airalo API configuration is missing.' }, { status: 500 });
    }

    const accessToken = await getAiraloAccessToken(clientId, clientSecret, airaloBaseUrl);
    if (!accessToken) return NextResponse.json({ success: false, error: 'No access token received from Airalo API' }, { status: 401 });

    let totalSynced = { countries: 0, packages: 0, topups: 0, deactivated: 0 };

    if (countriesOnly) {
      const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${accessToken}` };
      const countriesResponse = await fetch(`${airaloBaseUrl}/v2/countries`, { headers });
      if (!countriesResponse.ok) throw new Error(`Failed to fetch countries: ${countriesResponse.statusText}`);
      const countriesData = await countriesResponse.json();
      const countries = countriesData.data || [];

      for (const country of countries) {
        if (country.slug && country.title) {
          const { data: existing } = await supabase.from('countries').select('translations, photo, description, is_active').eq('id', country.slug).single();
          const existingData = existing || {};

          await supabase.from('countries').upsert({
            id: country.slug,
            name: country.title, code: country.slug, slug: country.slug, title: country.title,
            image: country.image?.url || '', status: 'active',
            updated_at: new Date().toISOString(), updated_by: 'airalo_sync', provider: 'airalo',
            translations: existingData.translations || {},
            photo: existingData.photo || country.image?.url || '',
            description: existingData.description || '',
            is_active: existingData.is_active !== false
          });
          totalSynced.countries++;
        }
      }

      await supabase.from('sync_logs').insert({
        created_at: new Date().toISOString(), countries_synced: totalSynced.countries,
        plans_synced: 0, status: 'completed',
        source: source === 'cron' ? 'hourly_cron' : 'admin_manual_sync',
        sync_type: 'countries_only_sync', provider: 'airalo', duration_ms: Date.now() - startTime
      });

      return NextResponse.json({ success: true, message: 'Successfully synced countries from Airalo API', total_synced: totalSynced.countries, details: { countries_synced: totalSynced.countries } });
    }

    const allPackages = await fetchAllPackages(airaloBaseUrl, accessToken, includeTopup);
    const receivedPackageIds = new Set(allPackages.map(p => p.id));

    // Process in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < allPackages.length; i += BATCH_SIZE) {
      const batch = allPackages.slice(i, i + BATCH_SIZE);
      const upsertData = batch.filter(pkg => pkg.id).map(pkg => {
        const originalPrice = parseFloat(pkg.price) || 0;
        return {
          id: pkg.id, slug: pkg.id, name: pkg.title || `${pkg.amount / 1024}GB - ${pkg.day} Days`,
          title: pkg.title, type: pkg.type || 'sim',
          amount: pkg.amount || 0, data_amount_mb: pkg.amount || 0,
          day: pkg.day || 0, validity: pkg.day || 0, validity_unit: 'days',
          is_unlimited: pkg.is_unlimited || false,
          price: originalPrice, original_price: originalPrice, net_price: originalPrice, currency: 'USD',
          country_code: pkg.country_code || '', country_slug: pkg.country_slug || '',
          country_title: pkg.country_title || '', country_image: pkg.country_image || '',
          operator_id: pkg.operator_id, operator: pkg.operator_title || '',
          operator_title: pkg.operator_title || '', operator_type: pkg.operator_type || 'local',
          operator_is_prepaid: pkg.operator_is_prepaid || false,
          operator_is_roaming: pkg.operator_is_roaming || false,
          operator_image: pkg.operator_image || '',
          operator_style: pkg.operator_style || 'light',
          operator_gradient_start: pkg.operator_gradient_start || '',
          operator_gradient_end: pkg.operator_gradient_end || '',
          apn_type: pkg.operator_apn_type || 'automatic',
          apn_value: pkg.operator_apn_value || '',
          apn: pkg.operator_apn || {},
          operator_info: pkg.operator_info || [], operator_coverages: pkg.operator_coverages || [],
          operator_plan_type: pkg.operator_plan_type || 'data',
          operator_activation_policy: pkg.operator_activation_policy || 'first-usage',
          operator_rechargeability: pkg.operator_rechargeability || false,
          short_info: pkg.short_info || '', qr_installation: pkg.qr_installation || '',
          manual_installation: pkg.manual_installation || '',
          status: 'active', enabled: true, provider: 'airalo',
          updated_at: new Date().toISOString(), synced_at: new Date().toISOString(),
          updated_by: 'airalo_sync', is_topup: pkg.type === 'topup',
        };
      });

      if (upsertData.length > 0) {
        await supabase.from('dataplans').upsert(upsertData);
      }

      for (const pkg of batch) {
        if (pkg.type === 'topup') totalSynced.topups++;
        else totalSynced.packages++;
      }
    }

    // Deactivate missing packages for cron syncs
    if (source === 'cron' && allPackages.length > 100) {
      const { data: existingPackages } = await supabase
        .from('dataplans')
        .select('id')
        .eq('provider', 'airalo')
        .eq('status', 'active');

      const toDeactivate = (existingPackages || []).filter(p => !receivedPackageIds.has(p.id)).map(p => p.id);
      
      if (toDeactivate.length > 0) {
        await supabase
          .from('dataplans')
          .update({ status: 'out_of_stock', enabled: false, updated_at: new Date().toISOString(), deactivated_at: new Date().toISOString(), deactivated_reason: 'Not found in Airalo API response' })
          .in('id', toDeactivate.slice(0, 400));
        totalSynced.deactivated = Math.min(toDeactivate.length, 400);
      }
    }

    await supabase.from('sync_logs').insert({
      created_at: new Date().toISOString(), countries_synced: 0,
      plans_synced: totalSynced.packages, topups_synced: totalSynced.topups,
      deactivated: totalSynced.deactivated, status: 'completed',
      source: source === 'cron' ? 'hourly_cron' : 'admin_manual_sync',
      sync_type: 'packages_sync', provider: 'airalo',
      duration_ms: Date.now() - startTime, total_packages_from_api: allPackages.length
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    return NextResponse.json({
      success: true,
      message: `Successfully synced ${totalSynced.packages} packages and ${totalSynced.topups} topups from Airalo API`,
      total_synced: totalSynced.packages + totalSynced.topups,
      details: { packages_synced: totalSynced.packages, topups_synced: totalSynced.topups, deactivated: totalSynced.deactivated, duration_seconds: parseFloat(duration) }
    });

  } catch (error) {
    console.error('[Airalo Sync] Error:', error);
    try {
      await supabase.from('sync_logs').insert({ created_at: new Date().toISOString(), status: 'failed', error: error.message, source: source === 'cron' ? 'hourly_cron' : 'admin_manual_sync', provider: 'airalo', duration_ms: Date.now() - startTime });
    } catch (logError) { console.error('[Airalo Sync] Failed to log error:', logError); }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
