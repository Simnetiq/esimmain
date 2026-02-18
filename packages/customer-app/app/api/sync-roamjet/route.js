import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';

export async function POST(request) {
  try {
    const { countries_only } = await request.json().catch(() => ({}));
    
    const roamjetBaseUrl = process.env.ROAMJET_BASE_URL || 'https://api.roamjet.net';
    const supabase = getSupabaseAdmin();
    
    let countriesSynced = 0;
    let plansSynced = 0;

    // 1. Sync Countries
    const countriesResponse = await fetch(`${roamjetBaseUrl}/api/public/countries`, {
      method: 'GET', headers: { 'Accept': 'application/json' }
    });
    if (!countriesResponse.ok) throw new Error(`Failed to fetch countries: ${countriesResponse.statusText}`);
    const countriesResult = await countriesResponse.json();
    if (!countriesResult.success || !countriesResult.data?.countries) throw new Error('Invalid response from RoamJet countries API');

    const countries = countriesResult.data.countries;
    const now = new Date().toISOString();

    const countryUpserts = countries.filter(c => c.code).map(country => ({
      id: country.code,
      name: country.name || '', code: country.code,
      flag: country.flag || '', flag_emoji: country.flagEmoji || '',
      region: country.region || '', continent: country.continent || '',
      last_sync: now, sync_source: 'roamjet'
    }));

    if (countryUpserts.length > 0) {
      // Upsert in batches of 100
      for (let i = 0; i < countryUpserts.length; i += 100) {
        await supabase.from('countries').upsert(countryUpserts.slice(i, i + 100));
      }
      countriesSynced = countryUpserts.length;
    }

    if (countries_only) {
      return NextResponse.json({
        success: true, total_synced: countriesSynced,
        details: { countries_synced: countriesSynced }
      });
    }

    // 2. Sync Plans
    const plansResponse = await fetch(`${roamjetBaseUrl}/api/public/plans`, {
      method: 'GET', headers: { 'Accept': 'application/json' }
    });
    if (!plansResponse.ok) throw new Error(`Failed to fetch plans: ${plansResponse.statusText}`);
    const plansResult = await plansResponse.json();
    if (!plansResult.success || !plansResult.data?.plans) throw new Error('Invalid response from RoamJet plans API');

    const plans = plansResult.data.plans;

    const planUpserts = plans.filter(p => p.id || p.slug).map(plan => {
      const planId = plan.id || plan.slug;
      return {
        id: planId,
        slug: plan.slug || planId, name: plan.name || plan.title || '',
        title: plan.title || plan.name || '',
        price: parseFloat(plan.price) || 0,
        data: plan.data || plan.capacity || '',
        capacity: plan.capacity || plan.data || '',
        validity: plan.validity || plan.period || 0,
        validity_unit: plan.validity_unit || 'days',
        period: plan.period || plan.validity || 0,
        countries: plan.countries || plan.country_codes || [],
        country_codes: plan.country_codes || plan.countries || [],
        country_ids: plan.country_ids || [],
        operator: plan.operator || '', type: plan.type || 'data',
        is_unlimited: plan.is_unlimited || false,
        enabled: plan.enabled !== false,
        day: plan.day, amount: plan.amount,
        last_sync: now, sync_source: 'roamjet'
      };
    });

    if (planUpserts.length > 0) {
      for (let i = 0; i < planUpserts.length; i += 100) {
        await supabase.from('dataplans').upsert(planUpserts.slice(i, i + 100));
      }
      plansSynced = planUpserts.length;
    }

    // 3. Update country plan counts and min prices
    const statsResponse = await fetch(`${roamjetBaseUrl}/api/public/plans`, {
      method: 'GET', headers: { 'Accept': 'application/json' }
    });

    if (statsResponse.ok) {
      const statsResult = await statsResponse.json();
      const allPlans = statsResult.data?.plans || [];

      const countryStats = {};
      for (const plan of allPlans) {
        const countryCodes = plan.country_codes || plan.countries || [];
        const price = parseFloat(plan.price) || 0;
        for (const countryCode of countryCodes) {
          if (!countryStats[countryCode]) countryStats[countryCode] = { count: 0, prices: [] };
          countryStats[countryCode].count++;
          if (price > 0) countryStats[countryCode].prices.push(price);
        }
      }

      for (const [countryCode, stats] of Object.entries(countryStats)) {
        const minPrice = stats.prices.length > 0 ? Math.min(...stats.prices) : 0;
        await supabase.from('countries').update({
          plan_count: stats.count, min_price: minPrice, last_price_sync: now
        }).eq('id', countryCode);
      }
    }

    return NextResponse.json({
      success: true,
      total_synced: countriesSynced + plansSynced,
      details: { countries_synced: countriesSynced, plans_synced: plansSynced }
    });

  } catch {
    return NextResponse.json({ success: false, error: 'Failed to sync from RoamJet' }, { status: 500 });
  }
}
