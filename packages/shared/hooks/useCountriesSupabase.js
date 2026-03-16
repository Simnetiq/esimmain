import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupabase, isSupabaseAvailable } from '../lib/supabase';
import { transformPlanToViewModel } from '../services/plansServiceSupabase';

/**
 * @typedef {Object} CountryViewModel
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} displayName
 * @property {string} [slug]
 * @property {string} [imageUrl]
 * @property {string} flagEmoji
 * @property {number} planCount
 * @property {number} [minPrice]
 * @property {boolean} isActive
 * @property {boolean} isPopular
 * @property {boolean} isRegional
 * @property {string} [region]
 * @property {Object} [translations]
 * @property {string} status
 */

/**
 * Generate flag emoji from ISO country code
 * Uses Unicode regional indicator symbols - no hardcoded data
 * @param {string} countryCode - 2-letter ISO country code
 * @returns {string} Flag emoji or globe emoji for invalid codes
 */
const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🌍';

  if (countryCode.includes('-') || countryCode.length > 2) {
    return '🌍';
  }

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
 * @returns {CountryViewModel}
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
    // Normalize region to lowercase for consistent filtering
    // ONLY use explicit region_id - NO continent fallback
    region: (country.region_id || '').toLowerCase(),
    translations,
    status: country.is_active !== false ? 'active' : 'inactive',
    // Preserve original fields for compatibility
    originalName: country.name,
    image: country.image_url ? { url: country.image_url } : null
  };
};

/**
 * Fetch countries from Supabase with dynamic plan stats
 * PURE SUPABASE - NO FALLBACKS
 * @param {string} locale - Current locale for translations
 * @returns {Promise<CountryViewModel[]>}
 */
const fetchCountriesFromSupabase = async (locale = 'en') => {
  console.log('[fetchCountriesFromSupabase] Starting fetch...');
  const supabase = getSupabase();

  // Fetch countries and plan stats in parallel (independent queries)
  const [countriesResult, planStatsResult] = await Promise.all([
    supabase
      .from('countries')
      .select(`
        *,
        country_translations (
          language_code,
          name,
          description
        ),
        region:regions!countries_region_id_fkey (
          id,
          is_active
        )
      `)
      .eq('is_active', true)
      .order('is_popular', { ascending: false })
      .order('name', { ascending: true }),
    supabase
      .from('dataplans')
      .select('country_id, country_iso, price')
      .eq('status', 'active')
      .eq('is_enabled', true)
      .neq('plan_type', 'global')
      .neq('package_type', 'topup')
  ]);

  const { data, error } = countriesResult;
  const { data: planStats } = planStatsResult;

  if (error) {
    console.error('[fetchCountriesFromSupabase] Error:', error);
    throw error;
  }

  console.log('[fetchCountriesFromSupabase] Received', data?.length, 'countries from Supabase');

  // Build stats map by country - index by multiple keys for better matching
  const statsMap = new Map();
  (planStats || []).forEach(plan => {
    // Get all possible keys for this plan
    const keys = [];
    if (plan.country_id) keys.push(plan.country_id.toLowerCase());
    if (plan.country_iso) {
      keys.push(plan.country_iso.toLowerCase());
      keys.push(plan.country_iso.toUpperCase());
    }

    // Skip if no keys found
    if (keys.length === 0) return;

    // Update stats for all matching keys
    keys.forEach(key => {
      if (!statsMap.has(key)) {
        statsMap.set(key, { count: 0, minPrice: Infinity });
      }
      const stats = statsMap.get(key);
      stats.count++;
      if (plan.price && plan.price < stats.minPrice) {
        stats.minPrice = plan.price;
      }
    });
  });

  // Filter to valid countries:
  // 1. Must be valid ISO code (2-letter) OR regional entity
  // 2. If country has a region, that region MUST be active
  const validCountries = (data || []).filter(country => {
    const isoCode = country.iso_code || '';
    const isValidCountry = isoCode.length === 2 && /^[A-Z]{2}$/i.test(isoCode);
    const isRegional = country.is_regional === true;

    // Check if valid country format
    if (!isValidCountry && !isRegional) return false;

    // If country has a region and that region is INACTIVE, exclude the country
    if (country.region && country.region.is_active === false) {
      console.log('[fetchCountriesFromSupabase] Excluding country', country.iso_code, 'from inactive region:', country.region_id);
      return false;
    }

    return true;
  });

  // Transform to view models with computed stats
  const countries = validCountries.map(country => {
    // Look up dynamic stats - try multiple key formats
    const countryId = (country.id || '').toLowerCase();
    const isoLower = (country.iso_code || '').toLowerCase();
    const isoUpper = (country.iso_code || '').toUpperCase();
    const dynamicStats = statsMap.get(countryId) || statsMap.get(isoLower) || statsMap.get(isoUpper);

    // Use ONLY dynamic stats from Supabase - NO hardcoded fallbacks
    const enhancedCountry = {
      ...country,
      plan_count: dynamicStats?.count || country.plan_count || 0,
      min_price: (dynamicStats && dynamicStats.minPrice !== Infinity) ? dynamicStats.minPrice : (country.min_price || null)
    };

    return transformCountryToViewModel(enhancedCountry, locale);
  });

  // Remove duplicates by code
  const uniqueCountries = [];
  const seenCodes = new Set();

  for (const country of countries) {
    if (!seenCodes.has(country.code)) {
      seenCodes.add(country.code);
      uniqueCountries.push(country);
    }
  }

  console.log('[fetchCountriesFromSupabase] Returning', uniqueCountries.length, 'unique countries');

  return uniqueCountries;
};

/**
 * Hook to fetch countries from Supabase with React Query
 * PURE SUPABASE - NO FALLBACKS
 * @param {string} [locale='en'] - Current locale for translations
 * @returns {{
 *   countries: CountryViewModel[],
 *   filteredCountries: CountryViewModel[],
 *   setFilteredCountries: Function,
 *   isLoading: boolean,
 *   loading: boolean,
 *   error: Error|null,
 *   refetch: Function
 * }}
 */
export const useCountriesSupabase = (locale = 'en') => {
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);

  // Check if Supabase is available
  const supabaseReady = isSupabaseAvailable();

  const {
    data: countriesData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['countries-supabase', locale],
    queryFn: () => fetchCountriesFromSupabase(locale),
    enabled: supabaseReady,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  // Update countries state when Supabase data arrives
  useEffect(() => {
    if (countriesData && countriesData.length > 0) {
      // Use Supabase data ONLY - NO fallback
      setCountries(countriesData);
      setFilteredCountries(countriesData);
    }
  }, [countriesData]);

  // Show loading state while:
  // 1. Supabase is initializing (not ready)
  // 2. Query is running
  // 3. Supabase ready but no data yet
  const showLoading = !supabaseReady || isLoading || !countriesData;

  return {
    countries,
    filteredCountries,
    setFilteredCountries,
    isLoading: showLoading,
    loading: showLoading, // Alias for compatibility
    error,
    refetch
  };
};

/**
 * Hook to fetch plans for a specific country from Supabase
 * @param {string} countryCode - Country ISO code
 * @returns {{
 *   plans: Array,
 *   isLoading: boolean,
 *   error: Error|null
 * }}
 */
export const useCountryPlansSupabase = (countryCode) => {
  const {
    data: plans = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['country-plans-supabase', countryCode],
    queryFn: async () => {
      if (!countryCode) return [];

      const supabase = getSupabase();
      const normalizedCode = countryCode.toLowerCase();
      const upperCode = countryCode.toUpperCase();

      // Fetch plans matching this country (exclude global/regional plans)
      const { data, error } = await supabase
        .from('dataplans')
        .select('*')
        .or(`country_id.eq.${normalizedCode},country_iso.eq.${upperCode}`)
        .eq('status', 'active')
        .eq('is_enabled', true)
        .neq('plan_type', 'global')
        .neq('package_type', 'topup')
        .order('price', { ascending: true });

      if (error) throw error;

      // Transform to plan view model using shared transformation
      return (data || []).map(transformPlanToViewModel);
    },
    enabled: !!countryCode && isSupabaseAvailable(),
    retry: 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return { plans, isLoading, error };
};

/**
 * Hook to get localized country/region names for dashboard display
 * Uses Supabase country_translations for localization
 * @param {string} locale - Current locale (e.g., 'en', 'es', 'de')
 * @returns {{
 *   getLocalizedName: (code: string, fallback: string) => string,
 *   isLoading: boolean
 * }}
 */
export const useCountryNames = (locale = 'en') => {
  const { countries, isLoading } = useCountriesSupabase(locale);

  /**
   * Get localized country/region name by ISO code
   * @param {string} code - Country ISO code (e.g., 'DE', 'US') or region slug
   * @param {string} fallback - Fallback name if not found
   * @returns {string} Localized name or fallback
   */
  const getLocalizedName = (code, fallback) => {
    if (!code) return fallback || '';

    const normalizedCode = code.toUpperCase();

    // Find country by code
    const country = countries.find(c =>
      c.code?.toUpperCase() === normalizedCode ||
      c.id?.toUpperCase() === normalizedCode
    );

    if (country) {
      // Return localized displayName (already set by transformCountryToViewModel)
      return country.displayName || country.name || fallback || '';
    }

    return fallback || code;
  };

  return { getLocalizedName, isLoading };
};

export default useCountriesSupabase;
