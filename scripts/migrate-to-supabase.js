#!/usr/bin/env node

/**
 * Firebase → Supabase Migration Script
 *
 * Migrates countries and dataplans from Firebase to Supabase.
 * This is a duplication-only migration - Firebase remains the source of truth.
 *
 * Usage:
 *   node scripts/migrate-to-supabase.js              # Full migration
 *   node scripts/migrate-to-supabase.js --dry-run    # Preview without writing
 *   node scripts/migrate-to-supabase.js --countries  # Countries only
 *   node scripts/migrate-to-supabase.js --dataplans  # Dataplans only
 *
 * Environment Variables:
 *   SUPABASE_URL         - Supabase project URL
 *   SUPABASE_SERVICE_KEY - Supabase service role key
 */

const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const COUNTRIES_ONLY = args.includes('--countries');
const DATAPLANS_ONLY = args.includes('--dataplans');

// Configuration
const BATCH_SIZE = 100;
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

// Statistics tracking
const stats = {
  countries: { total: 0, success: 0, errors: [], skipped: 0 },
  dataplans: { total: 0, success: 0, errors: [], skipped: 0 }
};

/**
 * Transform Firebase country document to Supabase row format
 */
function transformCountry(doc, regionMap) {
  const data = doc.data();
  const docId = doc.id;

  // Determine is_active from multiple possible fields
  let isActive = true;
  if (data.status !== undefined) {
    isActive = data.status === 'active';
  } else if (data.isActive !== undefined) {
    isActive = data.isActive === true;
  } else if (data.enabled !== undefined) {
    isActive = data.enabled === true;
  }

  // Determine is_hidden (inverse of visible)
  const isHidden = data.visible === false;

  // Map region slug to region_id
  const regionSlug = data.region?.toLowerCase?.() || null;
  const regionId = regionSlug ? (regionMap[regionSlug] || null) : null;

  // Coalesce image fields
  const imageUrl = data.photo || data.image || null;

  // Convert Firebase Timestamp to ISO string
  const firebaseUpdatedAt = data.updated_at?.toDate?.()?.toISOString?.() || null;

  return {
    id: docId,
    slug: data.slug || docId,
    name: data.name || data.title || docId,
    title: data.title || data.name || docId,
    region_id: regionId,
    is_active: isActive,
    is_popular: data.is_popular === true,
    is_hidden: isHidden,
    is_regional: data.is_regional === true,
    translations: data.translations || {},
    image_url: imageUrl,
    description: data.description || null,
    plan_count: parseInt(data.planCount) || 0,
    min_price: data.minPrice ? parseFloat(data.minPrice) : null,
    provider: data.provider || 'airalo',
    firebase_updated_at: firebaseUpdatedAt,
    synced_at: new Date().toISOString()
  };
}

/**
 * Transform Firebase dataplan document to Supabase row format
 */
function transformDataplan(doc, validCountryIds) {
  const data = doc.data();
  const docId = doc.id;

  // Extract voice and SMS values
  const voice = parseInt(data.voice || data.voice_minutes) || 0;
  const sms = parseInt(data.sms) || 0;

  // Get country_id and validate FK
  const countryId = data.country_code || null;

  // Skip if country doesn't exist in Supabase (FK constraint would fail)
  // But only if country_id is specified
  if (countryId && validCountryIds && !validCountryIds.has(countryId)) {
    return null; // Will be filtered out
  }

  // Parse numeric fields safely
  const price = parseFloat(data.price) || 0;
  const netPrice = data.net_price ? parseFloat(data.net_price) : null;
  const originalPrice = data.original_price ? parseFloat(data.original_price) : null;
  const dataAmountMb = parseInt(data.data_amount_mb || data.capacity) || 0;
  const validityDays = parseInt(data.validity || data.day || data.period) || 30;

  // Stringify policy objects if they're objects
  let activationPolicy = null;
  if (data.activation_policy) {
    activationPolicy = typeof data.activation_policy === 'string'
      ? data.activation_policy
      : JSON.stringify(data.activation_policy);
  }

  let fairUsagePolicy = null;
  if (data.fair_usage_policy) {
    fairUsagePolicy = typeof data.fair_usage_policy === 'string'
      ? data.fair_usage_policy
      : JSON.stringify(data.fair_usage_policy);
  }

  // Convert Firebase Timestamp to ISO string
  const firebaseUpdatedAt = data.updated_at?.toDate?.()?.toISOString?.() || null;

  // Validate type field
  const type = ['sim', 'topup'].includes(data.type) ? data.type : 'sim';

  return {
    id: docId,
    name: data.name || data.title || docId,
    title: data.title || data.name || docId,
    type: type,
    status: data.status || 'active',
    enabled: data.enabled !== false,
    provider: data.provider || 'airalo',
    price: price,
    net_price: netPrice,
    original_price: originalPrice,
    currency: data.currency || 'USD',
    data_amount_mb: dataAmountMb,
    data_display: data.data || null,
    is_unlimited: data.is_unlimited === true,
    validity_days: validityDays,
    is_regional: data.is_regional === true,
    has_voice: voice > 0,
    voice_minutes: voice,
    has_sms: sms > 0,
    sms_count: sms,
    operator_name: data.operator || null,
    country_id: countryId,
    country_code: countryId,
    country_name: data.country_region || null,
    covered_countries: Array.isArray(data.country_codes) ? data.country_codes : [],
    activation_policy: activationPolicy,
    fair_usage_policy: fairUsagePolicy,
    firebase_updated_at: firebaseUpdatedAt,
    synced_at: new Date().toISOString()
  };
}

/**
 * Load region mapping from Supabase
 */
async function loadRegionMap() {
  const { data: regions, error } = await supabase
    .from('regions')
    .select('id, name');

  if (error) {
    console.error('⚠️  Could not load regions:', error.message);
    return {};
  }

  const regionMap = {};
  for (const r of regions || []) {
    regionMap[r.id] = r.id;
    if (r.name) {
      regionMap[r.name.toLowerCase()] = r.id;
    }
  }

  console.log(`📍 Loaded ${regions?.length || 0} regions from Supabase`);
  return regionMap;
}

/**
 * Get set of valid country IDs from Supabase
 */
async function getValidCountryIds() {
  const { data: countries, error } = await supabase
    .from('countries')
    .select('id');

  if (error) {
    console.error('⚠️  Could not load countries:', error.message);
    return new Set();
  }

  return new Set((countries || []).map(c => c.id));
}

/**
 * Migrate countries from Firebase to Supabase
 */
async function migrateCountries(regionMap) {
  console.log('\n' + '='.repeat(60));
  console.log('📍 MIGRATING COUNTRIES');
  console.log('='.repeat(60));

  // Read all countries from Firebase
  console.log('Reading countries from Firebase...');
  const countriesSnap = await db.collection('countries').get();
  stats.countries.total = countriesSnap.size;
  console.log(`Found ${stats.countries.total} countries in Firebase`);

  // Transform all documents
  const countries = countriesSnap.docs.map(doc => transformCountry(doc, regionMap));

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN - Sample transformed countries:');
    countries.slice(0, 3).forEach(c => {
      console.log(`  ${c.id}: ${c.name} (active: ${c.is_active}, popular: ${c.is_popular})`);
    });
    stats.countries.success = stats.countries.total;
    return;
  }

  // Upsert in batches
  console.log(`\nWriting to Supabase in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < countries.length; i += BATCH_SIZE) {
    const batch = countries.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('countries')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      stats.countries.errors.push(...batch.map(c => c.id));
    } else {
      stats.countries.success += batch.length;
      const progress = Math.min(i + BATCH_SIZE, countries.length);
      console.log(`  ✓ Countries: ${progress}/${countries.length}`);
    }
  }
}

/**
 * Migrate dataplans from Firebase to Supabase
 */
async function migrateDataplans() {
  console.log('\n' + '='.repeat(60));
  console.log('📦 MIGRATING DATAPLANS');
  console.log('='.repeat(60));

  // Get valid country IDs to check FK constraints
  console.log('Loading valid country IDs from Supabase...');
  const validCountryIds = await getValidCountryIds();
  console.log(`Found ${validCountryIds.size} countries in Supabase`);

  // Read all dataplans from Firebase
  console.log('Reading dataplans from Firebase...');
  const plansSnap = await db.collection('dataplans').get();
  stats.dataplans.total = plansSnap.size;
  console.log(`Found ${stats.dataplans.total} dataplans in Firebase`);

  // Transform all documents, filtering out invalid FK references
  const plans = plansSnap.docs
    .map(doc => transformDataplan(doc, validCountryIds))
    .filter(plan => plan !== null);

  stats.dataplans.skipped = stats.dataplans.total - plans.length;
  if (stats.dataplans.skipped > 0) {
    console.log(`⚠️  Skipping ${stats.dataplans.skipped} plans with invalid country_id`);
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN - Sample transformed dataplans:');
    plans.slice(0, 3).forEach(p => {
      console.log(`  ${p.id}: ${p.title} - $${p.price} (${p.data_display})`);
    });
    stats.dataplans.success = plans.length;
    return;
  }

  // Upsert in batches
  console.log(`\nWriting to Supabase in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < plans.length; i += BATCH_SIZE) {
    const batch = plans.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('dataplans')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      // Try individual inserts to identify problematic records
      for (const plan of batch) {
        const { error: singleError } = await supabase
          .from('dataplans')
          .upsert(plan, { onConflict: 'id' });

        if (singleError) {
          stats.dataplans.errors.push(plan.id);
        } else {
          stats.dataplans.success++;
        }
      }
    } else {
      stats.dataplans.success += batch.length;
      const progress = Math.min(i + BATCH_SIZE, plans.length);
      console.log(`  ✓ Dataplans: ${progress}/${plans.length}`);
    }
  }
}

/**
 * Print migration summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No data was written\n');
  }

  console.log('Countries:');
  console.log(`  Total in Firebase: ${stats.countries.total}`);
  console.log(`  Successfully migrated: ${stats.countries.success}`);
  console.log(`  Errors: ${stats.countries.errors.length}`);
  if (stats.countries.errors.length > 0) {
    console.log(`  Failed IDs: ${stats.countries.errors.slice(0, 10).join(', ')}${stats.countries.errors.length > 10 ? '...' : ''}`);
  }

  console.log('\nDataplans:');
  console.log(`  Total in Firebase: ${stats.dataplans.total}`);
  console.log(`  Skipped (invalid FK): ${stats.dataplans.skipped}`);
  console.log(`  Successfully migrated: ${stats.dataplans.success}`);
  console.log(`  Errors: ${stats.dataplans.errors.length}`);
  if (stats.dataplans.errors.length > 0) {
    console.log(`  Failed IDs: ${stats.dataplans.errors.slice(0, 10).join(', ')}${stats.dataplans.errors.length > 10 ? '...' : ''}`);
  }

  console.log('\n' + '='.repeat(60));

  const totalErrors = stats.countries.errors.length + stats.dataplans.errors.length;
  if (totalErrors === 0) {
    console.log('✅ Migration completed successfully!');
  } else {
    console.log(`⚠️  Migration completed with ${totalErrors} errors`);
  }

  console.log('='.repeat(60) + '\n');
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 FIREBASE → SUPABASE MIGRATION');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'PRODUCTION'}`);
  console.log(`Scope: ${COUNTRIES_ONLY ? 'Countries only' : DATAPLANS_ONLY ? 'Dataplans only' : 'Full migration'}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    // Load region mapping
    const regionMap = await loadRegionMap();

    // Migrate countries (unless dataplans-only)
    if (!DATAPLANS_ONLY) {
      await migrateCountries(regionMap);
    }

    // Migrate dataplans (unless countries-only)
    if (!COUNTRIES_ONLY) {
      await migrateDataplans();
    }

    // Print summary
    printSummary();

    // Exit with appropriate code
    const hasErrors = stats.countries.errors.length > 0 || stats.dataplans.errors.length > 0;
    process.exit(hasErrors ? 1 : 0);

  } catch (error) {
    console.error('\n💥 Migration failed with error:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
