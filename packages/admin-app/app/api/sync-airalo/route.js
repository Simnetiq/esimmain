import { NextResponse } from 'next/server';
import { getAdminDb, initializeFirebaseAdmin } from '@esim/shared/lib/firebaseAdmin';
import admin from 'firebase-admin';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const countriesOnly = searchParams.get('countries_only') === 'true';
    
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
        error: 'Airalo API configuration is missing. Please set AIRALO_CLIENT_ID and AIRALO_CLIENT_SECRET environment variables in Vercel.'
      }, { status: 500 });
    }
    
    // Step 1: Authenticate with Airalo OAuth2
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
    
    // Get markup percentage from configuration (default to 17%)
    const markupConfigRef = db.collection('config').doc('pricing');
    const markupConfig = await markupConfigRef.get();
    // Force zero markup so dataplans.price reflects the base amount
    const markupPercentage = 0;
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    };
    
    let totalSynced = { countries: 0, packages: 0 };
    
    // Fetch countries from Airalo API
    try {
      const countriesResponse = await fetch(`${airaloBaseUrl}/v2/countries`, {
        headers
      });
      
      if (!countriesResponse.ok) {
        throw new Error(`Failed to fetch countries: ${countriesResponse.statusText}`);
      }
      
      const countriesData = await countriesResponse.json();
      const countries = countriesData.data || [];
      
      
      if (countriesOnly) {
        // Countries-only sync: save countries and skip plans
        const batch = db.batch();
        let countriesSynced = 0;
        
        for (const country of countries) {
          if (country.slug && country.title) {
            const countryRef = db.collection('countries').doc(country.slug);
            
            // Get existing country data to preserve translations and images
            const existingCountry = await countryRef.get();
            const existingData = existingCountry.exists ? existingCountry.data() : {};
            
            // Merge new data with existing, preserving translations and photo
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
              // PRESERVE existing translations and photo
              translations: existingData.translations || {},
              photo: existingData.photo || country.image?.url || '',
              description: existingData.description || '',
              isActive: existingData.isActive !== false
            }, { merge: true });
            countriesSynced++;
          }
        }
        
        // Execute countries batch
        await batch.commit();
        
        // Create sync log
        const logRef = db.collection('sync_logs').doc();
        await logRef.set({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          type: 'countries_only',
          status: 'success',
          details: {
            countries_synced: countriesSynced
          }
        });
        
        return NextResponse.json({
          success: true,
          message: `Successfully synced ${countriesSynced} countries`,
          details: {
            countries_synced: countriesSynced
          }
        });
      }
      
      // Full sync: countries + packages
      const packagesResponse = await fetch(`${airaloBaseUrl}/v2/packages`, {
        headers
      });
      
      if (!packagesResponse.ok) {
        throw new Error(`Failed to fetch packages: ${packagesResponse.statusText}`);
      }
      
      const packagesData = await packagesResponse.json();
      const packages = packagesData.data || [];
      
      
      // Sync countries first
      const countriesBatch = db.batch();
      for (const country of countries) {
        if (country.slug && country.title) {
          const countryRef = db.collection('countries').doc(country.slug);
          const existingCountry = await countryRef.get();
          const existingData = existingCountry.exists ? existingCountry.data() : {};
          
          countriesBatch.set(countryRef, {
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
      await countriesBatch.commit();
      
      // Sync packages
      const packagesBatch = db.batch();
      for (const pkg of packages) {
        if (pkg.id && pkg.title) {
          const packageRef = db.collection('dataplans').doc(pkg.id.toString());
          
          // Calculate pricing with markup
          const basePrice = parseFloat(pkg.price) || 0;
          const markedUpPrice = basePrice;
          
          packagesBatch.set(packageRef, {
            id: pkg.id.toString(),
            title: pkg.title,
            slug: pkg.slug,
            price: markedUpPrice.toFixed(2),
            base_price: basePrice.toFixed(2),
            markup_percentage: markupPercentage,
            data: pkg.data,
            validity: pkg.validity,
            country_code: pkg.country?.slug || '',
            country_name: pkg.country?.title || '',
            operator: pkg.operator?.title || '',
            type: pkg.type || 'data',
            is_unlimited: pkg.is_unlimited || false,
            provider: 'airalo',
            status: 'active',
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_by: 'airalo_sync'
          }, { merge: true });
          totalSynced.packages++;
        }
      }
      await packagesBatch.commit();
      
      // Create sync log
      const logRef = db.collection('sync_logs').doc();
      await logRef.set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'full_sync',
        status: 'success',
        details: {
          countries_synced: totalSynced.countries,
          packages_synced: totalSynced.packages
        }
      });
      
      return NextResponse.json({
        success: true,
        message: `Successfully synced ${totalSynced.countries} countries and ${totalSynced.packages} packages`,
        total_synced: totalSynced.packages,
        details: {
          countries_synced: totalSynced.countries,
          packages_synced: totalSynced.packages
        }
      });
      
    } catch (error) {
      
      // Create error log
      const logRef = db.collection('sync_logs').doc();
      await logRef.set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: countriesOnly ? 'countries_only' : 'full_sync',
        status: 'error',
        error: error.message
      });
      
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

