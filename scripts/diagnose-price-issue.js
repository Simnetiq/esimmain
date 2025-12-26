/**
 * Diagnostic Script: Check Price Issues
 * 
 * This script checks:
 * 1. What prices are stored in Firebase
 * 2. What prices should be (from CSV)
 * 3. If backfill script modified prices incorrectly
 * 4. Which countries have wrong prices
 * 
 * Usage: node scripts/diagnose-price-issue.js
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
}

const db = admin.firestore();

// Load expected prices from CSV
async function loadExpectedPrices() {
  const csvPath = path.join(__dirname, '..', 'airalo-packages.csv');
  const expectedPrices = {};
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        const packageId = row['Package Id'];
        const netPrice = parseFloat(row['Net Price']);
        const retailPrice = parseFloat(row['Recommended retail price']);
        const countryRegion = row['Country Region'];
        
        expectedPrices[packageId] = {
          netPrice,
          retailPrice,
          country: countryRegion
        };
      })
      .on('end', () => resolve(expectedPrices))
      .on('error', reject);
  });
}

async function diagnose() {
  console.log('🔍 Diagnosing Price Issues...\n');
  console.log('='.repeat(80));
  
  try {
    // Load expected prices from CSV
    console.log('📄 Loading expected prices from CSV...');
    const expectedPrices = await loadExpectedPrices();
    console.log(`✅ Loaded ${Object.keys(expectedPrices).length} package prices from CSV\n`);
    
    // Load actual prices from Firebase
    console.log('📊 Loading actual prices from Firebase...');
    const plansSnapshot = await db.collection('dataplans').get();
    console.log(`✅ Found ${plansSnapshot.size} plans in Firebase\n`);
    
    console.log('='.repeat(80));
    console.log('🚨 PRICE DISCREPANCIES:\n');
    
    const issues = {
      priceTooLow: [],
      priceHardcoded: [],
      missingMarkup: [],
      correct: []
    };
    
    for (const doc of plansSnapshot.docs) {
      const data = doc.data();
      const packageId = doc.id;
      const expected = expectedPrices[packageId];
      
      if (!expected) {
        continue; // Skip if not in CSV
      }
      
      const storedPrice = parseFloat(data.price);
      const netPrice = parseFloat(data.net_price || expected.netPrice);
      const markupPercentage = parseFloat(data.markup_percentage || 0);
      
      // Check for issues
      const issue = {
        id: packageId,
        country: expected.country,
        csvNetPrice: expected.netPrice,
        csvRetailPrice: expected.retailPrice,
        storedPrice: storedPrice,
        storedNetPrice: netPrice,
        markupPercentage: markupPercentage,
        backfilled: !!data.backfilled_at
      };
      
      // Issue 1: Price below net price (selling at a loss)
      if (storedPrice < netPrice - 0.01) {
        issue.problem = `Price $${storedPrice.toFixed(2)} is BELOW cost $${netPrice.toFixed(2)}!`;
        issues.priceTooLow.push(issue);
      }
      // Issue 2: Price exactly at minimum ($0.50)
      else if (Math.abs(storedPrice - 0.5) < 0.01) {
        issue.problem = `Price hardcoded at $0.50 (should be $${netPrice.toFixed(2)})`;
        issues.priceHardcoded.push(issue);
      }
      // Issue 3: No markup (price === net_price) but should have markup
      else if (Math.abs(storedPrice - netPrice) < 0.01 && markupPercentage === 0) {
        issue.problem = `No markup applied (price = net_price)`;
        issues.missingMarkup.push(issue);
      }
      // OK
      else {
        issues.correct.push(issue);
      }
    }
    
    // Report issues
    if (issues.priceTooLow.length > 0) {
      console.log(`⚠️  CRITICAL: ${issues.priceTooLow.length} plans selling BELOW COST:\n`);
      issues.priceTooLow.slice(0, 10).forEach(i => {
        console.log(`   ${i.country} - ${i.id}`);
        console.log(`   Cost: $${i.csvNetPrice.toFixed(2)}, Selling: $${i.storedPrice.toFixed(2)}`);
        console.log(`   LOSS: $${(i.csvNetPrice - i.storedPrice).toFixed(2)} per sale! 💸\n`);
      });
      if (issues.priceTooLow.length > 10) {
        console.log(`   ... and ${issues.priceTooLow.length - 10} more\n`);
      }
    }
    
    if (issues.priceHardcoded.length > 0) {
      console.log(`⚠️  WARNING: ${issues.priceHardcoded.length} plans hardcoded at $0.50:\n`);
      issues.priceHardcoded.slice(0, 10).forEach(i => {
        console.log(`   ${i.country} - ${i.id}`);
        console.log(`   Should be: $${i.csvNetPrice.toFixed(2)}, Showing: $0.50\n`);
      });
      if (issues.priceHardcoded.length > 10) {
        console.log(`   ... and ${issues.priceHardcoded.length - 10} more\n`);
      }
    }
    
    if (issues.missingMarkup.length > 0) {
      console.log(`ℹ️  INFO: ${issues.missingMarkup.length} plans with no markup (selling at cost):\n`);
      
      // Group by country
      const byCountry = {};
      issues.missingMarkup.forEach(i => {
        if (!byCountry[i.country]) byCountry[i.country] = [];
        byCountry[i.country].push(i);
      });
      
      Object.entries(byCountry).slice(0, 10).forEach(([country, plans]) => {
        console.log(`   ${country}: ${plans.length} plans at cost price`);
        console.log(`     Example: ${plans[0].id} - $${plans[0].storedPrice.toFixed(2)}`);
        console.log(`     CSV Retail: $${plans[0].csvRetailPrice.toFixed(2)} (suggested)\n`);
      });
    }
    
    console.log('='.repeat(80));
    console.log('📊 SUMMARY:\n');
    console.log(`   ❌ Selling below cost: ${issues.priceTooLow.length} plans`);
    console.log(`   ⚠️  Hardcoded at $0.50: ${issues.priceHardcoded.length} plans`);
    console.log(`   ℹ️  No markup (at cost): ${issues.missingMarkup.length} plans`);
    console.log(`   ✅ Correct pricing: ${issues.correct.length} plans`);
    console.log('');
    
    // Check specific countries
    console.log('='.repeat(80));
    console.log('🌍 COUNTRY-SPECIFIC ANALYSIS:\n');
    
    const checkCountries = ['United Kingdom', 'United States', 'France', 'Germany', 'Spain'];
    
    for (const country of checkCountries) {
      const countryPlans = [...issues.priceTooLow, ...issues.priceHardcoded, ...issues.missingMarkup, ...issues.correct]
        .filter(i => i.country === country);
      
      if (countryPlans.length === 0) continue;
      
      const hasIssues = countryPlans.some(p => 
        issues.priceTooLow.includes(p) || 
        issues.priceHardcoded.includes(p)
      );
      
      const avgStoredPrice = countryPlans.reduce((sum, p) => sum + p.storedPrice, 0) / countryPlans.length;
      const avgNetPrice = countryPlans.reduce((sum, p) => sum + p.csvNetPrice, 0) / countryPlans.length;
      
      console.log(`${hasIssues ? '⚠️ ' : '✅'} ${country}:`);
      console.log(`   Plans: ${countryPlans.length}`);
      console.log(`   Avg stored price: $${avgStoredPrice.toFixed(2)}`);
      console.log(`   Avg net price: $${avgNetPrice.toFixed(2)}`);
      console.log(`   Status: ${hasIssues ? 'HAS ISSUES' : 'OK'}\n`);
    }
    
    // Recommendations
    console.log('='.repeat(80));
    console.log('💡 RECOMMENDATIONS:\n');
    
    if (issues.priceTooLow.length > 0) {
      console.log('⚠️  URGENT: You have plans selling below cost!');
      console.log('   Fix: Run a backfill to set prices >= net_price');
      console.log('   Or: Disable these plans until prices are fixed\n');
    }
    
    if (issues.priceHardcoded.length > 0) {
      console.log('⚠️  WARNING: Some plans hardcoded at $0.50');
      console.log('   Cause: Likely a bug in price calculation or missing data');
      console.log('   Fix: Check why price field is 0.5 in Firebase\n');
    }
    
    if (issues.missingMarkup.length > 0) {
      console.log('ℹ️  INFO: Plans selling at cost (no profit margin)');
      console.log('   This is OK if intentional (no markup strategy)');
      console.log('   Or: Run backfill to add 17% markup if desired\n');
    }
    
    if (issues.priceTooLow.length === 0 && issues.priceHardcoded.length === 0) {
      console.log('✅ No critical price issues found!');
      console.log('   Your prices are at or above cost.\n');
    }
    
    console.log('='.repeat(80));
    console.log('\n📝 Next Steps:');
    console.log('1. Review the issues above');
    console.log('2. Decide on your pricing strategy (see FIX_WEBPACK_AND_PRICE_ISSUES.md)');
    console.log('3. Run appropriate backfill script if needed');
    console.log('4. Re-run this diagnostic to verify fixes\n');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    throw error;
  }
  
  process.exit(0);
}

// Run diagnosis
diagnose();














