import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

/**
 * @typedef {Object} RegionViewModel
 * @property {string} id
 * @property {string} name
 * @property {string} displayName
 * @property {string} type
 * @property {string} [icon]
 * @property {string} [imageUrl]
 * @property {number} order
 * @property {boolean} isActive
 * @property {number} [countryCount]
 * @property {number} [planCount]
 * @property {number} [minPrice]
 * @property {Array} [countries]
 * @property {Array} [topTariffs]
 * @property {Object} [translations]
 * @property {string} [color]
 * @property {Array} [popularCountries]
 * @property {Array} [topPlanIds]
 */

// NO HARDCODED REGION DATA - All comes from Supabase
// Icons should be stored in the regions.icon field in Supabase

/**
 * Transform Supabase region to view model
 * @param {Object} region - Raw region from Supabase
 * @param {string} locale - Current locale
 * @returns {RegionViewModel}
 */
const transformRegionToViewModel = (region, locale = 'en') => {
  // Get translations
  const translations = {};
  if (region.translations && typeof region.translations === 'object') {
    Object.entries(region.translations).forEach(([lang, data]) => {
      translations[lang] = {
        name: typeof data === 'string' ? data : data.name,
        displayName: typeof data === 'object' ? data.display_name : undefined
      };
    });
  }

  // Get localized display name
  const localizedName = translations[locale]?.name ||
                        translations[locale]?.displayName ||
                        region.display_name ||
                        region.name;

  // Get icon from Supabase ONLY - no hardcoded fallback
  const icon = region.icon || null;

  return {
    id: region.id,
    name: region.name,
    displayName: localizedName,
    type: region.type || 'region',
    icon,
    imageUrl: region.image_url,
    order: region.display_order ?? region.order ?? 0,
    isActive: region.is_active !== false,
    isHidden: region.is_active === false,
    countryCount: region.country_count || region.countries?.length || 0,
    planCount: region.plan_count || region.tariff_count || 0,
    minPrice: region.min_price,
    countries: region.countries || [],
    topTariffs: region.top_tariffs || [],
    translations,
    color: region.color || '#0066CC',
    // Legacy fields for compatibility
    popularCountries: region.countries?.map(c => c.iso_code || c.id) || [],
    topPlanIds: region.top_tariffs?.map(t => t.id) || []
  };
};

/**
 * Fetch regions from Supabase
 * @param {string} locale - Current locale for translations
 * @param {Object} options - Fetch options
 * @returns {Promise<RegionViewModel[]>}
 */
const fetchRegionsFromSupabase = async (locale = 'en', options = {}) => {
  const supabase = getSupabase();
  const { activeOnly = true } = options;

  console.log('[fetchRegionsFromSupabase] Starting fetch, locale:', locale);

  // Build base query
  let query = supabase
    .from('regions')
    .select(`
      *,
      region_translations (
        language_code,
        name,
        display_name,
        source
      )
    `)
    .order('display_order', { ascending: true });

  // Filter by active status
  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[fetchRegionsFromSupabase] Error:', error);
    throw error;
  }

  console.log('[fetchRegionsFromSupabase] Regions from DB:', data?.map(r => r.id));

  // Process translations into the format expected by transformRegionToViewModel
  const regionsWithTranslations = (data || []).map(region => {
    const translations = {};
    if (region.region_translations) {
      region.region_translations.forEach(t => {
        translations[t.language_code] = {
          name: t.name,
          display_name: t.display_name,
          source: t.source
        };
      });
    }
    return { ...region, translations };
  });

  // ALL REGIONS USE STORED VALUES FROM SUPABASE - NO HARDCODED SPECIAL CASES
  // The admin is responsible for keeping country_count and plan_count up to date
  // If a region doesn't exist in Supabase, it won't appear on the website
  return regionsWithTranslations.map(region => {
    return transformRegionToViewModel({
      ...region,
      // Use stored values ONLY - these come from the regions table
      country_count: region.country_count || 0,
      plan_count: region.plan_count || 0,
      min_price: region.min_price || null,
      countries: [] // Don't fetch countries here - let usePromotedCountriesSupabase handle it
    }, locale);
  });
};

/**
 * Hook to fetch regions from Supabase with React Query
 * @param {string} [locale='en'] - Current locale for translations
 * @param {Object} [options] - Hook options
 * @param {boolean} [options.activeOnly=true] - Only fetch active regions
 * @returns {{
 *   regions: RegionViewModel[],
 *   isLoading: boolean,
 *   error: Error|null,
 *   refetch: Function
 * }}
 */
export const useRegionsSupabase = (locale = 'en', options = {}) => {
  const [regions, setRegions] = useState([]);
  const { activeOnly = true } = options;

  // Check if Supabase is available
  const supabaseReady = isSupabaseAvailable();

  const {
    data: regionsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['regions-supabase', locale, activeOnly],
    queryFn: () => fetchRegionsFromSupabase(locale, { activeOnly }),
    enabled: supabaseReady,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes (shorter for fresh stats)
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  // Update regions when Supabase data arrives - no fallback
  useEffect(() => {
    if (regionsData && regionsData.length > 0) {
      setRegions(regionsData);
    }
  }, [regionsData]);

  // Show loading while Supabase initializes, query runs, or no data yet
  const showLoading = !supabaseReady || isLoading || !regionsData;

  return {
    regions,
    isLoading: showLoading,
    error,
    refetch
  };
};

/**
 * Hook to fetch a single region with full details from Supabase
 * @param {string} regionId - Region ID
 * @param {string} [locale='en'] - Current locale
 * @returns {{
 *   region: RegionViewModel|null,
 *   countries: Array,
 *   plans: Array,
 *   isLoading: boolean,
 *   error: Error|null
 * }}
 */
export const useRegionDetailsSupabase = (regionId, locale = 'en') => {
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ['region-details-supabase', regionId, locale],
    queryFn: async () => {
      if (!regionId) return null;

      const supabase = getSupabase();

      // Fetch region with translations
      const { data: region, error: regionError } = await supabase
        .from('regions')
        .select(`
          *,
          region_translations (
            language_code,
            name,
            display_name
          )
        `)
        .eq('id', regionId)
        .single();

      if (regionError) throw regionError;

      // Fetch countries in this region
      const { data: countries } = await supabase
        .from('countries')
        .select(`
          *,
          country_translations (
            language_code,
            name
          )
        `)
        .eq('region_id', regionId)
        .eq('is_active', true)
        .order('is_popular', { ascending: false })
        .order('name', { ascending: true });

      // Fetch plans for this region
      const { data: plans } = await supabase
        .from('dataplans')
        .select('*')
        .or(`region_id.eq.${regionId},plan_type.eq.${region.type === 'global' ? 'global' : regionId}`)
        .eq('status', 'active')
        .eq('is_enabled', true)
        .neq('package_type', 'topup')
        .order('price', { ascending: true });

      // Process translations
      const translations = {};
      if (region.region_translations) {
        region.region_translations.forEach(t => {
          translations[t.language_code] = {
            name: t.name,
            display_name: t.display_name
          };
        });
      }

      return {
        region: transformRegionToViewModel({ ...region, translations }, locale),
        countries: countries || [],
        plans: plans || []
      };
    },
    enabled: !!regionId && isSupabaseAvailable(),
    retry: 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  return {
    region: data?.region || null,
    countries: data?.countries || [],
    plans: data?.plans || [],
    isLoading,
    error
  };
};

export default useRegionsSupabase;
