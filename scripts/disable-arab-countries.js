/**
 * Script to disable specific Arab countries from the system
 * 
 * KEEPS: UAE (AE), Egypt (EG), Qatar (QA)
 * DISABLES: Saudi Arabia (SA), Oman (OM), Kuwait (KW), Bahrain (BH), 
 *           Jordan (JO), Lebanon (LB), Iraq (IQ), Syria (SY), Yemen (YE),
 *           Libya (LY), Tunisia (TN), Algeria (DZ), Morocco (MA), Sudan (SD),
 *           Palestine (PS), Mauritania (MR)
 * 
 * Run with: node scripts/disable-arab-countries.js
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

// Countries to KEEP (allowed)
const ALLOWED_COUNTRIES = ['AE', 'EG', 'QA']; // UAE, Egypt, Qatar

// Arab countries to DISABLE
const DISABLED_COUNTRIES = [
  'SA',  // Saudi Arabia
  'OM',  // Oman
  'KW',  // Kuwait
  'BH',  // Bahrain
  'JO',  // Jordan
  'LB',  // Lebanon
  'IQ',  // Iraq
  'SY',  // Syria
  'YE',  // Yemen
  'LY',  // Libya
  'TN',  // Tunisia
  'DZ',  // Algeria
  'MA',  // Morocco
  'SD',  // Sudan
  'PS',  // Palestine
  'MR',  // Mauritania
];

// Country names for logging
const COUNTRY_NAMES = {
  'SA': 'Saudi Arabia',
  'OM': 'Oman',
  'KW': 'Kuwait',
  'BH': 'Bahrain',
  'JO': 'Jordan',
  'LB': 'Lebanon',
  'IQ': 'Iraq',
  'SY': 'Syria',
  'YE': 'Yemen',
  'LY': 'Libya',
  'TN': 'Tunisia',
  'DZ': 'Algeria',
  'MA': 'Morocco',
  'SD': 'Sudan',
  'PS': 'Palestine',
  'MR': 'Mauritania',
};

async function disableArabCountries() {
  console.log('🚫 DISABLING ARAB COUNTRIES (except UAE, Egypt, Qatar)');
  console.log('');
  console.log('Countries to disable:', DISABLED_COUNTRIES.map(c => `${c} (${COUNTRY_NAMES[c]})`).join(', '));
  console.log('');

  let disabledPlansCount = 0;
  let disabledCountriesCount = 0;

  try {
    // 1. Disable all dataplans for these countries
    console.log('📦 Disabling data plans...');
    
    for (const countryCode of DISABLED_COUNTRIES) {
      // Query plans by country_code field
      const plansByCodeQuery = await db.collection('dataplans')
        .where('country_code', '==', countryCode)
        .get();
      
      // Query plans by country_codes array
      const plansByCodesQuery = await db.collection('dataplans')
        .where('country_codes', 'array-contains', countryCode.toLowerCase())
        .get();
      
      // Also check for country slug (e.g., "saudi-arabia")
      const countrySlug = COUNTRY_NAMES[countryCode]?.toLowerCase().replace(/\s+/g, '-');
      let plansBySlugQuery = { docs: [] };
      if (countrySlug) {
        plansBySlugQuery = await db.collection('dataplans')
          .where('country_codes', 'array-contains', countrySlug)
          .get();
      }
      
      // Combine all results
      const allPlans = new Map();
      [...plansByCodeQuery.docs, ...plansByCodesQuery.docs, ...plansBySlugQuery.docs].forEach(doc => {
        allPlans.set(doc.id, doc);
      });
      
      if (allPlans.size > 0) {
        console.log(`  - ${COUNTRY_NAMES[countryCode]} (${countryCode}): ${allPlans.size} plans found`);
        
        for (const [planId, planDoc] of allPlans) {
          await db.collection('dataplans').doc(planId).update({
            enabled: false,
            status: 'disabled',
            disabledAt: admin.firestore.FieldValue.serverTimestamp(),
            disabledReason: 'Country disabled by admin',
            _previousStatus: planDoc.data().status || 'active'
          });
          disabledPlansCount++;
        }
      }
    }
    
    console.log(`✅ Disabled ${disabledPlansCount} data plans`);
    console.log('');

    // 2. Disable countries in the countries collection
    console.log('🌍 Disabling countries...');
    
    for (const countryCode of DISABLED_COUNTRIES) {
      // Try both uppercase and lowercase
      for (const code of [countryCode, countryCode.toLowerCase()]) {
        const countryRef = db.collection('countries').doc(code);
        const countryDoc = await countryRef.get();
        
        if (countryDoc.exists) {
          await countryRef.update({
            enabled: false,
            visible: false,
            disabledAt: admin.firestore.FieldValue.serverTimestamp(),
            disabledReason: 'Country disabled by admin'
          });
          console.log(`  - Disabled: ${COUNTRY_NAMES[countryCode]} (${code})`);
          disabledCountriesCount++;
        }
      }
    }
    
    console.log(`✅ Disabled ${disabledCountriesCount} countries`);
    console.log('');

    // 3. Log the action
    await db.collection('admin_logs').add({
      action: 'disable_countries',
      countriesDisabled: DISABLED_COUNTRIES,
      plansDisabled: disabledPlansCount,
      reason: 'Admin request - remove Arab countries except UAE, Egypt, Qatar',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      performedBy: 'disable-arab-countries.js script'
    });

    console.log('📋 SUMMARY:');
    console.log(`   - Data plans disabled: ${disabledPlansCount}`);
    console.log(`   - Countries disabled: ${disabledCountriesCount}`);
    console.log('');
    console.log('✅ DONE! Arab countries (except UAE, Egypt, Qatar) are now disabled.');
    console.log('');
    console.log('⚠️  NOTE: Users will no longer see these countries or their plans.');
    console.log('   To re-enable, set enabled=true and status="active" in Firebase.');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

disableArabCountries();

