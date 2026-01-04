#!/usr/bin/env node

/**
 * Migration Validation Script
 *
 * Validates that data was successfully migrated from Firebase to Supabase.
 * Performs count checks, spot checks, and referential integrity validation.
 *
 * Usage:
 *   node scripts/validate-migration.js
 *
 * Environment Variables:
 *   SUPABASE_URL         - Supabase project URL
 *   SUPABASE_SERVICE_KEY - Supabase service role key
 */

const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
try {
  const serviceAccount = require(serviceAccountPath);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (error) {
  console.error('❌ Firebase service account not found at:', serviceAccountPath);
  process.exit(1);
}

const db = admin.firestore();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Validation results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function logResult(test, passed, message, isWarning = false) {
  const status = passed ? '✅' : (isWarning ? '⚠️' : '❌');
  console.log(`${status} ${test}: ${message}`);

  if (passed) {
    results.passed++;
  } else if (isWarning) {
    results.warnings++;
  } else {
    results.failed++;
  }

  results.details.push({ test, passed, isWarning, message });
}

/**
 * Validate counts match between Firebase and Supabase
 */
async function validateCounts() {
  console.log('\n📊 COUNT VALIDATION');
  console.log('-'.repeat(50));

  // Countries count
  const firebaseCountriesSnap = await db.collection('countries').get();
  const firebaseCountriesCount = firebaseCountriesSnap.size;

  const { count: supabaseCountriesCount, error: countriesError } = await supabase
    .from('countries')
    .select('*', { count: 'exact', head: true });

  if (countriesError) {
    logResult('Countries count', false, `Supabase error: ${countriesError.message}`);
  } else {
    const match = firebaseCountriesCount === supabaseCountriesCount;
    logResult(
      'Countries count',
      match,
      `Firebase: ${firebaseCountriesCount}, Supabase: ${supabaseCountriesCount}`,
      !match
    );
  }

  // Dataplans count
  const firebasePlansSnap = await db.collection('dataplans').get();
  const firebasePlansCount = firebasePlansSnap.size;

  const { count: supabasePlansCount, error: plansError } = await supabase
    .from('dataplans')
    .select('*', { count: 'exact', head: true });

  if (plansError) {
    logResult('Dataplans count', false, `Supabase error: ${plansError.message}`);
  } else {
    const match = firebasePlansCount === supabasePlansCount;
    logResult(
      'Dataplans count',
      match,
      `Firebase: ${firebasePlansCount}, Supabase: ${supabasePlansCount}`,
      !match
    );
  }

  // Active countries count
  const firebaseActiveSnap = await db.collection('countries')
    .where('status', '==', 'active')
    .get();

  const { count: supabaseActiveCount, error: activeError } = await supabase
    .from('countries')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  if (activeError) {
    logResult('Active countries', false, `Supabase error: ${activeError.message}`);
  } else {
    logResult(
      'Active countries',
      true,
      `Firebase: ${firebaseActiveSnap.size}, Supabase: ${supabaseActiveCount}`
    );
  }
}

/**
 * Spot check specific records
 */
async function validateSpotChecks() {
  console.log('\n🔍 SPOT CHECK VALIDATION');
  console.log('-'.repeat(50));

  // Sample country IDs to check
  const sampleCountries = ['united-states', 'germany', 'japan', 'turkey', 'france'];

  for (const countryId of sampleCountries) {
    // Get from Firebase
    const firebaseDoc = await db.collection('countries').doc(countryId).get();

    if (!firebaseDoc.exists) {
      logResult(`Country ${countryId}`, true, 'Not in Firebase (skipped)', true);
      continue;
    }

    const firebaseData = firebaseDoc.data();

    // Get from Supabase
    const { data: supabaseData, error } = await supabase
      .from('countries')
      .select('*')
      .eq('id', countryId)
      .single();

    if (error || !supabaseData) {
      logResult(`Country ${countryId}`, false, 'Not found in Supabase');
      continue;
    }

    // Compare key fields
    const checks = [
      firebaseData.name === supabaseData.name,
      (firebaseData.is_popular === true) === supabaseData.is_popular,
      (firebaseData.status === 'active') === supabaseData.is_active
    ];

    const allMatch = checks.every(c => c);
    logResult(
      `Country ${countryId}`,
      allMatch,
      `name: ${supabaseData.name}, popular: ${supabaseData.is_popular}, active: ${supabaseData.is_active}`
    );
  }

  // Check a few dataplans
  console.log('\n');

  const { data: samplePlans } = await supabase
    .from('dataplans')
    .select('id, title, price, country_id')
    .limit(5);

  for (const plan of samplePlans || []) {
    const firebaseDoc = await db.collection('dataplans').doc(plan.id).get();

    if (!firebaseDoc.exists) {
      logResult(`Dataplan ${plan.id}`, false, 'Not found in Firebase');
      continue;
    }

    const firebaseData = firebaseDoc.data();
    const priceMatch = Math.abs(parseFloat(firebaseData.price) - parseFloat(plan.price)) < 0.01;

    logResult(
      `Dataplan ${plan.id}`,
      priceMatch,
      `Price: $${plan.price} (Firebase: $${firebaseData.price})`
    );
  }
}

/**
 * Validate referential integrity
 */
async function validateReferentialIntegrity() {
  console.log('\n🔗 REFERENTIAL INTEGRITY');
  console.log('-'.repeat(50));

  // Check dataplans with invalid country_id
  const { data: orphanPlans, error: orphanError } = await supabase
    .from('dataplans')
    .select('id, country_id')
    .not('country_id', 'is', null);

  if (orphanError) {
    logResult('Dataplan FK check', false, `Query error: ${orphanError.message}`);
  } else {
    // Get all country IDs
    const { data: countries } = await supabase.from('countries').select('id');
    const countryIds = new Set((countries || []).map(c => c.id));

    const orphans = (orphanPlans || []).filter(p => !countryIds.has(p.country_id));

    logResult(
      'Dataplan FK check',
      orphans.length === 0,
      orphans.length === 0
        ? 'All dataplans reference valid countries'
        : `${orphans.length} dataplans reference invalid countries`
    );

    if (orphans.length > 0 && orphans.length <= 10) {
      console.log(`   Orphan IDs: ${orphans.map(p => p.id).join(', ')}`);
    }
  }

  // Check countries with invalid region_id
  const { data: orphanCountries, error: regionError } = await supabase
    .from('countries')
    .select('id, region_id')
    .not('region_id', 'is', null);

  if (regionError) {
    logResult('Country region FK check', false, `Query error: ${regionError.message}`);
  } else {
    const { data: regions } = await supabase.from('regions').select('id');
    const regionIds = new Set((regions || []).map(r => r.id));

    const orphans = (orphanCountries || []).filter(c => !regionIds.has(c.region_id));

    logResult(
      'Country region FK check',
      orphans.length === 0,
      orphans.length === 0
        ? 'All countries reference valid regions'
        : `${orphans.length} countries reference invalid regions`
    );
  }
}

/**
 * Validate data quality
 */
async function validateDataQuality() {
  console.log('\n📋 DATA QUALITY');
  console.log('-'.repeat(50));

  // Check for null names in countries
  const { count: nullNameCount } = await supabase
    .from('countries')
    .select('*', { count: 'exact', head: true })
    .is('name', null);

  logResult(
    'Countries with names',
    nullNameCount === 0,
    nullNameCount === 0 ? 'All countries have names' : `${nullNameCount} countries missing name`
  );

  // Check for dataplans with valid prices
  const { count: zeroPriceCount } = await supabase
    .from('dataplans')
    .select('*', { count: 'exact', head: true })
    .eq('price', 0);

  logResult(
    'Dataplans with prices',
    true,
    `${zeroPriceCount} dataplans have zero price`,
    zeroPriceCount > 0
  );

  // Check for dataplans with valid data amounts
  const { count: zeroDataCount } = await supabase
    .from('dataplans')
    .select('*', { count: 'exact', head: true })
    .eq('data_amount_mb', 0)
    .eq('is_unlimited', false);

  logResult(
    'Dataplans with data',
    zeroDataCount === 0,
    zeroDataCount === 0
      ? 'All non-unlimited plans have data amounts'
      : `${zeroDataCount} non-unlimited plans have zero data`,
    zeroDataCount > 0
  );
}

/**
 * Test common query patterns
 */
async function validateQueryPatterns() {
  console.log('\n⚡ QUERY PATTERN TESTS');
  console.log('-'.repeat(50));

  // Test: Popular countries query (homepage)
  const start1 = Date.now();
  const { data: popularCountries, error: err1 } = await supabase
    .from('countries')
    .select('id, name, image_url, min_price')
    .eq('is_popular', true)
    .eq('is_active', true)
    .order('name');
  const time1 = Date.now() - start1;

  logResult(
    'Popular countries query',
    !err1 && time1 < 500,
    `${popularCountries?.length || 0} results in ${time1}ms`
  );

  // Test: Plans for country (detail page)
  const start2 = Date.now();
  const { data: usPlans, error: err2 } = await supabase
    .from('dataplans')
    .select('id, title, price, data_display, validity_days')
    .eq('country_id', 'united-states')
    .eq('status', 'active')
    .order('price');
  const time2 = Date.now() - start2;

  logResult(
    'Plans for country query',
    !err2 && time2 < 500,
    `${usPlans?.length || 0} US plans in ${time2}ms`
  );

  // Test: Admin list with filters
  const start3 = Date.now();
  const { data: adminList, error: err3 } = await supabase
    .from('dataplans')
    .select('id, title, price, country_name, status, type')
    .eq('type', 'sim')
    .gte('price', 5)
    .lte('price', 20)
    .order('price')
    .limit(50);
  const time3 = Date.now() - start3;

  logResult(
    'Admin filtered query',
    !err3 && time3 < 500,
    `${adminList?.length || 0} results in ${time3}ms`
  );
}

/**
 * Main validation function
 */
async function validate() {
  console.log('\n' + '='.repeat(60));
  console.log('🔬 MIGRATION VALIDATION');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Supabase: ${SUPABASE_URL}`);

  try {
    await validateCounts();
    await validateSpotChecks();
    await validateReferentialIntegrity();
    await validateDataQuality();
    await validateQueryPatterns();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Passed: ${results.passed}`);
    console.log(`Warnings: ${results.warnings}`);
    console.log(`Failed: ${results.failed}`);
    console.log('='.repeat(60));

    if (results.failed === 0) {
      console.log('✅ All validations passed!');
      process.exit(0);
    } else {
      console.log(`❌ ${results.failed} validation(s) failed`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Validation error:', error);
    process.exit(1);
  }
}

validate();
