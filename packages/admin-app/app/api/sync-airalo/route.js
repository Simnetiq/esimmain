import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  console.log('🔄 Sync API: POST request received');
  
  try {
    const { searchParams } = new URL(request.url);
    const countriesOnly = searchParams.get('countries_only') === 'true';
    const removeDeprecated = searchParams.get('remove_deprecated') !== 'false';
    const dryRun = searchParams.get('dry_run') === 'true';
    
    console.log('🔄 Sync options:', { countriesOnly, removeDeprecated, dryRun });
    
    // Get Airalo API configuration
    const clientId = process.env.AIRALO_CLIENT_ID;
    const clientSecret = process.env.AIRALO_CLIENT_SECRET;
    const airaloBaseUrl = process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com';
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'Airalo API configuration is missing.',
        debug: { hasClientId: !!clientId, hasClientSecret: !!clientSecret }
      }, { status: 500 });
    }
    
    // Step 1: Authenticate with Airalo OAuth2
    console.log('🔄 Authenticating with Airalo API...');
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
        error: `Airalo authentication failed (${authResponse.status}): ${errorText}`
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
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    };
    
    let syncStats = { 
      countries: { added: 0, updated: 0, removed: 0 }, 
      packages: { added: 0, updated: 0, removed: 0, total_from_api: 0 }
    };
    
    try {
      // Fetch ALL packages with pagination
      let apiPackages = [];
      let currentPage = 1;
      let hasMorePages = true;
      const limit = 100;
      
      while (hasMorePages) {
        const packagesResponse = await fetch(`${airaloBaseUrl}/v2/packages?include=topup&limit=${limit}&page=${currentPage}`, { headers });
        
        if (!packagesResponse.ok) {
          throw new Error(`Failed to fetch packages (page ${currentPage}): ${packagesResponse.statusText}`);
        }
        
        const packagesData = await packagesResponse.json();
        
        let pagePackages = Array.isArray(packagesData.data) ? packagesData.data : (Array.isArray(packagesData) ? packagesData : []);
        apiPackages = apiPackages.concat(pagePackages);
        console.log(`✅ Page ${currentPage}: ${pagePackages.length} packages (total: ${apiPackages.length})`);
        
        const meta = packagesData.meta || {};
        const lastPage = meta.last_page || meta.lastPage || 1;
        
        if (currentPage >= lastPage || pagePackages.length === 0) {
          hasMorePages = false;
        } else {
          currentPage++;
        }
        
        if (currentPage > 100) {
          hasMorePages = false;
        }
      }
      
      // Flatten packages from country → operator → package structure
      const allPackages = [];
      for (const countryData of apiPackages) {
        const operators = countryData.operators || [];
        for (const operator of operators) {
          const packages = operator.packages || [];
          for (const pkg of packages) {
            allPackages.push({
              ...pkg,
              id: pkg.id,
              slug: pkg.slug || pkg.id?.toString(),
              country: {
                slug: countryData.slug,
                code: countryData.country_code,
                title: countryData.title,
                image: countryData.image ? { url: countryData.image } : null
              },
              operator: {
                id: operator.id,
                title: operator.title,
                style: operator.style,
                gradient_start: operator.gradient_start,
                gradient_end: operator.gradient_end,
                type: operator.type,
                is_roaming: operator.is_roaming,
                is_prepaid: operator.is_prepaid,
                plan_type: operator.plan_type,
                activation_policy: operator.activation_policy,
                rechargeability: operator.rechargeability,
                info: operator.info,
                coverages: operator.coverages,
                image: operator.image ? { url: operator.image } : null
              }
            });
          }
        }
      }
      
      apiPackages = allPackages;
      console.log(`✅ Flattened to ${apiPackages.length} individual packages`);

      // Extract countries
      let countries = [];
      try {
        const countriesResponse = await fetch(`${airaloBaseUrl}/v2/countries`, { headers });
        if (countriesResponse.ok) {
          const countriesData = await countriesResponse.json();
          countries = countriesData.data || [];
        }
      } catch {}
      
      if (countries.length === 0) {
        const countryMap = new Map();
        for (const pkg of apiPackages) {
          if (pkg.country?.slug && pkg.country?.title) {
            countryMap.set(pkg.country.slug, {
              slug: pkg.country.slug,
              title: pkg.country.title,
              image: pkg.country.image
            });
          }
        }
        countries = Array.from(countryMap.values());
      }
      
      if (countriesOnly) {
        // Countries-only sync to Supabase
        for (const country of countries) {
          if (country.slug && country.title) {
            const { data: existing } = await supabaseAdmin
              .from('countries')
              .select('id')
              .eq('id', country.slug)
              .single();

            const payload = {
              id: country.slug,
              name: country.title,
              iso_code: country.slug,
              slug: country.slug,
              image_url: country.image?.url || '',
              is_active: true,
              updated_at: new Date().toISOString(),
            };

            if (!dryRun) {
              if (existing) {
                await supabaseAdmin.from('countries').update(payload).eq('id', country.slug);
                syncStats.countries.updated++;
              } else {
                payload.created_at = new Date().toISOString();
                await supabaseAdmin.from('countries').insert(payload);
                syncStats.countries.added++;
              }
            } else {
              existing ? syncStats.countries.updated++ : syncStats.countries.added++;
            }
          }
        }

        if (!dryRun) {
          await supabaseAdmin.from('sync_logs').insert({
            type: 'countries_only',
            status: 'success',
            details: syncStats,
            created_at: new Date().toISOString()
          });
        }
        
        return NextResponse.json({
          success: true,
          dryRun,
          message: `${dryRun ? '[DRY RUN] Would sync' : 'Successfully synced'} ${syncStats.countries.updated + syncStats.countries.added} countries`,
          details: syncStats
        });
      }
      
      // Full sync
      syncStats.packages.total_from_api = apiPackages.length;
      
      const apiPackageIds = new Set(apiPackages
        .filter(pkg => pkg.type !== 'topup')
        .map(pkg => pkg.slug || pkg.id?.toString())
        .filter(Boolean));
      
      // Get existing packages from Supabase
      const { data: existingPackages } = await supabaseAdmin
        .from('dataplans')
        .select('id');
      const existingPackageIds = new Set((existingPackages || []).map(p => p.id));
      
      const packagesToRemove = [...existingPackageIds].filter(id => !apiPackageIds.has(id));
      console.log(`🔄 ${packagesToRemove.length} packages will be removed (deprecated)`);
      
      // Sync countries
      for (const country of countries) {
        if (country.slug && country.title) {
          const { data: existing } = await supabaseAdmin
            .from('countries')
            .select('id')
            .eq('id', country.slug)
            .single();

          const payload = {
            id: country.slug,
            name: country.title,
            iso_code: country.slug,
            slug: country.slug,
            image_url: country.image?.url || '',
            is_active: true,
            updated_at: new Date().toISOString(),
          };

          if (!dryRun) {
            if (existing) {
              await supabaseAdmin.from('countries').update(payload).eq('id', country.slug);
              syncStats.countries.updated++;
            } else {
              payload.created_at = new Date().toISOString();
              await supabaseAdmin.from('countries').insert(payload);
              syncStats.countries.added++;
            }
          }
        }
      }
      
      // Helper to parse SMS/Voice
      const parseSmsVoiceFromInfo = (shortInfo) => {
        const result = { sms: 0, voice: 0 };
        if (!shortInfo) return result;
        const infoLower = shortInfo.toLowerCase();
        const smsMatch = infoLower.match(/(\d+)\s*sms/i);
        if (smsMatch) result.sms = parseInt(smsMatch[1]) || 0;
        const voiceMatch = infoLower.match(/(\d+)\s*(mins?|minutes?|voice|calls?)/i);
        if (voiceMatch) result.voice = parseInt(voiceMatch[1]) || 0;
        return result;
      };

      let simPlansCount = 0;
      let topupPlansCount = 0;

      // Process packages
      for (const pkg of apiPackages) {
        const isTopup = pkg.type === 'topup';
        const packageId = pkg.slug || pkg.id?.toString();
        if (!packageId || !pkg.title) continue;

        let dataAmountMB = pkg.is_unlimited ? 999999 : (parseFloat(pkg.amount) || 0);
        const validityDays = parseInt(pkg.validity) || pkg.day || 30;
        const netPrice = parseFloat(pkg.price) || 0;
        
        const operatorCoverages = pkg.operator?.coverages || [];
        const firstCoverage = operatorCoverages[0] || {};
        const isoCode = firstCoverage.code || '';
        const countrySlug = pkg.country?.slug || '';
        
        let countryCodes = [];
        if (pkg.countries && Array.isArray(pkg.countries) && pkg.countries.length > 0) {
          countryCodes = pkg.countries.map(c => c.slug).filter(Boolean);
        } else if (countrySlug) {
          countryCodes = [countrySlug];
        }

        // Parse SMS/Voice
        let smsValue = parseInt(pkg.sms) || 0;
        let voiceValue = parseInt(pkg.voice) || parseInt(pkg.calls) || 0;
        if (smsValue === 0 && voiceValue === 0 && pkg.short_info) {
          const parsed = parseSmsVoiceFromInfo(pkg.short_info);
          smsValue = parsed.sms;
          voiceValue = parsed.voice;
        }

        if (isTopup) {
          // Store in topups table
          if (!dryRun) {
            await supabaseAdmin.from('topups').upsert({
              id: packageId,
              slug: pkg.slug || packageId,
              name: pkg.title,
              title: pkg.title,
              type: 'topup',
              country_code: isoCode,
              country_slug: countrySlug,
              data_amount_mb: dataAmountMB,
              validity_days: validityDays,
              price: netPrice,
              net_price: netPrice,
              operator_name: pkg.operator?.title || '',
              status: 'active',
              provider: 'airalo',
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
          }
          topupPlansCount++;
        } else {
          // Store in dataplans table
          const planData = {
            id: packageId,
            slug: pkg.slug || packageId,
            name: pkg.title,
            title: pkg.title,
            short_info: pkg.short_info || '',
            type: pkg.type || 'sim',
            country_id: countrySlug || null,
            country_iso: isoCode,
            country_name: pkg.country?.title || '',
            country_codes: isTopup ? [] : countryCodes,
            is_regional: isTopup ? false : (countryCodes.length > 1 || pkg.type === 'global'),
            region_type: isTopup ? 'topup' : (countryCodes.length > 1 ? (pkg.type || 'regional') : 'local'),
            data_display: pkg.data || (pkg.amount && pkg.amount_unit ? `${pkg.amount} ${pkg.amount_unit}` : 'Unlimited'),
            data_amount_mb: dataAmountMB,
            is_unlimited: pkg.is_unlimited || false,
            validity_days: validityDays,
            sms_count: smsValue,
            voice_minutes: voiceValue,
            has_sms: smsValue > 0,
            has_voice: voiceValue > 0,
            price: netPrice,
            net_price: netPrice,
            currency: 'USD',
            operator_id: pkg.operator?.id?.toString() || '',
            operator_name: pkg.operator?.title || '',
            operator_style: pkg.operator?.style || 'light',
            operator_gradient_start: pkg.operator?.gradient_start || '',
            operator_gradient_end: pkg.operator?.gradient_end || '',
            activation_policy: pkg.operator?.activation_policy || 'first-usage',
            fair_usage_policy: pkg.fair_usage_policy || '',
            apn_type: pkg.apn_type || 'automatic',
            apn_value: pkg.apn_value || '',
            status: 'active',
            is_enabled: true,
            provider: 'airalo',
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          if (!dryRun) {
            const isNew = !existingPackageIds.has(packageId);
            await supabaseAdmin.from('dataplans').upsert(planData, { onConflict: 'id' });
            if (isNew) {
              syncStats.packages.added++;
            } else {
              syncStats.packages.updated++;
            }
          }
          simPlansCount++;
        }
      }
      
      // Remove deprecated packages
      if (removeDeprecated && packagesToRemove.length > 0 && !dryRun) {
        // Delete in batches of 100
        for (let i = 0; i < packagesToRemove.length; i += 100) {
          const batch = packagesToRemove.slice(i, i + 100);
          await supabaseAdmin.from('dataplans').delete().in('id', batch);
        }
        syncStats.packages.removed = packagesToRemove.length;
      }
      
      if (!dryRun) {
        await supabaseAdmin.from('sync_logs').insert({
          type: 'full_sync',
          status: 'success',
          details: {
            ...syncStats,
            topups_synced: topupPlansCount,
            sim_plans_synced: simPlansCount,
            existing_in_db: existingPackageIds.size,
            from_airalo_api: apiPackageIds.size,
            deprecated_removed: packagesToRemove.length
          },
          created_at: new Date().toISOString()
        });
      }
      
      return NextResponse.json({
        success: true,
        dryRun,
        message: `${dryRun ? '[DRY RUN] Would sync' : 'Successfully synced'} ${syncStats.countries.updated} countries, ${simPlansCount} SIM plans, ${topupPlansCount} topups`,
        details: {
          ...syncStats,
          sim_plans: simPlansCount,
          topups: topupPlansCount,
          existing_in_db: existingPackageIds.size,
          from_airalo_api: apiPackageIds.size,
          deprecated_packages: dryRun ? packagesToRemove.slice(0, 20) : undefined,
          total_deprecated: packagesToRemove.length
        }
      });
      
    } catch (error) {
      console.error('❌ Sync inner error:', error);
      
      try {
        await supabaseAdmin.from('sync_logs').insert({
          type: countriesOnly ? 'countries_only' : 'full_sync',
          status: 'error',
          details: { error: error.message },
          created_at: new Date().toISOString()
        });
      } catch {}
      
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Sync outer error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// GET endpoint to check sync status
export async function GET() {
  try {
    // Get last sync logs
    const { data: recentSyncs } = await supabaseAdmin
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Get plan counts
    const { count: planCount } = await supabaseAdmin
      .from('dataplans')
      .select('*', { count: 'exact', head: true });
    
    const { count: activePlanCount } = await supabaseAdmin
      .from('dataplans')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    return NextResponse.json({
      success: true,
      currentStatus: {
        totalPlans: planCount || 0,
        activePlans: activePlanCount || 0,
        lastSync: recentSyncs?.[0] || null
      },
      recentSyncs: recentSyncs || []
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
