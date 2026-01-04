/**
 * Country Adapter - Transforms Supabase data to UI view models
 *
 * This adapter provides a clean separation between the database schema
 * and the UI components, allowing for consistent data representation
 * and easier maintenance.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const ENTITY_TAGS = {
  COUNTRY: 'Country',
  REGIONAL: 'Regional',
  DISCOVER_PLUS: 'Discover+',
  GLOBAL: 'Global',
  POPULAR: 'Popular'
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' }
];

// ============================================================================
// TAG DETERMINATION
// ============================================================================

/**
 * Determine entity tags based on Supabase data
 * Tags are derived deterministically from database fields
 *
 * @param {Object} country - Supabase country record
 * @param {Object} options - Additional data for tag determination
 * @returns {string[]} Array of tag strings
 */
export function determineEntityTags(country, options = {}) {
  const tags = [];

  // Primary type tag (mutually exclusive)
  if (country.is_regional === true) {
    tags.push(ENTITY_TAGS.REGIONAL);
  } else {
    tags.push(ENTITY_TAGS.COUNTRY);
  }

  // Check for Discover+ (from regional_plans join or options)
  if (options.isDiscoverPlus || country.regional_plans?.is_discover_plus) {
    tags.push(ENTITY_TAGS.DISCOVER_PLUS);
  }

  // Check for Global coverage type
  if (options.coverageType === 'global' || country.regional_plans?.coverage_type === 'global') {
    tags.push(ENTITY_TAGS.GLOBAL);
  }

  return tags;
}

// ============================================================================
// TRANSFORMERS
// ============================================================================

/**
 * Transform Supabase country record to UI view model
 *
 * @param {Object} supabaseCountry - Raw Supabase country record
 * @param {Object} options - Transformation options
 * @returns {Object} CountryViewModel for UI consumption
 */
export function toCountryViewModel(supabaseCountry, options = {}) {
  // Transform translations from array to object keyed by language
  const translations = {};
  (supabaseCountry.country_translations || []).forEach(t => {
    if (t.language_code && t.name) {
      translations[t.language_code] = t.name;
    }
  });

  // Determine tags
  const tags = determineEntityTags(supabaseCountry, options);

  // Build the view model
  const viewModel = {
    // Core identifiers
    id: supabaseCountry.id,
    code: supabaseCountry.iso_code?.toUpperCase() || supabaseCountry.id?.toUpperCase() || '',

    // Display data
    name: supabaseCountry.name || '',
    imageUrl: supabaseCountry.image_url || null,
    translations,

    // Status flags
    isActive: supabaseCountry.is_active !== false,
    isPopular: supabaseCountry.is_popular === true,
    isRegional: supabaseCountry.is_regional === true,

    // Stats
    planCount: supabaseCountry.plan_count || 0,
    minPrice: supabaseCountry.min_price || null,
    topupCount: supabaseCountry.topup_count || 0,

    // Metadata
    lastSync: supabaseCountry.synced_at ? new Date(supabaseCountry.synced_at) : null,
    continent: supabaseCountry.continent || null,
    timezone: supabaseCountry.timezone || null,

    // Tags for UI rendering
    tags,

    // Regional plan data (if applicable)
    coveredCountriesCount: supabaseCountry.regional_plans?.country_count ||
                           supabaseCountry.covered_countries_count || 0,
    coverageType: supabaseCountry.regional_plans?.coverage_type || null,

    // Source tracking
    source: supabaseCountry.provider || 'supabase',

    // Backward compatibility with legacy Firebase field names
    // These can be removed after full migration
    isHidden: supabaseCountry.is_active === false,
    image: supabaseCountry.image_url ? { url: supabaseCountry.image_url } : null,
    lastPriceSync: supabaseCountry.synced_at
      ? { toDate: () => new Date(supabaseCountry.synced_at) }
      : null
  };

  return viewModel;
}

/**
 * Transform array of Supabase countries to view models
 *
 * @param {Array} supabaseCountries - Array of Supabase country records
 * @param {Object} options - Transformation options
 * @returns {Array} Array of CountryViewModels
 */
export function toCountryViewModels(supabaseCountries, options = {}) {
  return (supabaseCountries || []).map(country =>
    toCountryViewModel(country, options)
  );
}

/**
 * Transform UI form data back to Supabase format
 * Used when saving/updating countries
 *
 * @param {Object} formData - UI form data
 * @returns {Object} Supabase-compatible country record
 */
export function fromFormData(formData) {
  return {
    id: (formData.code || formData.id || '').toLowerCase(),
    name: formData.name?.trim() || '',
    iso_code: (formData.code || formData.id || '').toUpperCase(),
    image_url: formData.photo || formData.imageUrl || formData.image?.url || null,
    is_active: formData.isActive !== false,
    is_popular: formData.is_popular === true || formData.isPopular === true,
    is_regional: formData.is_regional === true || formData.isRegional === true,
    continent: formData.region !== 'other' ? formData.region : null
  };
}

/**
 * Transform view model back to form data
 * Used when populating edit forms
 *
 * @param {Object} viewModel - CountryViewModel
 * @returns {Object} Form-compatible data
 */
export function toFormData(viewModel) {
  return {
    code: viewModel.code || '',
    name: viewModel.name || '',
    translations: viewModel.translations || {},
    photo: viewModel.imageUrl || viewModel.image?.url || '',
    description: viewModel.description || '',
    isActive: viewModel.isActive !== false,
    region: viewModel.continent || 'other',
    is_popular: viewModel.isPopular === true
  };
}

// ============================================================================
// FILTERING HELPERS
// ============================================================================

/**
 * Filter countries to only valid country entries (not regions)
 *
 * @param {Array} countries - Array of country view models
 * @returns {Array} Filtered countries with valid ISO codes
 */
export function filterValidCountries(countries) {
  return countries.filter(country => {
    const code = country.code || '';
    // Valid country must have a 2-letter ISO code
    return code.length === 2 && /^[A-Z]{2}$/i.test(code);
  });
}

/**
 * Filter to only regional entities
 *
 * @param {Array} countries - Array of country view models
 * @returns {Array} Only regional entities
 */
export function filterRegionalEntities(countries) {
  return countries.filter(country => country.isRegional === true);
}

/**
 * Filter by tag
 *
 * @param {Array} countries - Array of country view models
 * @param {string} tag - Tag to filter by
 * @returns {Array} Countries with the specified tag
 */
export function filterByTag(countries, tag) {
  return countries.filter(country =>
    country.tags && country.tags.includes(tag)
  );
}

// ============================================================================
// SORTING HELPERS
// ============================================================================

/**
 * Sort countries by field
 *
 * @param {Array} countries - Array of country view models
 * @param {string} field - Field to sort by
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted countries
 */
export function sortCountries(countries, field = 'name', order = 'asc') {
  return [...countries].sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];

    // Handle null/undefined
    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';

    // Numeric comparison for number fields
    if (['planCount', 'minPrice', 'topupCount'].includes(field)) {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    }

    // String comparison
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    let comparison;
    if (aVal > bVal) comparison = 1;
    else if (aVal < bVal) comparison = -1;
    else comparison = 0;

    return order === 'asc' ? comparison : -comparison;
  });
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Get localized country name with fallback
 *
 * @param {Object} country - Country view model
 * @param {string} languageCode - Target language code
 * @returns {string} Localized name or fallback
 */
export function getLocalizedName(country, languageCode = 'en') {
  return country.translations?.[languageCode] || country.name || country.code || '';
}

/**
 * Get translation completion status
 *
 * @param {Object} country - Country view model
 * @returns {Object} Translation stats
 */
export function getTranslationStats(country) {
  const translations = country.translations || {};
  const translatedCount = Object.keys(translations).filter(
    key => translations[key] && translations[key].trim()
  ).length;

  return {
    count: translatedCount,
    total: SUPPORTED_LANGUAGES.length,
    percentage: Math.round((translatedCount / SUPPORTED_LANGUAGES.length) * 100),
    missing: SUPPORTED_LANGUAGES.filter(lang => !translations[lang.code]?.trim())
  };
}

/**
 * Get tag display configuration
 *
 * @param {string} tag - Tag name
 * @returns {Object} Display configuration
 */
export function getTagStyle(tag) {
  const styles = {
    [ENTITY_TAGS.COUNTRY]: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-200'
    },
    [ENTITY_TAGS.REGIONAL]: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-200'
    },
    [ENTITY_TAGS.DISCOVER_PLUS]: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-200'
    },
    [ENTITY_TAGS.GLOBAL]: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200'
    },
    [ENTITY_TAGS.POPULAR]: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200'
    }
  };

  return styles[tag] || styles[ENTITY_TAGS.COUNTRY];
}
