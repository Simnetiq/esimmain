/**
 * Import Airalo CSV with Net Prices to Firebase
 * This script imports both country-specific and regional packages
 * 
 * Usage: node scripts/import-airalo-csv.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { getCountryCode } = require('./country-name-to-code');
const { getRegionForCountry, isPopularCountry } = require('./country-to-region-map');

// Firebase will be initialized by the calling script
const db = admin.firestore();

// Configuration
const CSV_FILE_PATH = path.join(__dirname, '../airalo-packages.csv');


// Regional package identifiers
const REGIONAL_IDENTIFIERS = ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Caribbean', 'Middle East', 'Oceania'];

// Parse validity from package ID (e.g., "7days", "30days")
function parseValidity(packageId) {
  const match = packageId.match(/(\d+)days?/i);
  return match ? parseInt(match[1]) : 30; // Default to 30 days
}

// Parse data amount from Data field
function parseDataAmount(dataField) {
  if (!dataField) return 0;
  
  if (dataField.toLowerCase().includes('unlimited')) {
    return 999999; // Use a large number for unlimited
  }
  
  const match = dataField.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
  if (!match) return 0;
  
  const amount = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  // Convert to MB
  return unit === 'GB' ? amount * 1024 : amount;
}

// Determine if package is regional
function isRegionalPackage(countryRegion) {
  return REGIONAL_IDENTIFIERS.includes(countryRegion);
}

// Clean up country/region name for slug
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

async function importCSV() {
  console.log('🚀 Starting Airalo CSV import...\n');
  
  const results = [];
  let countryPackages = 0;
  let regionalPackages = 0;
  let errors = 0;

  // Read and parse CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on('data', (row) => {
        results.push(row);
      })
      .on('end', () => {
        console.log(`✅ CSV parsed: ${results.length} packages found\n`);
        resolve();
      })
      .on('error', reject);
  });

  // Process packages in batches
  const BATCH_SIZE = 500;
  const allPackages = [];

  // First, prepare all packages
  for (const [index, row] of results.entries()) {
    try {
      const countryRegion = row['Country Region'];
      const packageId = row['Package Id'];
      const type = row['Type']; // 'sim' or 'topup'
      const netPrice = parseFloat(row['Net Price']);
      const retailPrice = parseFloat(row['Recommended retail price']);
      const dataField = row['Data'];
      const smsField = row['SMS'];
      const voiceField = row['Voice'];
      const networks = row['Networks'];

      // Skip topup packages for now
      if (type === 'topup') {
        continue;
      }

      // Skip if essential data is missing
      if (!packageId || !countryRegion || isNaN(netPrice)) {
        console.warn(`⚠️  Skipping row ${index + 1}: Missing essential data`);
        errors++;
        continue;
      }

      // Use base/net price directly (no markup)
      const yourPrice = netPrice.toFixed(2);

      // Parse data amount and validity
      const dataAmountMB = parseDataAmount(dataField);
      const validityDays = parseValidity(packageId);
      const isUnlimited = dataField?.toLowerCase().includes('unlimited');

      // Determine if this is a regional package
      const isRegional = isRegionalPackage(countryRegion);
      
      // Get proper country code (uses mapping for known countries, generates slug for others)
      const countryCode = getCountryCode(countryRegion);

      // Track progress
      if (isRegional) {
        regionalPackages++;
      } else {
        countryPackages++;
      }

      // Get region for the first country code
      const packageRegion = isRegional ? getRegionForCountry(countryCode) : getRegionForCountry(countryCode);
      
      // Prepare package document
      const packageData = {
        // Identifiers
        id: packageId,
        slug: packageId,
        
        // Location
        country_region: countryRegion,
        country_code: countryCode,
        country_codes: [countryCode],
        is_regional: isRegional,
        region_type: isRegional ? countryRegion : null,
        region: packageRegion, // Geographic region (asia, europe, americas, etc.)
        
        // Package details
        title: `${countryRegion} - ${dataField} - ${validityDays} Days`,
        name: `${countryRegion} - ${dataField} - ${validityDays} Days`,
        type: type, // 'sim' or 'topup'
        
        // Data & Usage
        data: dataField,
        data_amount_mb: dataAmountMB,
        capacity: dataAmountMB,
        is_unlimited: isUnlimited,
        validity: validityDays,
        validity_unit: 'days',
        day: validityDays,
        period: validityDays,
        
        // Voice & SMS
        sms: parseInt(smsField) || 0,
        voice: parseInt(voiceField) || 0,
        voice_minutes: parseInt(voiceField) || 0,
        
        // Pricing
        net_price: netPrice, // What you pay Airalo
        price: parseFloat(yourPrice), // What customer pays (base price)
        retail_price_recommended: retailPrice, // Airalo's recommended retail (reference)
        original_price: netPrice,
        currency: 'USD',
        markup_percentage: 0, // Using Airalo's recommended prices
        
        // Network
        networks: networks,
        operator: networks ? networks.split(',')[0].trim() : '',
        
        // Status & Metadata
        status: 'active',
        enabled: true,
        provider: 'airalo',
        source: 'csv_import',
        imported_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        synced_at: new Date().toISOString()
      };

      allPackages.push({ id: packageId, data: packageData });

    } catch (error) {
      console.error(`❌ Error processing row ${index + 1}:`, error.message);
      errors++;
    }
  }

  // Now batch write them
  console.log(`\n💾 Writing ${allPackages.length} packages to Firebase in batches of ${BATCH_SIZE}...\n`);
  
  for (let i = 0; i < allPackages.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = allPackages.slice(i, i + BATCH_SIZE);
    
    for (const pkg of chunk) {
      const packageRef = db.collection('dataplans').doc(pkg.id);
      batch.set(packageRef, pkg.data, { merge: true });
    }
    
    await batch.commit();
    console.log(`📦 Batch committed: ${chunk.length} packages (Total: ${Math.min(i + BATCH_SIZE, allPackages.length)}/${allPackages.length})`);
  }

  console.log(`\n✅ All packages written to Firebase\n`);

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
  console.log(`💰 Pricing: Using Airalo's recommended retail prices (no markup)`);
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
    const countryCode = pkg.country_code;
    const price = parseFloat(pkg.price) || 0;

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

  // Update each country in Firebase
  const countryBatch = db.batch();
  let countryCount = 0;

  for (const [countryCode, data] of countriesMap) {
    const minPrice = data.prices.length > 0 ? Math.min(...data.prices) : 0;

    const countryRef = db.collection('countries').doc(countryCode);
    
    // Get existing country data to preserve translations
    const existingDoc = await countryRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : {};

    // Get region for this country
    const region = getRegionForCountry(countryCode);
    const isPopular = isPopularCountry(countryCode);
    
    countryBatch.set(countryRef, {
      code: countryCode,
      name: data.name,
      slug: countryCode,
      planCount: data.planCount,
      minPrice: minPrice,
      is_regional: data.is_regional,
      region: region, // Add region field
      is_popular: isPopular, // Add popular flag
      status: 'active',
      isActive: true,
      provider: 'airalo',
      // Preserve existing translations and photo
      translations: existingData.translations || {},
      photo: existingData.photo || '',
      description: existingData.description || '',
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      source: 'csv_import'
    }, { merge: true });

    countryCount++;
  }

  await countryBatch.commit();
  console.log(`✅ Updated ${countryCount} countries/regions\n`);
}

// Run the import
importCSV()
  .then(() => {
    console.log('🎉 Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import failed:', error);
    process.exit(1);
  });

