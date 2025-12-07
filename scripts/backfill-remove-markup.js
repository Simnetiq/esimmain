/**
 * Backfill Script: Remove Price Markup from Firestore
 * 
 * This script:
 * 1. Reads all dataplans from Firestore
 * 2. Sets price = net_price (or original_price if net_price missing)
 * 3. Sets markup_percentage = 0
 * 4. Recomputes countries.minPrice from the corrected dataplans
 * 
 * Run with: node scripts/backfill-remove-markup.js
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

async function backfillDataPlans() {
  console.log('🔧 Starting dataplan price backfill...\n');
  
  try {
    // Fetch all dataplans
    const dataplansSnapshot = await db.collection('dataplans').get();
    console.log(`📊 Found ${dataplansSnapshot.size} dataplans\n`);
    
    const BATCH_SIZE = 400;
    let batch = db.batch();
    let batchCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const doc of dataplansSnapshot.docs) {
      const data = doc.data();
      
      // Get the base price (net_price or original_price)
      const basePrice = parseFloat(data.net_price ?? data.original_price ?? data.price);
      
      if (!basePrice || Number.isNaN(basePrice) || basePrice <= 0) {
        console.warn(`⚠️  Skipping ${doc.id}: invalid base price`);
        skippedCount++;
        continue;
      }
      
      // Only update if price is different from base (i.e., has markup)
      const currentPrice = parseFloat(data.price);
      if (Math.abs(currentPrice - basePrice) < 0.01) {
        // Price is already correct, skip
        skippedCount++;
        continue;
      }
      
      // Update the document
      batch.update(doc.ref, {
        price: basePrice,
        markup_percentage: 0,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        backfilled_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      batchCount++;
      updatedCount++;
      
      // Commit batch when reaching limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`✅ Committed batch: ${updatedCount} plans updated so far...`);
        batch = db.batch();
        batchCount = 0;
      }
    }
    
    // Commit remaining items
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ Committed final batch`);
    }
    
    console.log(`\n✅ Dataplan backfill complete:`);
    console.log(`   - Updated: ${updatedCount} plans`);
    console.log(`   - Skipped: ${skippedCount} plans (already correct or invalid)`);
    console.log(`   - Total: ${dataplansSnapshot.size} plans\n`);
    
    return { updatedCount, skippedCount };
    
  } catch (error) {
    console.error('❌ Error during dataplan backfill:', error);
    throw error;
  }
}

async function recomputeCountryMinPrices() {
  console.log('🔧 Recomputing country minimum prices...\n');
  
  try {
    // Fetch all dataplans (now with corrected prices)
    const dataplansSnapshot = await db.collection('dataplans').get();
    const allPlans = dataplansSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Fetch all countries
    const countriesSnapshot = await db.collection('countries').get();
    const countries = countriesSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    
    console.log(`📊 Processing ${countries.length} countries...\n`);
    
    const BATCH_SIZE = 400;
    let batch = db.batch();
    let batchCount = 0;
    let updatedCount = 0;
    
    for (const country of countries) {
      const countryCode = country.code || country.id;
      
      // Filter plans for this country
      const countryPlans = allPlans.filter(plan => {
        if (plan.country_codes && Array.isArray(plan.country_codes)) {
          return plan.country_codes.includes(countryCode);
        }
        if (plan.country_code === countryCode) {
          return true;
        }
        return false;
      });
      
      // Calculate min price from enabled plans
      const enabledPlans = countryPlans.filter(p => p.enabled !== false && p.status === 'active');
      const prices = enabledPlans
        .map(p => parseFloat(p.price))
        .filter(p => p > 0 && !isNaN(p));
      
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const planCount = enabledPlans.length;
      
      // Update country
      const countryRef = db.collection('countries').doc(countryCode);
      batch.update(countryRef, {
        planCount: planCount,
        minPrice: minPrice,
        lastPriceSync: admin.firestore.FieldValue.serverTimestamp(),
        backfilled_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      batchCount++;
      updatedCount++;
      
      // Commit batch when reaching limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`✅ Updated ${updatedCount} countries so far...`);
        batch = db.batch();
        batchCount = 0;
      }
    }
    
    // Commit remaining items
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`\n✅ Country min prices recomputed: ${updatedCount} countries updated\n`);
    
    return { updatedCount };
    
  } catch (error) {
    console.error('❌ Error recomputing country prices:', error);
    throw error;
  }
}

async function run() {
  const startTime = Date.now();
  
  console.log('='.repeat(60));
  console.log('🚀 BACKFILL: Remove Price Markup from Firestore');
  console.log('='.repeat(60));
  console.log();
  
  try {
    // Step 1: Backfill dataplans
    const dataplanResults = await backfillDataPlans();
    
    // Step 2: Recompute country min prices
    const countryResults = await recomputeCountryMinPrices();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('='.repeat(60));
    console.log('✅ BACKFILL COMPLETE');
    console.log('='.repeat(60));
    console.log(`Duration: ${duration}s`);
    console.log(`Dataplans updated: ${dataplanResults.updatedCount}`);
    console.log(`Countries updated: ${countryResults.updatedCount}`);
    console.log();
    console.log('📋 NEXT STEPS:');
    console.log('1. Verify prices in Firestore console');
    console.log('2. Restart your dev server (npm run dev)');
    console.log('3. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)');
    console.log('4. Prices should now match net_price (no 17% markup)');
    console.log();
    
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the backfill
run();

