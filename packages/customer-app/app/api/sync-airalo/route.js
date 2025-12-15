import { NextResponse } from 'next/server';
import { getAdminDb, initializeFirebaseAdmin } from '@esim/shared/lib/firebaseAdmin';
import admin from 'firebase-admin';

// Helper function to authenticate with Airalo
async function getAiraloAccessToken(clientId, clientSecret, baseUrl) {
  const authResponse = await fetch(`${baseUrl}/v2/token`, {
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
    throw new Error(`Authentication failed: ${authResponse.statusText} - ${errorText}`);
  }

  const authData = await authResponse.json();
  return authData.data?.access_token;
}

// Helper function to fetch all packages with pagination
async function fetchAllPackages(baseUrl, accessToken, includeTopup = true) {
  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  };

  let allPackages = [];
  let page = 1;
  let hasMore = true;
  const limit = 500; // High limit to reduce number of requests

  console.log('[Airalo Sync] Starting to fetch all packages...');

  while (hasMore) {
    const url = new URL(`${baseUrl}/v2/packages`);
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('page', page.toString());
    if (includeTopup) {
      url.searchParams.set('include', 'topup');
    }

    console.log(`[Airalo Sync] Fetching page ${page}...`);
    
    const response = await fetch(url.toString(), { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch packages page ${page}: ${response.statusText}`);
    }

    const data = await response.json();
    const countries = data.data || [];
    
    // Extract packages from the nested structure
    // Response structure: data -> [countries] -> operators -> packages
    for (const country of countries) {
      const operators = country.operators || [];
      for (const operator of operators) {
        const packages = operator.packages || [];
        for (const pkg of packages) {
          allPackages.push({
            ...pkg,
            country_code: country.country_code,
            country_slug: country.slug,
            country_title: country.title,
            country_image: country.image?.url,
            operator_id: operator.id,
            operator_title: operator.title,
            operator_type: operator.type,
            operator_style: operator.style,
            operator_gradient_start: operator.gradient_start,
            operator_gradient_end: operator.gradient_end,
            operator_image: operator.image?.url,
            operator_is_prepaid: operator.is_prepaid,
            operator_is_roaming: operator.is_roaming,
            operator_apn_type: operator.apn_type,
            operator_apn_value: operator.apn_value,
            operator_apn: operator.apn,
            operator_info: operator.info,
            operator_coverages: operator.coverages,
            operator_plan_type: operator.plan_type,
            operator_activation_policy: operator.activation_policy,
            operator_rechargeability: operator.rechargeability,
          });
        }
      }
    }

    // Check pagination
    const meta = data.meta || {};
    const currentPage = meta.current_page || page;
    const lastPage = meta.last_page || 1;
    
    console.log(`[Airalo Sync] Page ${currentPage}/${lastPage}, found ${countries.length} countries on this page`);
    
    hasMore = currentPage < lastPage;
    page++;

    // Safety limit to prevent infinite loops
    if (page > 100) {
      console.warn('[Airalo Sync] Reached page limit (100), stopping pagination');
      break;
    }
  }

  console.log(`[Airalo Sync] Total packages fetched: ${allPackages.length}`);
  return allPackages;
}

// Support both POST and GET for cron jobs
export async function GET(request) {
  return handleSync(request, 'cron');
}

export async function POST(request) {
  return handleSync(request, 'manual');
}

async function handleSync(request, source = 'manual') {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const countriesOnly = searchParams.get('countries_only') === 'true';
    const includeTopup = searchParams.get('include_topup') !== 'false';
    
    // Initialize Firebase Admin
    initializeFirebaseAdmin();
    const db = getAdminDb();
    
    // Get Airalo API configuration from environment variables
    const clientId = process.env.AIRALO_CLIENT_ID;
    const clientSecret = process.env.AIRALO_CLIENT_SECRET;
    const airaloBaseUrl = process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com';
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'Airalo API configuration is missing. Please set AIRALO_CLIENT_ID and AIRALO_CLIENT_SECRET environment variables.'
      }, { status: 500 });
    }
    
    console.log(`[Airalo Sync] Starting ${source} sync...`);
    
    // Authenticate with Airalo
    const accessToken = await getAiraloAccessToken(clientId, clientSecret, airaloBaseUrl);
    
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'No access token received from Airalo API'
      }, { status: 401 });
    }
    
    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    };
    
    let totalSynced = { countries: 0, packages: 0, topups: 0, deactivated: 0 };
    
    // Countries-only sync
    if (countriesOnly) {
      const countriesResponse = await fetch(`${airaloBaseUrl}/v2/countries`, { headers });
      
      if (!countriesResponse.ok) {
        throw new Error(`Failed to fetch countries: ${countriesResponse.statusText}`);
      }
      
      const countriesData = await countriesResponse.json();
      const countries = countriesData.data || [];
      
      const batch = db.batch();
      
      for (const country of countries) {
        if (country.slug && country.title) {
          const countryRef = db.collection('countries').doc(country.slug);
          const existingCountry = await countryRef.get();
          const existingData = existingCountry.exists ? existingCountry.data() : {};
          
          batch.set(countryRef, {
            name: country.title,
            code: country.slug,
            slug: country.slug,
            title: country.title,
            image: country.image?.url || '',
            status: 'active',
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_by: 'airalo_sync',
            provider: 'airalo',
            translations: existingData.translations || {},
            photo: existingData.photo || country.image?.url || '',
            description: existingData.description || '',
            isActive: existingData.isActive !== false
          }, { merge: true });
          totalSynced.countries++;
        }
      }
      
      await batch.commit();
      
      const logRef = db.collection('sync_logs').doc();
      await logRef.set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        countries_synced: totalSynced.countries,
        plans_synced: 0,
        status: 'completed',
        source: source === 'cron' ? 'hourly_cron' : 'admin_manual_sync',
        sync_type: 'countries_only_sync',
        provider: 'airalo',
        duration_ms: Date.now() - startTime
      });
      
      return NextResponse.json({
        success: true,
        message: 'Successfully synced countries from Airalo API',
        total_synced: totalSynced.countries,
        details: { countries_synced: totalSynced.countries }
      });
    }
    
    // Fetch ALL packages with pagination
    const allPackages = await fetchAllPackages(airaloBaseUrl, accessToken, includeTopup);
    
    // Track which package IDs we received from Airalo (to detect removed packages)
    const receivedPackageIds = new Set(allPackages.map(p => p.id));
    
    // Process packages in batches (Firestore limit is 500 operations per batch)
    const BATCH_SIZE = 400;
    let currentBatch = db.batch();
    let batchCount = 0;
    
    for (let i = 0; i < allPackages.length; i++) {
      const pkg = allPackages[i];
      
      if (!pkg.id) continue;
      
      const packageRef = db.collection('dataplans').doc(pkg.id);
      
      // Calculate retail price with markup
      const originalPrice = parseFloat(pkg.price) || 0;
      const retailPrice = originalPrice;
      
      const packageData = {
        // Package identification
        id: pkg.id,
        slug: pkg.id,
        
        // Package details
        name: pkg.title || `${pkg.amount / 1024}GB - ${pkg.day} Days`,
        title: pkg.title,
        type: pkg.type || 'sim',
        
        // Data/Usage details
        amount: pkg.amount || 0, // Data in MB
        data_amount_mb: pkg.amount || 0,
        day: pkg.day || 0, // Validity in days
        validity: pkg.day || 0,
        validity_unit: 'days',
        is_unlimited: pkg.is_unlimited || false,
        
        // Pricing
        price: retailPrice,
        original_price: originalPrice,
        net_price: originalPrice,
        currency: 'USD',
        
        // Country/Region info
        country_code: pkg.country_code || '',
        country_slug: pkg.country_slug || '',
        country_title: pkg.country_title || '',
        country_image: pkg.country_image || '',
        
        // Operator info
        operator_id: pkg.operator_id,
        operator: pkg.operator_title || '',
        operator_title: pkg.operator_title || '',
        operator_type: pkg.operator_type || 'local',
        operator_is_prepaid: pkg.operator_is_prepaid || false,
        operator_is_roaming: pkg.operator_is_roaming || false,
        operator_image: pkg.operator_image || '',
        operator_style: pkg.operator_style || 'light',
        operator_gradient_start: pkg.operator_gradient_start || '',
        operator_gradient_end: pkg.operator_gradient_end || '',
        
        // APN Configuration
        apn_type: pkg.operator_apn_type || 'automatic',
        apn_value: pkg.operator_apn_value || '',
        apn: pkg.operator_apn || {},
        
        // Operator details
        operator_info: pkg.operator_info || [],
        operator_coverages: pkg.operator_coverages || [],
        operator_plan_type: pkg.operator_plan_type || 'data',
        operator_activation_policy: pkg.operator_activation_policy || 'first-usage',
        operator_rechargeability: pkg.operator_rechargeability || false,
        
        // Installation instructions
        short_info: pkg.short_info || '',
        qr_installation: pkg.qr_installation || '',
        manual_installation: pkg.manual_installation || '',
        
        // Status and metadata
        status: 'active',
        enabled: true,
        provider: 'airalo',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        synced_at: new Date().toISOString(),
        updated_by: 'airalo_sync',
        
        // Track if it's a topup package
        is_topup: pkg.type === 'topup',
      };
      
      currentBatch.set(packageRef, packageData, { merge: true });
      batchCount++;
      
      if (pkg.type === 'topup') {
        totalSynced.topups++;
      } else {
        totalSynced.packages++;
      }
      
      // Commit batch when reaching limit
      if (batchCount >= BATCH_SIZE) {
        await currentBatch.commit();
        console.log(`[Airalo Sync] Committed batch of ${batchCount} packages`);
        currentBatch = db.batch();
        batchCount = 0;
      }
    }
    
    // Commit remaining items
    if (batchCount > 0) {
      await currentBatch.commit();
      console.log(`[Airalo Sync] Committed final batch of ${batchCount} packages`);
    }
    
    // Mark packages not in the response as out_of_stock (optional - can be expensive)
    // Only do this for full syncs to avoid marking packages incorrectly during partial syncs
    if (source === 'cron' && allPackages.length > 100) {
      const existingPackages = await db.collection('dataplans')
        .where('provider', '==', 'airalo')
        .where('status', '==', 'active')
        .get();
      
      const deactivateBatch = db.batch();
      let deactivateCount = 0;
      
      // Use for...of instead of forEach so we can break out of the loop
      for (const doc of existingPackages.docs) {
        if (!receivedPackageIds.has(doc.id)) {
          deactivateBatch.update(doc.ref, {
            status: 'out_of_stock',
            enabled: false,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            deactivated_at: admin.firestore.FieldValue.serverTimestamp(),
            deactivated_reason: 'Not found in Airalo API response'
          });
          deactivateCount++;
          
          // Safety limit - break out of loop to prevent exceeding Firestore batch limit
          if (deactivateCount >= BATCH_SIZE) {
            console.log(`[Airalo Sync] Reached batch limit (${BATCH_SIZE}), stopping deactivation`);
            break;
          }
        }
      }
      
      if (deactivateCount > 0) {
        await deactivateBatch.commit();
        totalSynced.deactivated = deactivateCount;
        console.log(`[Airalo Sync] Deactivated ${deactivateCount} out-of-stock packages`);
      }
    }
    
    // Create sync log
    const logRef = db.collection('sync_logs').doc();
    await logRef.set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      countries_synced: 0,
      plans_synced: totalSynced.packages,
      topups_synced: totalSynced.topups,
      deactivated: totalSynced.deactivated,
      status: 'completed',
      source: source === 'cron' ? 'hourly_cron' : 'admin_manual_sync',
      sync_type: 'packages_sync',
      provider: 'airalo',
      duration_ms: Date.now() - startTime,
      total_packages_from_api: allPackages.length
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Airalo Sync] Completed in ${duration}s - Packages: ${totalSynced.packages}, Topups: ${totalSynced.topups}, Deactivated: ${totalSynced.deactivated}`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully synced ${totalSynced.packages} packages and ${totalSynced.topups} topups from Airalo API`,
      total_synced: totalSynced.packages + totalSynced.topups,
      details: {
        packages_synced: totalSynced.packages,
        topups_synced: totalSynced.topups,
        deactivated: totalSynced.deactivated,
        duration_seconds: parseFloat(duration)
      }
    });
    
  } catch (error) {
    console.error('[Airalo Sync] Error:', error);
    
    // Log the error
    try {
      initializeFirebaseAdmin();
      const db = getAdminDb();
      const logRef = db.collection('sync_logs').doc();
      await logRef.set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'failed',
        error: error.message,
        source: source === 'cron' ? 'hourly_cron' : 'admin_manual_sync',
        provider: 'airalo',
        duration_ms: Date.now() - startTime
      });
    } catch (logError) {
      console.error('[Airalo Sync] Failed to log error:', logError);
    }
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
