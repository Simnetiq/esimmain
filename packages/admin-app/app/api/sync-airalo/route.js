import { NextResponse } from 'next/server';
import { getAdminDb, initializeFirebaseAdmin } from '@esim/shared/lib/firebaseAdmin';
import admin from 'firebase-admin';

// Helper to commit batches in chunks (Firestore limit is 500 operations per batch)
async function commitInBatches(db, operations, batchSize = 450) {
  const batches = [];
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = db.batch();
    const chunk = operations.slice(i, i + batchSize);
    for (const op of chunk) {
      if (op.type === 'set') {
        batch.set(op.ref, op.data, op.options || {});
      } else if (op.type === 'delete') {
        batch.delete(op.ref);
      } else if (op.type === 'update') {
        batch.update(op.ref, op.data);
      }
    }
    batches.push(batch.commit());
  }
  await Promise.all(batches);
  return operations.length;
}

export async function POST(request) {
  console.log('🔄 Sync API: POST request received');
  
  try {
    const { searchParams } = new URL(request.url);
    const countriesOnly = searchParams.get('countries_only') === 'true';
    const removeDeprecated = searchParams.get('remove_deprecated') !== 'false'; // Default true
    const dryRun = searchParams.get('dry_run') === 'true';
    
    console.log('🔄 Sync options:', { countriesOnly, removeDeprecated, dryRun });
    
    // Initialize Firebase Admin
    console.log('🔄 Initializing Firebase Admin...');
    try {
      initializeFirebaseAdmin();
    } catch (firebaseError) {
      console.error('❌ Firebase Admin init failed:', firebaseError.message);
      return NextResponse.json({
        success: false,
        error: `Firebase Admin initialization failed: ${firebaseError.message}`
      }, { status: 500 });
    }
    
    const db = getAdminDb();
    console.log('✅ Firebase Admin initialized');
    
    // Get Airalo API configuration from environment variables
    const clientId = process.env.AIRALO_CLIENT_ID;
    const clientSecret = process.env.AIRALO_CLIENT_SECRET;
    const airaloBaseUrl = process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com';
    
    console.log('🔄 Airalo config check:', { 
      hasClientId: !!clientId, 
      hasClientSecret: !!clientSecret,
      baseUrl: airaloBaseUrl 
    });
    
    if (!clientId || !clientSecret) {
      console.error('❌ Missing Airalo credentials');
      return NextResponse.json({
        success: false,
        error: 'Airalo API configuration is missing. Please set AIRALO_CLIENT_ID and AIRALO_CLIENT_SECRET environment variables.',
        debug: {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret
        }
      }, { status: 500 });
    }
    
    // Step 1: Authenticate with Airalo OAuth2
    console.log('🔄 Authenticating with Airalo API...');
    let authResponse;
    try {
      authResponse = await fetch(`${airaloBaseUrl}/v2/token`, {
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
    } catch (fetchError) {
      console.error('❌ Airalo auth fetch failed:', fetchError.message);
      return NextResponse.json({
        success: false,
        error: `Failed to connect to Airalo API: ${fetchError.message}`
      }, { status: 500 });
    }
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('❌ Airalo auth failed:', authResponse.status, errorText);
      return NextResponse.json({
        success: false,
        error: `Airalo authentication failed (${authResponse.status}): ${errorText}`
      }, { status: 401 });
    }
    
    const authData = await authResponse.json();
    const accessToken = authData.data?.access_token;
    
    if (!accessToken) {
      console.error('❌ No access token in response:', JSON.stringify(authData));
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
    
    // Fetch data from Airalo API
    try {
      console.log('🔄 Fetching packages from Airalo API (with pagination)...');
      
      // Fetch ALL packages with pagination
      let apiPackages = [];
      let currentPage = 1;
      let hasMorePages = true;
      const limit = 100; // Max per page
      
      while (hasMorePages) {
        console.log(`🔄 Fetching page ${currentPage}...`);
        // Include operators.packages to get nested package data
        const packagesResponse = await fetch(`${airaloBaseUrl}/v2/packages?include=topup&limit=${limit}&page=${currentPage}`, {
          headers
        });
        
        if (!packagesResponse.ok) {
          throw new Error(`Failed to fetch packages (page ${currentPage}): ${packagesResponse.statusText}`);
        }
        
        const packagesData = await packagesResponse.json();
        
        // Log structure on first page
        if (currentPage === 1) {
          console.log('📦 Packages API response keys:', Object.keys(packagesData));
          console.log('📦 Meta:', JSON.stringify(packagesData.meta || {}));
        }
        
        // Extract packages from response
        let pagePackages = [];
        if (Array.isArray(packagesData.data)) {
          pagePackages = packagesData.data;
        } else if (Array.isArray(packagesData)) {
          pagePackages = packagesData;
        }
        
        apiPackages = apiPackages.concat(pagePackages);
        console.log(`✅ Page ${currentPage}: ${pagePackages.length} packages (total: ${apiPackages.length})`);
        
        // Check if there are more pages
        const meta = packagesData.meta || {};
        const lastPage = meta.last_page || meta.lastPage || 1;
        
        if (currentPage >= lastPage || pagePackages.length === 0) {
          hasMorePages = false;
        } else {
          currentPage++;
        }
        
        // Safety limit - max 100 pages (10,000 packages)
        if (currentPage > 100) {
          console.log('⚠️ Reached page limit (100 pages)');
          hasMorePages = false;
        }
      }
      
      console.log(`✅ Total fetched: ${apiPackages.length} country/region entries from Airalo API`);
      
      // The API returns countries/regions with nested operators containing packages
      // We need to flatten this structure to get individual packages
      const allPackages = [];
      for (const countryData of apiPackages) {
        const countrySlug = countryData.slug;
        const countryCode = countryData.country_code;
        const countryTitle = countryData.title;
        const countryImage = countryData.image;
        
        // Each country has operators, each operator has packages
        const operators = countryData.operators || [];
        for (const operator of operators) {
          const packages = operator.packages || [];
          for (const pkg of packages) {
            // Add country/operator context to each package
            allPackages.push({
              ...pkg,
              // Ensure we have the package slug as ID
              id: pkg.id,
              slug: pkg.slug || pkg.id?.toString(),
              // Country info
              country: {
                slug: countrySlug,
                code: countryCode,
                title: countryTitle,
                image: countryImage ? { url: countryImage } : null
              },
              // Operator info
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
      
      // Replace apiPackages with flattened packages
      apiPackages = allPackages;
      console.log(`✅ Flattened to ${apiPackages.length} individual packages`);
      
      // Try to fetch countries (may return 404 on some API versions)
      let countries = [];
      console.log('🔄 Trying to fetch countries from Airalo API...');
      try {
        const countriesResponse = await fetch(`${airaloBaseUrl}/v2/countries`, {
          headers
        });
        
        if (countriesResponse.ok) {
          const countriesData = await countriesResponse.json();
          countries = countriesData.data || [];
          console.log(`✅ Fetched ${countries.length} countries from Airalo API`);
        } else {
          console.log('⚠️ Countries endpoint not available, will extract from packages');
          // Extract unique countries from packages
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
          console.log(`✅ Extracted ${countries.length} countries from packages`);
        }
      } catch (countryError) {
        console.log('⚠️ Countries fetch failed, extracting from packages:', countryError.message);
        // Extract unique countries from packages
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
        console.log(`✅ Extracted ${countries.length} countries from packages`);
      }
      
      if (countriesOnly) {
        // Countries-only sync
        const operations = [];
        
        for (const country of countries) {
          if (country.slug && country.title) {
            const countryRef = db.collection('countries').doc(country.slug);
            const existingCountry = await countryRef.get();
            const isNewCountry = !existingCountry.exists;
            const existingData = existingCountry.exists ? existingCountry.data() : {};
            
            // Extract photo URL - ensure it's always a string, not an object
            const existingPhoto = typeof existingData.photo === 'string' 
              ? existingData.photo 
              : existingData.photo?.url || '';
            const newPhoto = country.image?.url || '';
            
            operations.push({
              type: 'set',
              ref: countryRef,
              data: {
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
                photo: existingPhoto || newPhoto,
                description: existingData.description || '',
                isActive: existingData.isActive !== false
              },
              options: { merge: true }
            });
            
            if (isNewCountry) {
              syncStats.countries.added++;
            } else {
              syncStats.countries.updated++;
            }
          }
        }
        
        if (!dryRun) {
          await commitInBatches(db, operations);
          
          const logRef = db.collection('sync_logs').doc();
          await logRef.set({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            type: 'countries_only',
            status: 'success',
            details: syncStats
          });
        }
        
        return NextResponse.json({
          success: true,
          dryRun,
          message: `${dryRun ? '[DRY RUN] Would sync' : 'Successfully synced'} ${syncStats.countries.updated} countries`,
          details: syncStats
        });
      }
      
      // Full sync: countries + packages
      // apiPackages was already fetched at the beginning
      syncStats.packages.total_from_api = apiPackages.length;
      console.log(`🔄 Processing ${apiPackages.length} packages for sync...`);
      
      // Create a Set of all package IDs from the API for quick lookup
      // Airalo uses 'id' or 'slug' as identifier - check first package to determine
      if (apiPackages.length > 0) {
        const samplePkg = apiPackages[0];
        console.log('📦 Sample package keys:', Object.keys(samplePkg));
        console.log('📦 Sample package id:', samplePkg.id, 'slug:', samplePkg.slug);
      }
      
      // Use slug as the package ID (this is how existing data is stored)
      const apiPackageIds = new Set(apiPackages
        .map(pkg => pkg.slug || pkg.id?.toString())
        .filter(Boolean));
      console.log(`✅ Found ${apiPackageIds.size} unique package IDs from API`);
      
      // Get all existing packages from Firebase
      console.log('🔄 Fetching existing packages from Firebase...');
      const existingPackagesSnapshot = await db.collection('dataplans').get();
      const existingPackageIds = new Set();
      existingPackagesSnapshot.forEach(doc => {
        existingPackageIds.add(doc.id);
      });
      console.log(`✅ Found ${existingPackageIds.size} existing packages in Firebase`);
      
      // Find packages to remove (exist in Firebase but not in API)
      const packagesToRemove = [...existingPackageIds].filter(id => !apiPackageIds.has(id));
      console.log(`🔄 ${packagesToRemove.length} packages will be removed (deprecated)`);
      
      // Sync countries first
      const countryOperations = [];
      for (const country of countries) {
        if (country.slug && country.title) {
          const countryRef = db.collection('countries').doc(country.slug);
          const existingCountry = await countryRef.get();
          const isNewCountry = !existingCountry.exists;
          const existingData = existingCountry.exists ? existingCountry.data() : {};
          
          // Extract photo URL - ensure it's always a string, not an object
          const existingPhoto = typeof existingData.photo === 'string' 
            ? existingData.photo 
            : existingData.photo?.url || '';
          const newPhoto = country.image?.url || '';
          
          countryOperations.push({
            type: 'set',
            ref: countryRef,
            data: {
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
              photo: existingPhoto || newPhoto,
              description: existingData.description || '',
              isActive: existingData.isActive !== false
            },
            options: { merge: true }
          });
          
          if (isNewCountry) {
            syncStats.countries.added++;
          } else {
            syncStats.countries.updated++;
          }
        }
      }
      
      // Prepare package operations
      const packageOperations = [];
      
      // Add/Update packages from API
      for (const pkg of apiPackages) {
        // Use slug as primary ID (matches existing Firebase document IDs)
        const packageId = pkg.slug || pkg.id?.toString();
        if (packageId && pkg.title) {
          const packageRef = db.collection('dataplans').doc(packageId);
          const isNew = !existingPackageIds.has(packageId);
          
          // Parse data amount
          let dataAmountMB = 0;
          if (pkg.is_unlimited) {
            dataAmountMB = 999999;
          } else {
            const amount = parseFloat(pkg.amount) || 0;
            const unit = pkg.amount_unit || 'GB';
            dataAmountMB = unit.toUpperCase() === 'GB' ? amount * 1024 : amount;
          }
          
          const validityDays = parseInt(pkg.validity) || pkg.day || 30;
          const netPrice = parseFloat(pkg.price) || 0;
          
          // Extract location data from Airalo package
          // IMPORTANT: Preserve existing data format used by customer-app queries
          const operatorCoverages = pkg.operator?.coverages || [];
          const firstCoverage = operatorCoverages[0] || {};
          
          // ISO code comes from operator coverages (e.g., "US")
          const isoCode = firstCoverage.code || '';
          
          // Slug comes from country object (e.g., "united-states")  
          const countrySlug = pkg.country?.slug || '';
          
          // country_codes MUST be SLUGS for Firestore queries to work
          // Customer-app queries: where('country_codes', 'array-contains', 'united-states')
          // For multi-country packages, we use the country slugs from coverages
          let countryCodes = [];
          if (pkg.countries && Array.isArray(pkg.countries) && pkg.countries.length > 0) {
            // Multi-country package - use slugs from countries array
            countryCodes = pkg.countries.map(c => c.slug).filter(Boolean);
          } else if (countrySlug) {
            // Single country package - use the country slug
            countryCodes = [countrySlug];
          }
          
          // Build comprehensive package data
          const packageData = {
            // Identifiers
            id: packageId,
            slug: pkg.slug || packageId,
            
            // Location info - PRESERVE EXISTING FORMAT:
            // country_code: ISO 2-letter (e.g., "US") - for display/Airalo API
            // country_slug: slug (e.g., "united-states") - for reference  
            // country_codes: array of SLUGS - for Firestore queries (CRITICAL!)
            country_code: isoCode,
            country_slug: countrySlug,
            country_title: pkg.country?.title || '',
            country_region: pkg.country?.title || '', // Also set country_region for compatibility
            country_image: pkg.country?.image?.url || '',
            country_codes: countryCodes,
            is_regional: countryCodes.length > 1 || pkg.type === 'global',
            region_type: countryCodes.length > 1 ? (pkg.type || 'regional') : 'local',
            
            // Package details
            title: pkg.title,
            name: pkg.title,
            short_info: pkg.short_info || '',
            type: pkg.type || 'sim',
            is_topup: pkg.type === 'topup',
            
            // Data & Usage
            data: pkg.data || (pkg.amount && pkg.amount_unit ? `${pkg.amount} ${pkg.amount_unit}` : 'Unlimited'),
            data_amount_mb: dataAmountMB,
            capacity: dataAmountMB,
            amount: pkg.amount || 0,
            amount_unit: pkg.amount_unit || 'GB',
            is_unlimited: pkg.is_unlimited || false,
            validity: validityDays,
            validity_unit: 'days',
            day: validityDays,
            period: validityDays,
            
            // Pricing
            net_price: netPrice,
            price: netPrice, // No markup - price equals net_price
            original_price: netPrice,
            base_price: netPrice,
            currency: 'USD',
            markup_percentage: 0,
            
            // Operator info
            operator: pkg.operator?.title || '',
            operator_id: pkg.operator?.id || '',
            operator_title: pkg.operator?.title || '',
            operator_image: pkg.operator?.image?.url || '',
            operator_style: pkg.operator?.style || 'light',
            operator_gradient_start: pkg.operator?.gradient_start || '',
            operator_gradient_end: pkg.operator?.gradient_end || '',
            operator_type: pkg.operator?.type || 'local',
            operator_is_roaming: pkg.operator?.is_roaming || false,
            operator_is_prepaid: pkg.operator?.is_prepaid || false,
            operator_plan_type: pkg.operator?.plan_type || 'data',
            operator_activation_policy: pkg.operator?.activation_policy || 'first-usage',
            operator_rechargeability: pkg.operator?.rechargeability || false,
            operator_info: pkg.operator?.info || [],
            operator_coverages: pkg.operator?.coverages || [],
            
            // Installation instructions
            qr_installation: pkg.qr_installation || '',
            manual_installation: pkg.manual_installation || '',
            apn_type: pkg.apn_type || 'automatic',
            apn_value: pkg.apn_value || '',
            apn: pkg.apn || { ios: { apn_type: 'automatic' }, android: { apn_type: 'automatic' } },
            
            // Additional metadata
            fair_usage_policy: pkg.fair_usage_policy || '',
            activation_policy: pkg.activation_policy || '',
            
            // Status & sync metadata
            status: 'active',
            enabled: true,
            provider: 'airalo',
            // NOTE: updated_at is added AFTER cleaning to preserve FieldValue sentinel
            updated_by: 'airalo_sync',
            synced_at: new Date().toISOString()
          };
          
          // Remove any undefined values to prevent Firestore errors
          const cleanUndefined = (obj) => {
            if (obj === null || obj === undefined) return null;
            if (Array.isArray(obj)) return obj.filter(v => v !== undefined).map(cleanUndefined);
            if (typeof obj === 'object' && !(obj instanceof Date)) {
              // Skip objects with special Firestore-like properties
              if (obj._seconds !== undefined || obj._methodName !== undefined) return obj;
              return Object.fromEntries(
                Object.entries(obj)
                  .filter(([_, v]) => v !== undefined)
                  .map(([k, v]) => [k, cleanUndefined(v)])
              );
            }
            return obj;
          };
          const cleanedData = cleanUndefined(packageData);
          
          // Add updated_at AFTER cleaning to preserve FieldValue sentinel
          cleanedData.updated_at = admin.firestore.FieldValue.serverTimestamp();
          
          packageOperations.push({
            type: 'set',
            ref: packageRef,
            data: cleanedData,
            options: { merge: true }
          });
          
          if (isNew) {
            syncStats.packages.added++;
          } else {
            syncStats.packages.updated++;
          }
        }
      }
      
      // Remove deprecated packages (those in Firebase but not in API)
      if (removeDeprecated && packagesToRemove.length > 0) {
        for (const packageId of packagesToRemove) {
          const packageRef = db.collection('dataplans').doc(packageId);
          packageOperations.push({
            type: 'delete',
            ref: packageRef
          });
          syncStats.packages.removed++;
        }
      }
      
      // Execute all operations
      if (!dryRun) {
        await commitInBatches(db, countryOperations);
        await commitInBatches(db, packageOperations);
        
        // Create sync log
        const logRef = db.collection('sync_logs').doc();
        await logRef.set({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          type: 'full_sync',
          status: 'success',
          details: {
            ...syncStats,
            existing_in_firebase: existingPackageIds.size,
            from_airalo_api: apiPackageIds.size,
            deprecated_removed: packagesToRemove.length
          }
        });
      }
      
      return NextResponse.json({
        success: true,
        dryRun,
        message: `${dryRun ? '[DRY RUN] Would sync' : 'Successfully synced'} ${syncStats.countries.updated} countries, ${syncStats.packages.added + syncStats.packages.updated} packages (${syncStats.packages.added} new, ${syncStats.packages.updated} updated, ${syncStats.packages.removed} removed)`,
        details: {
          ...syncStats,
          existing_in_firebase: existingPackageIds.size,
          from_airalo_api: apiPackageIds.size,
          deprecated_packages: dryRun ? packagesToRemove.slice(0, 20) : undefined, // Show first 20 in dry run
          total_deprecated: packagesToRemove.length
        }
      });
      
    } catch (error) {
      console.error('❌ Sync inner error:', error);
      
      // Try to create error log (may fail if db not initialized)
      try {
        const logRef = db.collection('sync_logs').doc();
        await logRef.set({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          type: countriesOnly ? 'countries_only' : 'full_sync',
          status: 'error',
          error: error.message
        });
      } catch (logError) {
        console.error('❌ Failed to write error log:', logError.message);
      }
      
      return NextResponse.json({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Sync outer error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// GET endpoint to check sync status and last sync time
export async function GET() {
  try {
    initializeFirebaseAdmin();
    const db = getAdminDb();
    
    // Get last sync log
    const syncLogsSnapshot = await db.collection('sync_logs')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();
    
    const recentSyncs = [];
    syncLogsSnapshot.forEach(doc => {
      recentSyncs.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null
      });
    });
    
    // Get current plan count
    const plansSnapshot = await db.collection('dataplans').count().get();
    const planCount = plansSnapshot.data().count;
    
    // Get active plan count
    const activePlansSnapshot = await db.collection('dataplans')
      .where('status', '==', 'active')
      .count()
      .get();
    const activePlanCount = activePlansSnapshot.data().count;
    
    return NextResponse.json({
      success: true,
      currentStatus: {
        totalPlans: planCount,
        activePlans: activePlanCount,
        lastSync: recentSyncs[0] || null
      },
      recentSyncs
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

