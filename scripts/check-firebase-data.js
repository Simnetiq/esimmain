#!/usr/bin/env node

/**
 * Check what's actually in Firebase
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkData() {
  console.log('🔍 Checking Firebase data...\n');
  
  // Check countries
  console.log('📍 COUNTRIES:');
  const countriesSnap = await db.collection('countries').limit(5).get();
  countriesSnap.forEach(doc => {
    const data = doc.data();
    console.log(`  - ${doc.id}: ${data.name} (planCount: ${data.planCount || 0})`);
  });
  
  // Check dataplans
  console.log('\n📦 DATAPLANS (sample):');
  const plansSnap = await db.collection('dataplans').limit(5).get();
  plansSnap.forEach(doc => {
    const data = doc.data();
    console.log(`  - ${doc.id}`);
    console.log(`    Country: ${data.country_region}`);
    console.log(`    Code: ${data.country_code}`);
    console.log(`    Codes array: ${JSON.stringify(data.country_codes)}`);
    console.log(`    Price: $${data.price}`);
    console.log('');
  });
  
  // Check specific country
  console.log('🔍 Checking "united-states" plans:');
  const usPlansSnap = await db.collection('dataplans')
    .where('country_codes', 'array-contains', 'united-states')
    .limit(3)
    .get();
  console.log(`  Found: ${usPlansSnap.size} plans`);
  usPlansSnap.forEach(doc => {
    const data = doc.data();
    console.log(`  - ${data.title} - $${data.price}`);
  });
  
  // Check regional plans
  console.log('\n🌍 Checking regional plans:');
  const regionalSnap = await db.collection('dataplans')
    .where('is_regional', '==', true)
    .limit(5)
    .get();
  console.log(`  Found: ${regionalSnap.size} regional plans`);
  regionalSnap.forEach(doc => {
    const data = doc.data();
    console.log(`  - ${data.title} - $${data.price} (${data.country_region})`);
  });
  
  process.exit(0);
}

checkData().catch(console.error);














