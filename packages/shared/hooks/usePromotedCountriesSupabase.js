import { useQuery } from '@tanstack/react-query';
import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

/**
 * Generate flag emoji from ISO country code
 * Uses Unicode regional indicator symbols - no hardcoded data
 * @param {string} countryCode - 2-letter ISO country code
 * @returns {string} Flag emoji or globe emoji for invalid codes
 */
const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  if (countryCode.includes('-') || countryCode.length > 2) return '🌍';

  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌍';
  }
};

/**
 * Transform Supabase country to view model
 * PURE SUPABASE DATA - NO HARDCODED FALLBACKS
 * @param {Object} country - Raw country from Supabase
 * @param {string} locale - Current locale
 * @returns {Object} Country view model
 */
const transformCountryToViewModel = (country, locale = 'en') => {
  // Get translations from country_translations join
  const translations = {};
  if (country.country_translations) {
    country.country_translations.forEach(t => {
      translations[t.language_code] = t.name;
    });
  }

  // Get localized name - ONLY from Supabase data
  let displayName = translations[locale] || country.name || country.iso_code;

  return {
    id: country.id,
    code: country.iso_code || country.id?.toUpperCase() || '',
    name: country.name || country.iso_code || '',
    displayName,
    slug: country.slug || country.id,
    imageUrl: country.image_url,
    // Generate flag emoji from country code - no hardcoded lookup
    flagEmoji: getFlagEmoji(country.iso_code),
    planCount: country.plan_count || 0,
    minPrice: country.min_price,
    isActive: country.is_active !== false,
    isPopular: country.is_popular === true,
    isRegional: country.is_regional === true,
    // ONLY use explicit region_id - NO continent fallback
    region: (country.region_id || '').toLowerCase(),
    translations,
    status: country.is_active !== false ? 'active' : 'inactive',
    originalName: country.name,
    image: country.image_url ? { url: country.image_url } : null
  };
};

/**
 * Fetch promoted countries for a specific region from Supabase
 * ONLY returns countries if:
 * 1. Region is active in the regions table
 * 2. Countries are explicitly promoted for that region OR have region_id matching
 * NO automatic continent matching - data must be in Supabase
 *
 * @param {string} regionId - Region identifier
 * @param {string} locale - Current locale for translations
 * @param {number} limit - Max countries to return (default: 8)
 * @returns {Promise<Array>} Array of country view models
 */
const fetchPromotedCountries = async (regionId, locale = 'en', limit = 8) => {
  if (!regionId || !isSupabaseAvailable()) return [];

  const supabase = getSupabase();

  // ALL regions must exist in Supabase and be active - NO hardcoded exceptions
  const { data: regionData, error: regionError } = await supabase
    .from('regions')
    .select('id, is_active, country_count, plan_count')
    .eq('id', regionId)
    .single();

  if (regionError || !regionData) {
    console.log('[fetchPromotedCountries] Region not found in Supabase:', regionId);
    return [];
  }

  // If region is not active, return empty - NO DATA
  if (regionData.is_active === false) {
    console.log('[fetchPromotedCountries] Region is inactive:', regionId);
    return [];
  }

  // 1. Fetch promoted countries for this region from region_promoted_countries table
  const { data: promotedData, error: promotedError } = await supabase
    .from('region_promoted_countries')
    .select(`
      position,
      country:countries (
        id,
        iso_code,
        name,
        slug,
        image_url,
        plan_count,
        min_price,
        is_popular,
        is_active,
        region_id,
        continent,
        country_translations (
          language_code,
          name,
          description
        )
      )
    `)
    .eq('region_id', regionId)
    .eq('is_active', true)
    .order('position', { ascending: true });

  if (promotedError) {
    console.error('[fetchPromotedCountries] Error fetching promoted:', promotedError);
  }

  // Extract and transform promoted countries (only those with plans)
  // Mark these as explicitly promoted so they get the badge
  const promoted = (promotedData || [])
    .filter(p => p.country && p.country.plan_count > 0 && p.country.is_active !== false)
    .map(p => ({
      ...transformCountryToViewModel(p.country, locale),
      isExplicitlyPromoted: true // Flag to distinguish from fallbacks
    }));

  // 2. If we have enough promoted countries, return them
  if (promoted.length >= limit) {
    return promoted.slice(0, limit);
  }

  // 3. Otherwise, fetch fallback countries to fill remaining slots
  // IMPORTANT: Only use EXPLICIT region_id matching - NO continent guessing
  const promotedIds = promoted.map(c => c.id);
  const remaining = limit - promoted.length;

  let query = supabase
    .from('countries')
    .select(`
      id,
      iso_code,
      name,
      slug,
      image_url,
      plan_count,
      min_price,
      is_popular,
      is_active,
      region_id,
      continent,
      country_translations (
        language_code,
        name,
        description
      )
    `)
    .eq('is_active', true)
    .gt('plan_count', 0);

  // Filter by explicit region_id ONLY - NO hardcoded special cases
  // All region logic is controlled by Supabase data
  query = query.eq('region_id', regionId);

  // Exclude already promoted countries
  if (promotedIds.length > 0) {
    query = query.not('id', 'in', `(${promotedIds.join(',')})`);
  }

  // Order alphabetically and limit
  const { data: fallbackData, error: fallbackError } = await query
    .order('name', { ascending: true })
    .limit(remaining);

  if (fallbackError) {
    console.error('[fetchPromotedCountries] Error fetching fallback:', fallbackError);
  }

  // Transform fallback countries - NOT explicitly promoted (no badge)
  const fallback = (fallbackData || [])
    .map(c => ({
      ...transformCountryToViewModel(c, locale),
      isExplicitlyPromoted: false // Fallbacks don't get the badge
    }));

  return [...promoted, ...fallback];
};

/**
 * Hook to fetch promoted countries for a region from Supabase
 *
 * @param {string} regionId - Region identifier (e.g., 'popular', 'europe', 'asia')
 * @param {string} [locale='en'] - Current locale for translations
 * @param {number} [limit=8] - Maximum number of countries to return
 * @returns {{
 *   promotedCountries: Array,
 *   isLoading: boolean,
 *   error: Error|null,
 *   refetch: Function
 * }}
 */
export const usePromotedCountriesSupabase = (regionId, locale = 'en', limit = 8) => {
  const supabaseReady = isSupabaseAvailable();

  const {
    data: promotedCountries,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['promoted-countries', regionId, locale, limit],
    queryFn: () => fetchPromotedCountries(regionId, locale, limit),
    enabled: !!regionId && supabaseReady,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  // Show loading while Supabase initializes, query runs, or no data yet
  const showLoading = !supabaseReady || isLoading;

  return {
    promotedCountries: promotedCountries || [],
    isLoading: showLoading,
    error,
    refetch
  };
};

export default usePromotedCountriesSupabase;
