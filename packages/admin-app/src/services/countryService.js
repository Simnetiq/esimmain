import supabase from '../lib/supabase';
import { toCountryViewModel, determineEntityTags } from '../adapters/countryAdapter';

/**
 * Country Service - Supabase CRUD operations for countries
 */

// ============================================================================
// HELPERS
// ============================================================================

function ensureSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase client not initialized. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.'
    );
  }
  return supabase;
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Fetch all countries with optional translations
 * Also calculates plan counts dynamically using the same query logic as the modal
 * @param {string} languageCode - Language for translations (default: 'en')
 * @returns {Promise<Array>} Countries with translations as view models
 */
export async function fetchCountries(languageCode = 'en') {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('countries')
    .select(`
      *,
      country_translations!left (
        language_code,
        name,
        description
      )
    `)
    .order('name', { ascending: true });

  if (error) throw error;

  // Filter to valid countries
  const validCountries = (data || []).filter(country => {
    const isoCode = country.iso_code || '';
    const isValidCountry = isoCode.length === 2 && /^[A-Z]{2}$/i.test(isoCode);
    const isRegional = country.is_regional === true;
    return isValidCountry || isRegional;
  });

  // Fetch plan counts for all countries in parallel batches
  // This uses the same .or() query logic that works in the modal
  const batchSize = 20;
  const planCounts = {};

  for (let i = 0; i < validCountries.length; i += batchSize) {
    const batch = validCountries.slice(i, i + batchSize);

    await Promise.all(batch.map(async (country) => {
      const countryId = country.id;
      const isoCode = country.iso_code?.toUpperCase() || countryId.toUpperCase();

      try {
        const { data: plans, error: plansError } = await client
          .from('dataplans')
          .select('id, price')
          .or(`country_id.eq.${countryId},country_iso.eq.${isoCode}`)
          .eq('status', 'active')
          .eq('is_enabled', true);

        if (!plansError && plans) {
          const prices = plans.map(p => parseFloat(p.price)).filter(p => p > 0);
          planCounts[countryId] = {
            count: plans.length,
            minPrice: prices.length > 0 ? Math.min(...prices) : null
          };
        }
      } catch (err) {
        console.warn(`Failed to get plan count for ${countryId}:`, err);
      }
    }));
  }

  // Transform and include dynamic plan counts
  return validCountries.map(country => {
    // Override stored plan_count with dynamic count
    const dynamicStats = planCounts[country.id];
    if (dynamicStats) {
      country.plan_count = dynamicStats.count;
      country.min_price = dynamicStats.minPrice;
    }

    // Use the adapter to transform to view model
    const viewModel = toCountryViewModel(country);

    // Add tags based on country data
    viewModel.tags = determineEntityTags(country);

    return viewModel;
  });
}

/**
 * Fetch a single country by ID
 * @param {string} countryId - Country ID or ISO code
 * @returns {Promise<Object>} Country data
 */
export async function fetchCountryById(countryId) {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('countries')
    .select(`
      *,
      country_translations (
        language_code,
        name,
        description
      )
    `)
    .eq('id', countryId)
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Save country with all related data to Supabase (complete upsert)
 * Used by CountryEditModal to save/create countries
 * @param {Object} countryData - Country form data
 * @param {string} userId - User performing the action
 * @returns {Promise<Object>} Saved country
 */
export async function saveCountryComplete(countryData, userId) {
  const client = ensureSupabase();
  const countryId = (countryData.code || countryData.id).toLowerCase();
  const isoCode = (countryData.code || countryData.id).toUpperCase();

  // 1. Upsert country record
  const countryRecord = {
    id: countryId,
    name: countryData.name?.trim(),
    iso_code: isoCode,
    image_url: countryData.photo || countryData.image_url || null,
    is_active: countryData.isActive !== false,
    is_popular: countryData.is_popular === true,
    is_regional: countryData.is_regional === true,
    updated_at: new Date().toISOString()
  };

  // Add continent/region if provided
  if (countryData.region && countryData.region !== 'other') {
    countryRecord.continent = countryData.region;
  }

  const { data: country, error: countryError } = await client
    .from('countries')
    .upsert(countryRecord, { onConflict: 'id' })
    .select()
    .single();

  if (countryError) throw countryError;

  // 2. Upsert translations
  if (countryData.translations && typeof countryData.translations === 'object') {
    const translationRows = Object.entries(countryData.translations)
      .filter(([_, value]) => value && value.trim())
      .map(([langCode, name]) => ({
        country_id: countryId,
        language_code: langCode,
        name: name.trim(),
        source: 'manual',
        is_verified: false,
        last_updated_at: new Date().toISOString()
      }));

    if (translationRows.length > 0) {
      // Delete existing translations and insert new ones
      // This ensures we don't have orphaned translations
      const { error: deleteError } = await client
        .from('country_translations')
        .delete()
        .eq('country_id', countryId);

      if (deleteError) {
        console.warn('Error clearing old translations:', deleteError);
      }

      const { error: transError } = await client
        .from('country_translations')
        .insert(translationRows);

      if (transError) {
        console.warn('Error inserting translations:', transError);
        // Don't throw - country was saved successfully
      }
    }
  }

  return country;
}

/**
 * Update a country
 * @param {string} countryId - Country ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated country
 */
export async function updateCountry(countryId, updates) {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('countries')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', countryId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create or update a country (upsert)
 * @param {Object} country - Country data
 * @returns {Promise<Object>} Upserted country
 */
export async function upsertCountry(country) {
  const countryData = {
    id: country.id || country.code?.toLowerCase(),
    name: country.name,
    iso_code: country.code?.toUpperCase(),
    slug: country.slug || country.code?.toLowerCase(),
    image_url: country.image?.url || country.image_url,
    is_active: country.isActive !== false && country.isHidden !== true,
    updated_at: new Date().toISOString()
  };

  const client = ensureSupabase();
  const { data, error } = await client
    .from('countries')
    .upsert(countryData, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a country
 * @param {string} countryId - Country ID
 * @returns {Promise<void>}
 */
export async function deleteCountry(countryId) {
  const client = ensureSupabase();
  const { error } = await client
    .from('countries')
    .delete()
    .eq('id', countryId);

  if (error) throw error;
}

/**
 * Toggle country visibility (is_active)
 * @param {string} countryId - Country ID
 * @param {boolean} isActive - New visibility state
 * @returns {Promise<Object>} Updated country
 */
export async function toggleCountryVisibility(countryId, isActive) {
  return updateCountry(countryId, { is_active: isActive });
}

// ============================================================================
// TRANSLATION OPERATIONS
// ============================================================================

/**
 * Update translations for a country
 * @param {string} countryId - Country ID
 * @param {Object} translations - Object with language codes as keys
 * @returns {Promise<void>}
 */
export async function updateCountryTranslations(countryId, translations) {
  const translationRows = Object.entries(translations).map(([langCode, name]) => ({
    country_id: countryId,
    language_code: langCode,
    name: name,
    source: 'manual',
    last_updated_at: new Date().toISOString()
  }));

  const client = ensureSupabase();
  const { error } = await client
    .from('country_translations')
    .upsert(translationRows, { onConflict: 'country_id,language_code' });

  if (error) throw error;
}

/**
 * Fetch all translations for a country
 * @param {string} countryId - Country ID
 * @returns {Promise<Object>} Translations keyed by language code
 */
export async function fetchCountryTranslations(countryId) {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('country_translations')
    .select('language_code, name, description, source, is_verified')
    .eq('country_id', countryId);

  if (error) throw error;

  const translations = {};
  data.forEach(t => {
    translations[t.language_code] = t.name;
  });
  return translations;
}

// ============================================================================
// STATS OPERATIONS
// ============================================================================

/**
 * Recalculate stats for a country from dataplans
 * Uses .or() to match both country_id (lowercase ISO) and country_iso (uppercase ISO)
 * @param {string} countryId - Country ID (lowercase ISO like "by")
 * @returns {Promise<Object>} Updated stats
 */
export async function recalculateCountryStats(countryId) {
  const client = ensureSupabase();

  // First verify the country exists and get its ISO code
  const { data: countryRecord, error: checkError } = await client
    .from('countries')
    .select('id, iso_code')
    .eq('id', countryId)
    .maybeSingle();

  if (checkError) throw checkError;
  if (!countryRecord) {
    throw new Error(`Country with ID "${countryId}" not found in database`);
  }

  const normalizedId = countryRecord.id; // lowercase like "by"
  const isoCode = countryRecord.iso_code?.toUpperCase() || normalizedId.toUpperCase(); // uppercase like "BY"

  // Get plans for this country using .or() to match both fields
  const { data: plans, error: plansError } = await client
    .from('dataplans')
    .select('id, price')
    .or(`country_id.eq.${normalizedId},country_iso.eq.${isoCode}`)
    .eq('status', 'active')
    .eq('is_enabled', true);

  if (plansError) throw plansError;

  const planCount = plans?.length || 0;
  const prices = plans?.map(p => parseFloat(p.price)).filter(p => p > 0) || [];
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;

  // Update country stats (don't use .single() to avoid errors)
  const { data, error } = await client
    .from('countries')
    .update({
      plan_count: planCount,
      min_price: minPrice,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', countryId)
    .select();

  if (error) throw error;

  const country = data?.[0] || null;
  return { planCount, minPrice, country };
}

/**
 * Recalculate stats for all countries
 * Uses per-country queries with .or() to match plans correctly
 * (matching the same logic that works in fetchCountryPlansWithRegional)
 * @returns {Promise<Object>} Summary of updates
 */
export async function recalculateAllCountryStats() {
  const client = ensureSupabase();

  // First, fetch all countries
  const { data: allCountries, error: countriesError } = await client
    .from('countries')
    .select('id, iso_code');

  if (countriesError) throw countriesError;

  const countries = allCountries || [];
  console.log(`Found ${countries.length} countries in database`);

  if (countries.length === 0) {
    return { updated: 0, totalPlans: 0 };
  }

  let updated = 0;
  let totalPlans = 0;
  let updateErrors = 0;

  // Process countries in batches to avoid overwhelming the database
  const batchSize = 10;
  for (let i = 0; i < countries.length; i += batchSize) {
    const batch = countries.slice(i, i + batchSize);

    // Process each country in the batch in parallel
    await Promise.all(batch.map(async (country) => {
      try {
        const countryId = country.id; // lowercase ISO like "by"
        const isoCode = country.iso_code?.toUpperCase() || countryId.toUpperCase(); // uppercase like "BY"

        // Query plans using the same .or() logic that works in the modal
        // This matches: country_id = "by" OR country_iso = "BY"
        const { data: plans, error: plansError } = await client
          .from('dataplans')
          .select('id, price')
          .or(`country_id.eq.${countryId},country_iso.eq.${isoCode}`)
          .eq('status', 'active')
          .eq('is_enabled', true);

        if (plansError) {
          console.error(`Error fetching plans for ${countryId}:`, plansError);
          updateErrors++;
          return;
        }

        const planCount = plans?.length || 0;
        const prices = plans?.map(p => parseFloat(p.price)).filter(p => p > 0) || [];
        const minPrice = prices.length > 0 ? Math.min(...prices) : null;

        totalPlans += planCount;

        // Update country stats
        const { error: updateError } = await client
          .from('countries')
          .update({
            plan_count: planCount,
            min_price: minPrice,
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', countryId);

        if (updateError) {
          console.error(`Error updating country ${countryId}:`, updateError);
          updateErrors++;
        } else {
          updated++;
        }
      } catch (err) {
        console.error(`Unexpected error for country ${country.id}:`, err);
        updateErrors++;
      }
    }));
  }

  console.log(`Updated ${updated} countries with ${totalPlans} total plans, ${updateErrors} errors`);

  return { updated, totalPlans };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Import countries from JSON
 * @param {Array} countries - Array of country objects
 * @param {string} userId - User performing the import
 * @returns {Promise<Object>} Import summary
 */
export async function importCountriesFromJSON(countries, userId) {
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const country of countries) {
    try {
      if (!country.code || !country.name) {
        skippedCount++;
        continue;
      }

      const countryId = country.code.toLowerCase();

      // Upsert country
      await upsertCountry({
        id: countryId,
        code: country.code.toUpperCase(),
        name: country.name,
        isActive: country.isActive !== false
      });

      // Upsert translations if provided
      if (country.translations && Object.keys(country.translations).length > 0) {
        await updateCountryTranslations(countryId, country.translations);
      }

      successCount++;
    } catch (err) {
      console.error(`Error importing country ${country.code}:`, err);
      errorCount++;
    }
  }

  return { successCount, errorCount, skippedCount };
}

/**
 * Delete country and associated plans
 * @param {string} countryId - Country ID
 * @returns {Promise<Object>} Deletion summary
 */
export async function deleteCountryWithPlans(countryId) {
  const client = ensureSupabase();

  // First, get count of plans that will be deleted
  const { count: planCount } = await client
    .from('dataplans')
    .select('id', { count: 'exact', head: true })
    .eq('country_id', countryId);

  // Delete plans for this country
  const { error: plansError } = await client
    .from('dataplans')
    .delete()
    .eq('country_id', countryId);

  if (plansError) throw plansError;

  // Delete country translations
  const { error: translationsError } = await client
    .from('country_translations')
    .delete()
    .eq('country_id', countryId);

  if (translationsError) console.warn('Error deleting translations:', translationsError);

  // Delete country
  const { error: countryError } = await client
    .from('countries')
    .delete()
    .eq('id', countryId);

  if (countryError) throw countryError;

  return { deletedPlans: planCount || 0 };
}
