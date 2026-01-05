import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

/**
 * Plans Service - Supabase operations for data plans
 * This service provides read-only access to plans for the customer app
 */

/**
 * Format data amount in MB to human-readable string
 * @param {number} mb - Data amount in megabytes
 * @returns {string}
 */
const formatDataAmount = (mb) => {
  if (!mb || mb <= 0) return 'Data';
  if (mb >= 1024) {
    const gb = mb / 1024;
    // Format to avoid floating point issues (e.g., 1024 -> "1 GB", 2048 -> "2 GB")
    return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`;
  }
  return `${mb} MB`;
};

/**
 * Transform Supabase plan to view model
 * @param {Object} plan - Raw plan from Supabase
 * @param {Object} regionalPlanData - Optional data from regional_plans table
 * @returns {Object} Plan view model
 */
export const transformPlanToViewModel = (plan, regionalPlanData = null) => {
  const countryCodes = plan.covered_countries || [plan.country_iso || plan.country_id?.toUpperCase()].filter(Boolean);
  const countryIso = plan.country_iso || plan.country_id?.toUpperCase();

  // Format country name properly (capitalize first letter of each word)
  const formatCountryName = (name) => {
    if (!name) return '';
    return name.split(/[-_\s]/).map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const countryName = plan.country_name || formatCountryName(plan.country_id) || countryIso;

  // Get covered country count - check multiple possible sources:
  // 1. From regional_plans join (most accurate for regional/global plans)
  // 2. From dataplans table directly (covered_country_count or country_count)
  // 3. From covered_countries array length
  // 4. Fallback to countryCodes length
  const coveredCountryCount = regionalPlanData?.country_count ||
                               plan.regional_plans?.country_count ||
                               plan.covered_country_count ||
                               plan.country_count ||
                               (plan.covered_countries?.length || 0) ||
                               countryCodes.length;

  return {
    id: plan.id,
    name: plan.name,
    data: plan.data_display || formatDataAmount(plan.data_amount_mb),
    dataAmountMb: plan.data_amount_mb,
    dataUnit: plan.data_amount_mb >= 1024 ? 'GB' : 'MB',
    validity: plan.validity_days || 0,
    // Legacy period/duration fields for PlanSelectionBottomSheet compatibility
    period: plan.validity_days || 0,
    duration: plan.validity_days || 0,
    price: plan.price,
    currency: plan.currency || 'USD',
    // Boolean flags (strict boolean checks to avoid truthy values like "false" string)
    hasVoice: plan.has_voice === true,
    hasSms: plan.has_sms === true,
    isUnlimited: plan.is_unlimited === true,
    isRegional: plan.is_regional === true,
    // Numeric values for SMS/Voice (for PlanSelectionBottomSheet)
    sms: String(plan.sms_count || (plan.has_sms ? 100 : 0)),
    voice: String(plan.voice_minutes || (plan.has_voice ? 100 : 0)),
    calls: String(plan.voice_minutes || (plan.has_voice ? 100 : 0)),
    // Country identifiers
    countryId: plan.country_id,
    country_code: countryIso,
    country_codes: countryCodes,
    countryCodes: countryCodes,
    // Country/Region names (properly formatted)
    country_name: countryName,
    country_title: countryName,
    country_region: plan.region_name || plan.region_id || '',
    region: plan.region_id || '',
    region_slug: plan.region_id || '',
    // Coverage count - actual number of countries covered by this plan
    coveredCountryCount,
    // Featured plan info (from regional_plans table)
    isFeatured: regionalPlanData?.is_featured || plan.regional_plans?.is_featured || false,
    priorityRank: regionalPlanData?.priority_rank ?? plan.regional_plans?.priority_rank ?? 999,
    // Operator info
    operatorName: plan.operator_name,
    operatorLogo: plan.operator_logo || plan.operator_image_url,
    // Fair usage policy (for unlimited plans)
    fairUsagePolicy: plan.fair_usage_policy,
    country_slug: plan.country_id,
    // Legacy fields for compatibility with existing components
    package: plan.name,
    planName: plan.name,
    enabled: plan.is_enabled !== false,
    is_topup: false,
    type: plan.plan_type || plan.plan_category || 'local',
    operator_coverages: countryCodes.map(code => ({ country_code: code }))
  };
};

/**
 * Fetch plans for a specific country
 * @param {string} countryCode - Country ISO code (e.g., 'US', 'GB')
 * @returns {Promise<Array>} Plans for the country
 */
export async function fetchCountryPlans(countryCode) {
  if (!countryCode || !isSupabaseAvailable()) {
    return [];
  }

  const supabase = getSupabase();
  const normalizedCode = countryCode.toLowerCase();
  const upperCode = countryCode.toUpperCase();

  // Fetch LOCAL plans for this specific country only
  // Use country_id (lowercase slug) or country_iso (uppercase ISO code)
  // Exclude global/regional plans - those are fetched separately
  const { data, error } = await supabase
    .from('dataplans')
    .select('*')
    .or(`country_id.eq.${normalizedCode},country_iso.eq.${upperCode}`)
    .eq('status', 'active')
    .eq('is_enabled', true)
    .neq('plan_type', 'global')
    .order('price', { ascending: true });

  if (error) {
    console.error('Error fetching country plans:', error);
    throw error;
  }

  // Filter out regional plans that aren't specifically for this country
  const localPlans = (data || []).filter(plan => {
    // Keep plans that are specifically for this country
    if (plan.country_id === normalizedCode || plan.country_iso === upperCode) {
      // Exclude plans marked as regional unless they're country-specific regional
      if (plan.is_regional && plan.plan_type === 'regional') {
        return false;
      }
      return true;
    }
    return false;
  });

  return localPlans.map(transformPlanToViewModel);
}

/**
 * Fetch global/discover plans
 * @returns {Promise<Array>} Global plans
 */
export async function fetchGlobalPlans() {
  if (!isSupabaseAvailable()) {
    return [];
  }

  const supabase = getSupabase();

  // Fetch plans that are global type or have 'global' in their name/title
  const { data, error } = await supabase
    .from('dataplans')
    .select('*')
    .eq('status', 'active')
    .eq('is_enabled', true)
    .or('plan_type.eq.global,country_id.ilike.%global%,name.ilike.%global%')
    .order('price', { ascending: true });

  if (error) {
    console.error('Error fetching global plans:', error);
    throw error;
  }

  // Filter out top-ups and add best value flag
  let plans = (data || [])
    .filter(p => !p.is_topup && p.type !== 'topup')
    .map(transformPlanToViewModel);

  // Sort by data/price ratio to find best value
  if (plans.length > 0) {
    const plansWithValue = plans.map(p => ({
      ...p,
      valueScore: (p.dataAmountMb || 0) / (p.price || 1)
    }));
    plansWithValue.sort((a, b) => b.valueScore - a.valueScore);

    // Mark best value plan
    if (plansWithValue.length > 0) {
      const bestValueId = plansWithValue[0].id;
      plans = plans.map(p => ({
        ...p,
        isBestValue: p.id === bestValueId
      }));
    }
  }

  return plans;
}

/**
 * Fetch regional plans by region slug
 * Prioritizes featured plans (is_featured=true) ordered by priority_rank
 * @param {string} regionSlug - Region identifier (e.g., 'europe', 'asia', 'global')
 * @returns {Promise<Array>} Regional plans with actual country coverage counts
 */
export async function fetchRegionalPlans(regionSlug) {
  if (!regionSlug || !isSupabaseAvailable()) {
    return [];
  }

  const supabase = getSupabase();
  const isGlobal = regionSlug === 'global';

  // Fetch plans with regional_plans metadata (contains actual country_count)
  // Join with regional_plans table to get the actual coverage count per plan
  let query = supabase
    .from('dataplans')
    .select(`
      *,
      regional_plans (
        country_count,
        continent_count,
        coverage_type,
        display_name,
        marketing_name,
        is_featured,
        priority_rank
      )
    `)
    .eq('status', 'active')
    .eq('is_enabled', true);

  if (isGlobal) {
    // For global region, fetch plans that have:
    // - region_id = 'global' (the actual field used for global plans)
    // - is_regional = true
    // Global plans have plan_type='regional' but region_id='global'
    query = query
      .eq('is_regional', true)
      .eq('region_id', 'global');
  } else {
    // For other regions, fetch regional plans
    query = query
      .eq('is_regional', true)
      .or(`region_id.eq.${regionSlug},country_id.ilike.%${regionSlug}%`);
  }

  // Order by price as base ordering (we'll re-sort for featured plans below)
  const { data, error } = await query.order('price', { ascending: true });

  if (error) {
    console.error('Error fetching regional plans:', error);
    throw error;
  }

  // Transform and filter plans
  let plans = (data || [])
    .filter(p => !p.is_topup && p.type !== 'topup')
    .map(plan => transformPlanToViewModel(plan, plan.regional_plans));

  // Sort plans: featured first (by priority_rank), then non-featured (by price)
  plans.sort((a, b) => {
    const aFeatured = a.isFeatured || false;
    const bFeatured = b.isFeatured || false;

    // Featured plans come first
    if (aFeatured && !bFeatured) return -1;
    if (!aFeatured && bFeatured) return 1;

    // Among featured plans, sort by priority_rank (lower = higher priority)
    if (aFeatured && bFeatured) {
      const aRank = a.priorityRank ?? 999;
      const bRank = b.priorityRank ?? 999;
      return aRank - bRank;
    }

    // Among non-featured plans, sort by price
    return (a.price || 0) - (b.price || 0);
  });

  return plans;
}

/**
 * Fetch plans with specific data amounts (for featured/priority plans)
 * @param {Array<number>} dataAmounts - Array of data amounts in MB to prioritize
 * @param {number} [limit=4] - Maximum number of plans to return
 * @returns {Promise<Array>} Prioritized plans
 */
export async function fetchPrioritizedGlobalPlans(dataAmounts = [200, 1000, 10000, 20000], limit = 4) {
  const allPlans = await fetchGlobalPlans();

  if (allPlans.length === 0) {
    return [];
  }

  const priorityPlans = [];

  // Find plans matching each priority data amount
  for (const targetMb of dataAmounts) {
    const found = allPlans.find(p => {
      const planMb = p.dataAmountMb || 0;
      // Allow for some variance (within 10%)
      return Math.abs(planMb - targetMb) / targetMb < 0.1;
    });

    if (found && !priorityPlans.find(p => p.id === found.id)) {
      priorityPlans.push(found);
    }

    if (priorityPlans.length >= limit) break;
  }

  // Fill remaining slots with cheapest plans
  const remainingSlots = limit - priorityPlans.length;
  if (remainingSlots > 0) {
    const remainingPlans = allPlans
      .filter(p => !priorityPlans.find(pp => pp.id === p.id))
      .slice(0, remainingSlots);
    priorityPlans.push(...remainingPlans);
  }

  return priorityPlans;
}

/**
 * Count unique countries from plan coverages
 * @param {Array} plans - Array of plans
 * @returns {number} Count of unique countries
 */
export function countCountriesFromPlans(plans) {
  if (!plans || !Array.isArray(plans)) return 0;

  const countrySet = new Set();

  plans.forEach(plan => {
    const coverages = plan.covered_countries ||
                      plan.countryCodes ||
                      plan.operator_coverages?.map(oc => oc.country_code) ||
                      [];

    coverages.forEach(code => {
      if (code && typeof code === 'string') {
        countrySet.add(code.toUpperCase());
      }
    });
  });

  return countrySet.size;
}

/**
 * Search plans by text query
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Matching plans
 */
export async function searchPlans(query, options = {}) {
  if (!query || !isSupabaseAvailable()) {
    return [];
  }

  const supabase = getSupabase();
  const { limit = 20 } = options;

  const { data, error } = await supabase
    .from('dataplans')
    .select('*')
    .eq('status', 'active')
    .eq('is_enabled', true)
    .or(`name.ilike.%${query}%,country_id.ilike.%${query}%,operator_name.ilike.%${query}%`)
    .order('price', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error searching plans:', error);
    throw error;
  }

  return (data || []).map(transformPlanToViewModel);
}

export default {
  fetchCountryPlans,
  fetchGlobalPlans,
  fetchRegionalPlans,
  fetchPrioritizedGlobalPlans,
  countCountriesFromPlans,
  searchPlans,
  transformPlanToViewModel
};
