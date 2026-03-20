import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { COUNTRY_TO_REGION } from '../../../lib/country-region-mapping.js';

// Map Airalo region type to our region IDs
function mapRegionType(regionType, countrySlug) {
  if (!regionType) return COUNTRY_TO_REGION[countrySlug] || null;

  const regionTypeLower = regionType.toLowerCase();

  if (regionTypeLower.includes('global')) return 'global';
  if (regionTypeLower.includes('europe')) return 'europe';
  if (regionTypeLower.includes('european union')) return 'european-union';
  if (regionTypeLower.includes('asia')) return 'asia';
  if (regionTypeLower.includes('africa')) return 'africa';
  if (regionTypeLower.includes('oceania')) return 'oceania';
  if (regionTypeLower.includes('north america')) return 'north-america';
  if (regionTypeLower.includes('south america')) return 'south-america';
  if (regionTypeLower.includes('latin america')) return 'latin-america';
  if (regionTypeLower.includes('caribbean')) return 'caribbean';
  if (regionTypeLower.includes('middle east')) return 'middle-east';

  return null;
}

// Parse SMS/Voice from short_info
function parseSmsVoiceFromInfo(shortInfo) {
  const result = { sms: 0, voice: 0 };
  if (!shortInfo) return result;

  const infoLower = shortInfo.toLowerCase();
  const smsMatch = infoLower.match(/(\d+)\s*sms/i);
  if (smsMatch) result.sms = parseInt(smsMatch[1]) || 0;

  const voiceMatch = infoLower.match(/(\d+)\s*(mins?|minutes?|voice|calls?)/i);
  if (voiceMatch) result.voice = parseInt(voiceMatch[1]) || 0;

  return result;
}

export async function POST(request) {
  console.log('🔄 Supabase Sync API: POST request received');

  try {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dry_run') === 'true';

    // Validate Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
      }, { status: 500 });
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      }
    });

    // Validate Airalo credentials
    const clientId = process.env.AIRALO_CLIENT_ID;
    const clientSecret = process.env.AIRALO_CLIENT_SECRET;
    const airaloBaseUrl = process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com';

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'Missing Airalo credentials. Please set AIRALO_CLIENT_ID and AIRALO_CLIENT_SECRET.'
      }, { status: 500 });
    }

    // Step 1: Authenticate with Airalo
    console.log('🔐 Authenticating with Airalo API...');
    const authResponse = await fetch(`${airaloBaseUrl}/v2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      })
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      return NextResponse.json({
        success: false,
        error: `Airalo authentication failed: ${errorText}`
      }, { status: 401 });
    }

    const authData = await authResponse.json();
    const accessToken = authData.data?.access_token;

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'No access token received from Airalo API'
      }, { status: 401 });
    }

    console.log('✅ Airalo authentication successful');

    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    };

    // Step 2: Fetch all packages with pagination
    console.log('📦 Fetching packages from Airalo API...');
    let apiPackages = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      console.log(`📄 Fetching page ${currentPage}...`);
      const response = await fetch(`${airaloBaseUrl}/v2/packages?include=topup&limit=100&page=${currentPage}`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch packages page ${currentPage}: ${response.statusText}`);
      }

      const data = await response.json();
      const pagePackages = data.data || [];
      apiPackages = apiPackages.concat(pagePackages);

      const meta = data.meta || {};
      const lastPage = meta.last_page || 1;

      if (currentPage >= lastPage || pagePackages.length === 0) {
        hasMorePages = false;
      } else {
        currentPage++;
      }

      if (currentPage > 100) {
        hasMorePages = false;
      }
    }

    console.log(`✅ Fetched ${apiPackages.length} country/region entries`);

    // Step 3: Flatten packages from nested structure
    const allPackages = [];
    const countriesMap = new Map();

    for (const countryData of apiPackages) {
      const countrySlug = countryData.slug;
      const countryCode = countryData.country_code;
      const countryTitle = countryData.title;
      const countryImage = countryData.image;

      // Track countries for later
      if (countrySlug && !countriesMap.has(countrySlug)) {
        countriesMap.set(countrySlug, {
          id: countrySlug,
          name: countryTitle,
          iso_code: countryCode,
          slug: countrySlug,
          image_url: countryImage?.url || countryImage || null,
          region_id: COUNTRY_TO_REGION[countrySlug] || null,
          is_active: true,
          is_regional: false
        });
      }

      const operators = countryData.operators || [];
      for (const operator of operators) {
        const packages = operator.packages || [];
        for (const pkg of packages) {
          allPackages.push({
            ...pkg,
            country: {
              slug: countrySlug,
              code: countryCode,
              title: countryTitle,
              image: countryImage
            },
            operator: {
              id: operator.id,
              title: operator.title,
              style: operator.style,
              gradient_start: operator.gradient_start,
              gradient_end: operator.gradient_end,
              type: operator.type,
              activation_policy: operator.activation_policy,
              coverages: operator.coverages,
              image: operator.image
            }
          });
        }
      }
    }

    console.log(`✅ Flattened to ${allPackages.length} packages`);
    console.log(`✅ Found ${countriesMap.size} countries`);

    // Step 4: Transform packages for Supabase
    const dataplans = [];
    const now = new Date().toISOString();

    for (const pkg of allPackages) {
      if (pkg.type === 'topup') continue; // Skip topups for now

      const packageId = pkg.slug || pkg.id?.toString();
      if (!packageId) continue;

      // Parse data amount (Airalo amount is always in MB)
      let dataAmountMB = 0;
      if (pkg.is_unlimited) {
        dataAmountMB = 999999;
      } else {
        dataAmountMB = parseFloat(pkg.amount) || 0;
      }

      const validityDays = parseInt(pkg.validity) || pkg.day || 30;
      const netPrice = parseFloat(pkg.price) || 0;

      // Get country info
      const countrySlug = pkg.country?.slug || '';
      const countryCoverages = pkg.operator?.coverages || [];

      // Build covered countries array
      let coveredCountries = [];
      if (pkg.countries && Array.isArray(pkg.countries) && pkg.countries.length > 0) {
        coveredCountries = pkg.countries.map(c => c.slug).filter(Boolean);
      } else if (countryCoverages.length > 1) {
        coveredCountries = countryCoverages.map(c => c.slug || c.name).filter(Boolean);
      } else if (countrySlug) {
        coveredCountries = [countrySlug];
      }

      const isRegional = coveredCountries.length > 1 || pkg.type === 'global';

      // Determine plan category
      let planCategory = 'country';
      if (pkg.type === 'global') {
        planCategory = 'global';
      } else if (isRegional) {
        planCategory = 'regional';
      }

      // Parse SMS/Voice
      let smsValue = parseInt(pkg.sms) || 0;
      let voiceValue = parseInt(pkg.voice) || parseInt(pkg.calls) || 0;
      if (smsValue === 0 && voiceValue === 0 && pkg.short_info) {
        const parsed = parseSmsVoiceFromInfo(pkg.short_info);
        smsValue = parsed.sms;
        voiceValue = parsed.voice;
      }

      // Determine region_id
      let regionId = null;
      if (isRegional && pkg.country?.title) {
        regionId = mapRegionType(pkg.country.title, countrySlug);
      } else if (countrySlug) {
        regionId = COUNTRY_TO_REGION[countrySlug] || null;
      }

      // Build data display string
      let dataDisplay = 'Unlimited';
      if (!pkg.is_unlimited && pkg.amount && pkg.amount_unit) {
        const amountGB = pkg.amount_unit.toUpperCase() === 'MB' ? pkg.amount / 1024 : pkg.amount;
        if (amountGB >= 1) {
          dataDisplay = `${amountGB} GB`;
        } else {
          dataDisplay = `${pkg.amount} ${pkg.amount_unit}`;
        }
      }

      dataplans.push({
        id: packageId,
        name: pkg.title,
        title: pkg.title,
        type: pkg.type || 'sim',
        plan_category: planCategory,
        country_id: isRegional ? null : countrySlug,
        country_name: pkg.country?.title || null,
        country_iso: pkg.country?.code || null,
        region_id: regionId,
        is_regional: isRegional,
        covered_countries: coveredCountries,
        covered_countries_count: coveredCountries.length,
        data_display: dataDisplay,
        data_amount_mb: dataAmountMB,
        is_unlimited: pkg.is_unlimited || false,
        validity_days: validityDays,
        has_voice: voiceValue > 0,
        voice_minutes: voiceValue,
        has_sms: smsValue > 0,
        sms_count: smsValue,
        price: netPrice,
        net_price: netPrice,
        currency: 'USD',
        operator_id: pkg.operator?.id?.toString() || null,
        operator_name: pkg.operator?.title || null,
        operator_image_url: pkg.operator?.image?.url || pkg.operator?.image || null,
        operator_style: pkg.operator?.style || 'light',
        operator_gradient_start: pkg.operator?.gradient_start || null,
        operator_gradient_end: pkg.operator?.gradient_end || null,
        activation_policy: pkg.operator?.activation_policy || 'first-usage',
        fair_usage_policy: pkg.fair_usage_policy || null,
        short_info: pkg.short_info || null,
        apn_type: pkg.apn_type || 'automatic',
        apn_value: pkg.apn_value || null,
        status: 'active',
        enabled: true,
        provider: 'airalo',
        synced_at: now
      });
    }

    console.log(`📊 Prepared ${dataplans.length} dataplans for Supabase`);

    // Prepare countries array
    const countries = Array.from(countriesMap.values()).map(c => ({
      ...c,
      synced_at: now
    }));

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `[DRY RUN] Would sync ${countries.length} countries and ${dataplans.length} dataplans to Supabase`,
        preview: {
          countries: countries.slice(0, 5),
          dataplans: dataplans.slice(0, 5),
          totalCountries: countries.length,
          totalDataplans: dataplans.length
        }
      });
    }

    // Step 5: Upsert to Supabase
    console.log('💾 Upserting countries to Supabase...');
    const { error: countriesError } = await supabase
      .from('countries')
      .upsert(countries, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (countriesError) {
      console.error('❌ Countries upsert error:', countriesError);
      return NextResponse.json({
        success: false,
        error: `Failed to sync countries: ${countriesError.message}`
      }, { status: 500 });
    }

    console.log(`✅ Synced ${countries.length} countries`);

    // Upsert dataplans in batches of 500
    console.log('💾 Upserting dataplans to Supabase...');
    const BATCH_SIZE = 500;
    let dataplanErrors = [];

    for (let i = 0; i < dataplans.length; i += BATCH_SIZE) {
      const batch = dataplans.slice(i, i + BATCH_SIZE);
      console.log(`📦 Upserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(dataplans.length / BATCH_SIZE)}...`);

      const { error: batchError } = await supabase
        .from('dataplans')
        .upsert(batch, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (batchError) {
        console.error(`❌ Batch error:`, batchError);
        dataplanErrors.push(batchError.message);
      }
    }

    if (dataplanErrors.length > 0) {
      console.warn(`⚠️ ${dataplanErrors.length} batch errors occurred`);
    }

    console.log(`✅ Synced ${dataplans.length} dataplans`);

    // Update country statistics
    console.log('📊 Updating country statistics...');
    const { error: statsError } = await supabase.rpc('update_country_stats');
    if (statsError) {
      console.warn('⚠️ Failed to update country stats:', statsError.message);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${countries.length} countries and ${dataplans.length} dataplans to Supabase`,
      details: {
        countries: { synced: countries.length },
        dataplans: { synced: dataplans.length },
        errors: dataplanErrors.length > 0 ? dataplanErrors : undefined
      }
    });

  } catch (error) {
    console.error('❌ Supabase sync error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// GET endpoint to check Supabase sync status
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase configuration'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Get counts
    const { count: countryCount } = await supabase
      .from('countries')
      .select('*', { count: 'exact', head: true });

    const { count: dataplanCount } = await supabase
      .from('dataplans')
      .select('*', { count: 'exact', head: true });

    const { count: activeDataplanCount } = await supabase
      .from('dataplans')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get last synced timestamp
    const { data: lastSynced } = await supabase
      .from('dataplans')
      .select('synced_at')
      .order('synced_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      status: {
        countries: countryCount || 0,
        dataplans: dataplanCount || 0,
        activeDataplans: activeDataplanCount || 0,
        lastSyncedAt: lastSynced?.synced_at || null
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
