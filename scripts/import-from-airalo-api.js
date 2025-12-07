/**
 * Import Packages Directly from Airalo API to Firebase
 * This script authenticates with Airalo and imports all packages (countries + regions)
 * 
 * Usage: 
 * AIRALO_CLIENT_ID=your_id AIRALO_CLIENT_SECRET=your_secret node scripts/import-from-airalo-api.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

const db = admin.firestore();

// Configuration
const AIRALO_CLIENT_ID = process.env.AIRALO_CLIENT_ID;
const AIRALO_CLIENT_SECRET = process.env.AIRALO_CLIENT_SECRET;
const AIRALO_BASE_URL = 'https://partners-api.airalo.com';
const MARKUP_PERCENTAGE = 0; // Force zero markup; store base price as retail

// Authenticate with Airalo and get access token
async function getAccessToken() {
  console.log('🔐 Authenticating with Airalo API...');
  
  const response = await fetch(`${AIRALO_BASE_URL}/v2/token`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: AIRALO_CLIENT_ID,
      client_secret: AIRALO_CLIENT_SECRET,
      grant_type: 'client_credentials'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Authentication failed: ${errorText}`);
  }

  const data = await response.json();
  const accessToken = data.data?.access_token;

  if (!accessToken) {
    throw new Error('No access token received from Airalo API');
  }

  console.log('✅ Authentication successful\n');
  return accessToken;
}

// Fetch all packages from Airalo
async function fetchPackages(accessToken) {
  console.log('📦 Fetching packages from Airalo API...');
  
  const response = await fetch(`${AIRALO_BASE_URL}/v2/packages`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch packages: ${response.statusText}`);
  }

  const data = await response.json();
  const packages = data.data || [];
  
  console.log(`✅ Fetched ${packages.length} packages from Airalo\n`);
  return packages;
}

// Parse data amount
function parseDataAmount(pkg) {
  if (pkg.is_unlimited) {
    return 999999; // Use large number for unlimited
  }
  
  const amount = parseFloat(pkg.amount) || 0;
  const unit = pkg.amount_unit || 'GB';
  
  // Convert to MB
  return unit.toUpperCase() === 'GB' ? amount * 1024 : amount;
}

// Import packages to Firebase
async function importPackages() {
  console.log('🚀 Starting Airalo API import...\n');

  // Validate credentials
  if (!AIRALO_CLIENT_ID || !AIRALO_CLIENT_SECRET) {
    throw new Error('Missing AIRALO_CLIENT_ID or AIRALO_CLIENT_SECRET environment variables');
  }

  // Get access token
  const accessToken = await getAccessToken();

  // Fetch packages
  const packages = await fetchPackages(accessToken);

  // Process packages in batches
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let batchCount = 0;
  let countryPackages = 0;
  let regionalPackages = 0;
  let errors = 0;

  console.log('💾 Importing packages to Firebase...\n');

  for (const [index, pkg] of packages.entries()) {
    try {
      const packageId = pkg.id?.toString() || pkg.slug;
      
      if (!packageId) {
        console.warn(`⚠️  Skipping package ${index + 1}: No ID`);
        errors++;
        continue;
      }

      // Determine if regional or country-specific
      const isRegional = pkg.type === 'global' || pkg.countries?.length > 1;
      const countryCode = pkg.country?.slug || 'global';
      const countryName = pkg.country?.title || 'Global';

      // Calculate pricing
      const netPrice = parseFloat(pkg.price) || 0;
      const yourPrice = netPrice.toFixed(2);

      // Parse data
      const dataAmountMB = parseDataAmount(pkg);
      const validityDays = parseInt(pkg.validity) || pkg.day || 30;

      // Prepare package document
      const packageData = {
        // Identifiers
        id: packageId,
        slug: pkg.slug || packageId,
        
        // Location
        country_region: countryName,
        country_code: countryCode,
        country_codes: pkg.countries?.map(c => c.slug) || [countryCode],
        is_regional: isRegional,
        region_type: isRegional ? (pkg.type || 'regional') : null,
        
        // Package details
        title: pkg.title,
        name: pkg.title,
        description: pkg.short_info || '',
        type: pkg.fair_usage_policy ? 'sim' : 'sim', // Airalo doesn't distinguish, you can adjust
        
        // Data & Usage
        data: pkg.data || `${pkg.amount} ${pkg.amount_unit}`,
        data_amount_mb: dataAmountMB,
        capacity: dataAmountMB,
        is_unlimited: pkg.is_unlimited || false,
        validity: validityDays,
        validity_unit: 'days',
        day: validityDays,
        period: validityDays,
        amount: pkg.amount,
        amount_unit: pkg.amount_unit,
        
        // Voice & SMS (if available)
        sms: 0, // Airalo packages typically don't include SMS
        voice: 0, // Airalo packages typically don't include voice
        voice_minutes: 0,
        
        // Pricing
        net_price: netPrice, // What you pay Airalo
        price: parseFloat(yourPrice), // What customer pays you
        original_price: netPrice,
        currency: 'USD',
        markup_percentage: MARKUP_PERCENTAGE,
        
        // Network
        operator: pkg.operator?.title || '',
        networks: pkg.operator?.title || '',
        
        // Additional metadata
        fair_usage_policy: pkg.fair_usage_policy || null,
        activation_policy: pkg.activation_policy || null,
        
        // Status & Metadata
        status: 'active',
        enabled: true,
        provider: 'airalo',
        source: 'api_import',
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        synced_at: new Date().toISOString()
      };

      // Add to batch
      const packageRef = db.collection('dataplans').doc(packageId);
      batch.set(packageRef, packageData, { merge: true });
      batchCount++;

      // Track progress
      if (isRegional) {
        regionalPackages++;
      } else {
        countryPackages++;
      }

      // Commit batch when it reaches BATCH_SIZE
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`📦 Batch committed: ${batchCount} packages (Total: ${index + 1}/${packages.length})`);
        batch = db.batch();
        batchCount = 0;
      }

    } catch (error) {
      console.error(`❌ Error processing package ${index + 1}:`, error.message);
      errors++;
    }
  }

  // Commit remaining packages
  if (batchCount > 0) {
    await batch.commit();
    console.log(`📦 Final batch committed: ${batchCount} packages\n`);
  }

  // Update countries collection
  console.log('🌍 Updating countries collection...\n');
  await updateCountriesCollection();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Total packages imported: ${countryPackages + regionalPackages}`);
  console.log(`   📍 Country-specific: ${countryPackages}`);
  console.log(`   🌍 Regional packages: ${regionalPackages}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`💰 Your markup: ${MARKUP_PERCENTAGE}%`);
  console.log('='.repeat(60) + '\n');
}

// Update countries collection with plan counts and min prices
async function updateCountriesCollection() {
  // Get all packages
  const packagesSnapshot = await db.collection('dataplans').get();
  const allPackages = packagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Group packages by country/region
  const countriesMap = new Map();

  for (const pkg of allPackages) {
    const countryCodes = pkg.country_codes || [pkg.country_code];
    const price = parseFloat(pkg.price) || 0;

    for (const countryCode of countryCodes) {
      if (!countryCode) continue;

      if (!countriesMap.has(countryCode)) {
        countriesMap.set(countryCode, {
          code: countryCode,
          name: pkg.country_region,
          planCount: 0,
          prices: [],
          is_regional: pkg.is_regional || false
        });
      }

      const country = countriesMap.get(countryCode);
      country.planCount++;
      if (price > 0) {
        country.prices.push(price);
      }
    }
  }

  // Update each country in Firebase
  const countryBatch = db.batch();
  let countryCount = 0;

  for (const [countryCode, data] of countriesMap) {
    const minPrice = data.prices.length > 0 ? Math.min(...data.prices) : 0;

    const countryRef = db.collection('countries').doc(countryCode);
    
    // Get existing country data to preserve translations
    const existingDoc = await countryRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : {};

    countryBatch.set(countryRef, {
      code: countryCode,
      name: data.name,
      slug: countryCode,
      planCount: data.planCount,
      minPrice: minPrice,
      is_regional: data.is_regional,
      status: 'active',
      isActive: true,
      provider: 'airalo',
      // Preserve existing translations and photo
      translations: existingData.translations || {},
      photo: existingData.photo || '',
      description: existingData.description || '',
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      source: 'api_import'
    }, { merge: true });

    countryCount++;
  }

  await countryBatch.commit();
  console.log(`✅ Updated ${countryCount} countries/regions\n`);
}

// Run the import
importPackages()
  .then(() => {
    console.log('🎉 Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import failed:', error);
    process.exit(1);
  });














