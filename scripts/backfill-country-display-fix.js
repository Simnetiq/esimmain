/**
 * Backfill Script: Fix Country Display Names
 * 
 * Problem: Orders/dataplans have country_code but missing country_region
 * Solution: Add country_region (full English name) for proper display
 * 
 * Usage: node scripts/backfill-country-display-fix.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
}

const db = admin.firestore();

// Map slugs and ISO codes to full English names
const CODE_TO_NAME = {
  // ISO 2-letter codes
  'AU': 'Australia',
  'AT': 'Austria',
  'US': 'United States',
  'GB': 'United Kingdom',
  'CA': 'Canada',
  'FR': 'France',
  'DE': 'Germany',
  'IT': 'Italy',
  'ES': 'Spain',
  'JP': 'Japan',
  'CN': 'China',
  'IN': 'India',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'CH': 'Switzerland',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'PL': 'Poland',
  'GR': 'Greece',
  'PT': 'Portugal',
  'IE': 'Ireland',
  'NZ': 'New Zealand',
  'SG': 'Singapore',
  'HK': 'Hong Kong',
  'TH': 'Thailand',
  'MY': 'Malaysia',
  'ID': 'Indonesia',
  'PH': 'Philippines',
  'VN': 'Vietnam',
  'KR': 'South Korea',
  'TW': 'Taiwan',
  'ZA': 'South Africa',
  'EG': 'Egypt',
  'NG': 'Nigeria',
  'KE': 'Kenya',
  'AR': 'Argentina',
  'CL': 'Chile',
  'CO': 'Colombia',
  'PE': 'Peru',
  'AE': 'United Arab Emirates',
  'SA': 'Saudi Arabia',
  'IL': 'Israel',
  'TR': 'Turkey',
  'RU': 'Russia',
  'UA': 'Ukraine',
  'CZ': 'Czech Republic',
  'HU': 'Hungary',
  'RO': 'Romania',
  'BG': 'Bulgaria',
  'HR': 'Croatia',
  'RS': 'Serbia',
  'SI': 'Slovenia',
  'SK': 'Slovakia',
  'LT': 'Lithuania',
  'LV': 'Latvia',
  'EE': 'Estonia',
  'IS': 'Iceland',
  'VA': 'Vatican City',
  
  // Slugs
  'australia': 'Australia',
  'austria': 'Austria',
  'united-states': 'United States',
  'united-kingdom': 'United Kingdom',
  'canada': 'Canada',
  'france': 'France',
  'germany': 'Germany',
  'italy': 'Italy',
  'spain': 'Spain',
  'japan': 'Japan',
  'china': 'China',
  'india': 'India',
  'brazil': 'Brazil',
  'mexico': 'Mexico',
  'netherlands': 'Netherlands',
  'belgium': 'Belgium',
  'switzerland': 'Switzerland',
  'sweden': 'Sweden',
  'norway': 'Norway',
  'denmark': 'Denmark',
  'finland': 'Finland',
  'poland': 'Poland',
  'greece': 'Greece',
  'portugal': 'Portugal',
  'ireland': 'Ireland',
  'new-zealand': 'New Zealand',
  'singapore': 'Singapore',
  'hong-kong': 'Hong Kong',
  'thailand': 'Thailand',
  'malaysia': 'Malaysia',
  'indonesia': 'Indonesia',
  'philippines': 'Philippines',
  'vietnam': 'Vietnam',
  'south-korea': 'South Korea',
  'taiwan': 'Taiwan',
  'south-africa': 'South Africa',
  'egypt': 'Egypt',
  'nigeria': 'Nigeria',
  'kenya': 'Kenya',
  'argentina': 'Argentina',
  'chile': 'Chile',
  'colombia': 'Colombia',
  'peru': 'Peru',
  'united-arab-emirates': 'United Arab Emirates',
  'saudi-arabia': 'Saudi Arabia',
  'israel': 'Israel',
  'turkey': 'Turkey',
  'russia': 'Russia',
  'ukraine': 'Ukraine',
  'czech-republic': 'Czech Republic',
  'hungary': 'Hungary',
  'romania': 'Romania',
  'bulgaria': 'Bulgaria',
  'croatia': 'Croatia',
  'serbia': 'Serbia',
  'slovenia': 'Slovenia',
  'slovakia': 'Slovakia',
  'lithuania': 'Lithuania',
  'latvia': 'Latvia',
  'estonia': 'Estonia',
  'iceland': 'Iceland',
  'vatican-city': 'Vatican City',
  
  // Regional
  'europe': 'Europe',
  'asia': 'Asia',
  'africa': 'Africa',
  'oceania': 'Oceania',
  'americas': 'Americas',
  'caribbean': 'Caribbean',
  'middle-east': 'Middle East',
  'north-america': 'North America',
  'south-america': 'South America',
  'latin-america': 'Latin America'
};

// Get full name from any code format
function getFullName(code) {
  if (!code) return null;
  
  // Try direct lookup
  if (CODE_TO_NAME[code]) {
    return CODE_TO_NAME[code];
  }
  
  // Try uppercase (ISO codes)
  if (CODE_TO_NAME[code.toUpperCase()]) {
    return CODE_TO_NAME[code.toUpperCase()];
  }
  
  // Try lowercase (slugs)
  if (CODE_TO_NAME[code.toLowerCase()]) {
    return CODE_TO_NAME[code.toLowerCase()];
  }
  
  // If not found, capitalize the code
  return code.charAt(0).toUpperCase() + code.slice(1).replace(/-/g, ' ');
}

async function backfillDataPlans() {
  console.log('🔧 Backfilling DataPlans country names...\n');
  
  try {
    // Get all dataplans
    const plansSnapshot = await db.collection('dataplans').get();
    console.log(`Found ${plansSnapshot.size} dataplans`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    const batch = db.batch();
    let batchCount = 0;
    
    for (const doc of plansSnapshot.docs) {
      const data = doc.data();
      
      // Skip if already has country_region
      if (data.country_region) {
        skipped++;
        continue;
      }
      
      // Get name from country_code
      if (data.country_code) {
        const fullName = getFullName(data.country_code);
        
        if (fullName) {
          batch.update(doc.ref, {
            country_region: fullName,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          
          updated++;
          batchCount++;
          
          console.log(`✅ ${doc.id}: ${data.country_code} → ${fullName}`);
        } else {
          console.warn(`⚠️  ${doc.id}: Could not find name for code ${data.country_code}`);
          errors++;
        }
      }
      
      // Commit batch every 500 docs
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`\n💾 Committed ${batchCount} updates...\n`);
        batchCount = 0;
      }
    }
    
    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log('\n📊 DataPlans Summary:');
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped} (already have country_region)`);
    console.log(`   Errors: ${errors}`);
    
  } catch (error) {
    console.error('❌ Error backfilling dataplans:', error);
    throw error;
  }
}

async function backfillOrders() {
  console.log('\n🔧 Backfilling Orders country names...\n');
  
  try {
    // Get all orders
    const ordersSnapshot = await db.collection('orders').get();
    console.log(`Found ${ordersSnapshot.size} orders`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    const batch = db.batch();
    let batchCount = 0;
    
    for (const doc of ordersSnapshot.docs) {
      const data = doc.data();
      
      // Skip if already has country_region
      if (data.country_region) {
        skipped++;
        continue;
      }
      
      // Get name from country_code
      if (data.country_code) {
        const fullName = getFullName(data.country_code);
        
        if (fullName) {
          batch.update(doc.ref, {
            country_region: fullName,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          
          updated++;
          batchCount++;
          
          console.log(`✅ ${doc.id}: ${data.country_code} → ${fullName}`);
        } else {
          console.warn(`⚠️  ${doc.id}: Could not find name for code ${data.country_code}`);
          errors++;
        }
      }
      
      // Commit batch every 500 docs
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`\n💾 Committed ${batchCount} updates...\n`);
        batchCount = 0;
      }
    }
    
    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log('\n📊 Orders Summary:');
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped} (already have country_region)`);
    console.log(`   Errors: ${errors}`);
    
  } catch (error) {
    console.error('❌ Error backfilling orders:', error);
    throw error;
  }
}

async function backfillUserEsims() {
  console.log('\n🔧 Backfilling User eSIMs country names...\n');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users`);
    
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const esimsSnapshot = await userDoc.ref.collection('esims').get();
      
      if (esimsSnapshot.empty) continue;
      
      const batch = db.batch();
      let batchCount = 0;
      
      for (const esimDoc of esimsSnapshot.docs) {
        const data = esimDoc.data();
        
        // Skip if already has country_region
        if (data.country_region) {
          totalSkipped++;
          continue;
        }
        
        // Get name from country_code
        if (data.country_code) {
          const fullName = getFullName(data.country_code);
          
          if (fullName) {
            batch.update(esimDoc.ref, {
              country_region: fullName,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            totalUpdated++;
            batchCount++;
            
            console.log(`✅ ${userDoc.id}/${esimDoc.id}: ${data.country_code} → ${fullName}`);
          } else {
            totalErrors++;
          }
        }
      }
      
      // Commit batch for this user
      if (batchCount > 0) {
        await batch.commit();
      }
    }
    
    console.log('\n📊 User eSIMs Summary:');
    console.log(`   Updated: ${totalUpdated}`);
    console.log(`   Skipped: ${totalSkipped}`);
    console.log(`   Errors: ${totalErrors}`);
    
  } catch (error) {
    console.error('❌ Error backfilling user eSIMs:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting country display name backfill...\n');
  console.log('This will add country_region (full English name) to all documents\n');
  
  try {
    await backfillDataPlans();
    await backfillOrders();
    await backfillUserEsims();
    
    console.log('\n✅ Backfill complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Deploy updated Dashboard.jsx to read country_region first');
    console.log('2. Test that Australia shows as "Australia" not "Austria"');
    console.log('3. Monitor for any remaining display issues');
    
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
