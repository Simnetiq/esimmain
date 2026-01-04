#!/usr/bin/env node

/**
 * Analyze Firebase Data for Migration Planning
 *
 * This script reads all dataplans and countries from Firebase
 * and provides analysis on:
 * - Region types that exist
 * - Regional plans and their covered countries
 * - Data structure variations
 *
 * Usage: node scripts/analyze-firebase-data.js
 */

const admin = require('firebase-admin');
const path = require('path');

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

async function analyze() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 FIREBASE DATA ANALYSIS');
  console.log('='.repeat(70) + '\n');

  // ============================================================
  // 1. DATAPLANS ANALYSIS
  // ============================================================
  console.log('📦 DATAPLANS ANALYSIS');
  console.log('-'.repeat(50));

  const plansSnap = await db.collection('dataplans').get();
  const plans = plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  console.log(`Total dataplans: ${plans.length}\n`);

  // Analyze region types
  const regionTypes = new Map();
  const isRegionalCounts = { true: 0, false: 0 };
  const countryCodes = new Set();
  const regionalPlans = [];

  for (const plan of plans) {
    // Track is_regional
    if (plan.is_regional) {
      isRegionalCounts.true++;
      regionalPlans.push(plan);
    } else {
      isRegionalCounts.false++;
    }

    // Track region_type values
    const regionType = plan.region_type || plan.region || 'none';
    if (!regionTypes.has(regionType)) {
      regionTypes.set(regionType, { count: 0, samples: [] });
    }
    regionTypes.get(regionType).count++;
    if (regionTypes.get(regionType).samples.length < 2) {
      regionTypes.get(regionType).samples.push(plan.id);
    }

    // Track country_codes
    if (plan.country_code) {
      countryCodes.add(plan.country_code);
    }
  }

  console.log('📍 is_regional distribution:');
  console.log(`   Regional plans (is_regional=true): ${isRegionalCounts.true}`);
  console.log(`   Country plans (is_regional=false): ${isRegionalCounts.false}`);

  console.log('\n📍 region_type values found:');
  const sortedRegionTypes = [...regionTypes.entries()].sort((a, b) => b[1].count - a[1].count);
  for (const [type, data] of sortedRegionTypes) {
    console.log(`   "${type}": ${data.count} plans (e.g., ${data.samples.join(', ')})`);
  }

  console.log(`\n📍 Unique country_code values: ${countryCodes.size}`);

  // ============================================================
  // 2. REGIONAL PLANS DETAIL
  // ============================================================
  console.log('\n\n🌍 REGIONAL PLANS DETAIL');
  console.log('-'.repeat(50));

  // Group regional plans by region_type or country_region
  const regionalGroups = new Map();

  for (const plan of regionalPlans) {
    const groupKey = plan.region_type || plan.country_region || 'Unknown';
    if (!regionalGroups.has(groupKey)) {
      regionalGroups.set(groupKey, {
        plans: [],
        coveredCountries: new Set()
      });
    }

    const group = regionalGroups.get(groupKey);
    group.plans.push(plan);

    // Collect covered countries
    if (Array.isArray(plan.country_codes)) {
      plan.country_codes.forEach(c => group.coveredCountries.add(c));
    }
  }

  console.log(`\nRegional groups found: ${regionalGroups.size}\n`);

  for (const [groupName, data] of [...regionalGroups.entries()].sort()) {
    console.log(`\n📍 ${groupName.toUpperCase()}`);
    console.log(`   Plans: ${data.plans.length}`);
    console.log(`   Price range: $${Math.min(...data.plans.map(p => p.price || 0)).toFixed(2)} - $${Math.max(...data.plans.map(p => p.price || 0)).toFixed(2)}`);

    if (data.coveredCountries.size > 0) {
      const countries = [...data.coveredCountries].sort();
      if (countries.length <= 10) {
        console.log(`   Countries (${countries.length}): ${countries.join(', ')}`);
      } else {
        console.log(`   Countries (${countries.length}): ${countries.slice(0, 10).join(', ')}...`);
      }
    }

    // Show sample plan
    const sample = data.plans[0];
    console.log(`   Sample plan: ${sample.id}`);
    console.log(`      - title: ${sample.title}`);
    console.log(`      - data: ${sample.data || sample.data_amount_mb + 'MB'}`);
    console.log(`      - validity: ${sample.validity} days`);
  }

  // ============================================================
  // 3. COUNTRIES ANALYSIS
  // ============================================================
  console.log('\n\n🌐 COUNTRIES COLLECTION ANALYSIS');
  console.log('-'.repeat(50));

  const countriesSnap = await db.collection('countries').get();
  const countries = countriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  console.log(`Total countries: ${countries.length}\n`);

  // Find which are regional vs country
  const countryTypes = { regional: [], country: [] };
  const countryRegions = new Map();

  for (const country of countries) {
    if (country.is_regional) {
      countryTypes.regional.push(country);
    } else {
      countryTypes.country.push(country);
    }

    // Track region values
    const region = country.region || 'none';
    if (!countryRegions.has(region)) {
      countryRegions.set(region, []);
    }
    countryRegions.get(region).push(country.id);
  }

  console.log(`Country entries: ${countryTypes.country.length}`);
  console.log(`Regional entries: ${countryTypes.regional.length}`);

  console.log('\n📍 Region distribution in countries collection:');
  for (const [region, ids] of [...countryRegions.entries()].sort()) {
    console.log(`   "${region}": ${ids.length} entries`);
  }

  // List regional entries
  if (countryTypes.regional.length > 0) {
    console.log('\n📍 Regional entries in countries collection:');
    for (const r of countryTypes.regional) {
      console.log(`   - ${r.id}: ${r.name} (planCount: ${r.planCount || 0})`);
    }
  }

  // ============================================================
  // 4. RECOMMENDED REGIONS FOR SUPABASE
  // ============================================================
  console.log('\n\n✅ RECOMMENDED REGIONS FOR SUPABASE');
  console.log('-'.repeat(50));

  // Based on analysis, identify unique regions
  const recommendedRegions = new Set();

  // From regional plans
  for (const [groupName] of regionalGroups) {
    recommendedRegions.add(groupName.toLowerCase().replace(/\s+/g, '-'));
  }

  // Standard continent regions
  ['asia', 'europe', 'africa', 'oceania', 'north-america', 'south-america', 'caribbean', 'middle-east', 'global'].forEach(r => {
    recommendedRegions.add(r);
  });

  console.log('\nRecommended regions table entries:');
  for (const region of [...recommendedRegions].sort()) {
    console.log(`   - ${region}`);
  }

  // ============================================================
  // 5. SAMPLE DATA STRUCTURES
  // ============================================================
  console.log('\n\n📋 SAMPLE DATA STRUCTURES');
  console.log('-'.repeat(50));

  // Sample country-specific plan
  const sampleCountryPlan = plans.find(p => !p.is_regional);
  if (sampleCountryPlan) {
    console.log('\nSample Country Plan:');
    console.log(JSON.stringify({
      id: sampleCountryPlan.id,
      title: sampleCountryPlan.title,
      country_code: sampleCountryPlan.country_code,
      country_region: sampleCountryPlan.country_region,
      is_regional: sampleCountryPlan.is_regional,
      region: sampleCountryPlan.region,
      region_type: sampleCountryPlan.region_type,
      country_codes: sampleCountryPlan.country_codes,
      price: sampleCountryPlan.price,
      data: sampleCountryPlan.data,
      data_amount_mb: sampleCountryPlan.data_amount_mb,
      validity: sampleCountryPlan.validity
    }, null, 2));
  }

  // Sample regional plan
  const sampleRegionalPlan = plans.find(p => p.is_regional && p.country_codes?.length > 5);
  if (sampleRegionalPlan) {
    console.log('\nSample Regional Plan:');
    console.log(JSON.stringify({
      id: sampleRegionalPlan.id,
      title: sampleRegionalPlan.title,
      country_code: sampleRegionalPlan.country_code,
      country_region: sampleRegionalPlan.country_region,
      is_regional: sampleRegionalPlan.is_regional,
      region: sampleRegionalPlan.region,
      region_type: sampleRegionalPlan.region_type,
      country_codes: sampleRegionalPlan.country_codes?.slice(0, 10),
      country_codes_count: sampleRegionalPlan.country_codes?.length,
      price: sampleRegionalPlan.price,
      data: sampleRegionalPlan.data,
      data_amount_mb: sampleRegionalPlan.data_amount_mb,
      validity: sampleRegionalPlan.validity
    }, null, 2));
  }

  // Sample country
  const sampleCountry = countries.find(c => !c.is_regional && c.planCount > 0);
  if (sampleCountry) {
    console.log('\nSample Country:');
    console.log(JSON.stringify({
      id: sampleCountry.id,
      name: sampleCountry.name,
      code: sampleCountry.code,
      slug: sampleCountry.slug,
      region: sampleCountry.region,
      is_regional: sampleCountry.is_regional,
      is_popular: sampleCountry.is_popular,
      status: sampleCountry.status,
      planCount: sampleCountry.planCount,
      minPrice: sampleCountry.minPrice,
      translations: sampleCountry.translations ? Object.keys(sampleCountry.translations) : []
    }, null, 2));
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ ANALYSIS COMPLETE');
  console.log('='.repeat(70) + '\n');

  process.exit(0);
}

analyze().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
