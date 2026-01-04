import supabase from '../lib/supabase';

/**
 * Plan Service - Supabase CRUD operations for data plans
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
 * Fetch plans for a specific country from Supabase
 * @param {string} countryCode - Country code (ISO or ID)
 * @returns {Promise<Array>} Plans for the country
 */
export async function fetchCountryPlans(countryCode) {
  const client = ensureSupabase();

  // Normalize country code for matching
  const normalizedCode = countryCode.toLowerCase();
  const upperCode = countryCode.toUpperCase();

  const { data, error } = await client
    .from('dataplans')
    .select('*')
    .or(`country_id.eq.${normalizedCode},country_iso.eq.${upperCode}`)
    .eq('status', 'active')
    .eq('is_enabled', true)
    .order('price', { ascending: true });

  if (error) throw error;

  return (data || []).map(plan => ({
    ...plan,
    // Normalize field names for backward compatibility
    name: plan.name || plan.title,
    operator: plan.operator_name,
    data: plan.data_display || `${plan.data_amount_mb / 1024} GB`,
    validity: plan.validity_days,
    source: plan.provider || 'airalo'
  }));
}

/**
 * Fetch a single plan by ID
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Plan data
 */
export async function fetchPlanById(planId) {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('dataplans')
    .select(`
      *,
      plan_translations (
        language_code,
        name,
        title,
        short_info
      )
    `)
    .eq('id', planId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch plans with regional plan details
 * @param {string} countryCode - Country code
 * @returns {Promise<Array>} Plans with regional info
 */
export async function fetchCountryPlansWithRegional(countryCode) {
  const client = ensureSupabase();
  const normalizedCode = countryCode.toLowerCase();
  const upperCode = countryCode.toUpperCase();

  // Fetch direct country plans
  // Check both country_id (Airalo slug like "albania") and country_iso (ISO code like "AL")
  const { data: directPlans, error: directError } = await client
    .from('dataplans')
    .select('*')
    .or(`country_id.eq.${normalizedCode},country_iso.eq.${upperCode}`)
    .eq('status', 'active')
    .eq('is_enabled', true)
    .order('price', { ascending: true });

  if (directError) throw directError;

  // Fetch regional plans that include this country
  // regional_plan_countries uses country_id which should match countries.id (lowercase ISO)
  const { data: regionalPlanCountries, error: regionalError } = await client
    .from('regional_plan_countries')
    .select(`
      regional_plan_id,
      dataplans!inner (
        *
      )
    `)
    .eq('country_id', normalizedCode);

  if (regionalError) {
    console.warn('Could not fetch regional plans:', regionalError);
    return directPlans || [];
  }

  // Extract regional plans
  const regionalPlans = (regionalPlanCountries || [])
    .map(rpc => rpc.dataplans)
    .filter(Boolean);

  // Combine and deduplicate
  const allPlans = [...(directPlans || []), ...regionalPlans];
  const uniquePlans = allPlans.filter((plan, index, self) =>
    index === self.findIndex(p => p.id === plan.id)
  );

  return uniquePlans.map(plan => ({
    ...plan,
    name: plan.name || plan.title,
    operator: plan.operator_name,
    data: plan.data_display || `${plan.data_amount_mb / 1024} GB`,
    validity: plan.validity_days,
    source: plan.provider || 'airalo',
    isRegional: plan.is_regional || false
  }));
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Update plan price in Supabase
 * @param {string} planId - Plan ID
 * @param {number} newPrice - New price value
 * @param {string} userId - User performing the update
 * @returns {Promise<Object>} Updated plan
 */
export async function updatePlanPrice(planId, newPrice, userId) {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('dataplans')
    .update({
      price: parseFloat(newPrice),
      updated_at: new Date().toISOString()
    })
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update plan details
 * @param {string} planId - Plan ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated plan
 */
export async function updatePlan(planId, updates) {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('dataplans')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Toggle plan enabled status
 * @param {string} planId - Plan ID
 * @param {boolean} isEnabled - New enabled state
 * @returns {Promise<Object>} Updated plan
 */
export async function togglePlanEnabled(planId, isEnabled) {
  return updatePlan(planId, { is_enabled: isEnabled });
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete a plan from Supabase
 * @param {string} planId - Plan ID
 * @returns {Promise<void>}
 */
export async function deletePlan(planId) {
  const client = ensureSupabase();

  // Delete related translations first
  const { error: transError } = await client
    .from('plan_translations')
    .delete()
    .eq('plan_id', planId);

  if (transError) {
    console.warn('Error deleting plan translations:', transError);
  }

  // Delete from regional_plan_countries if exists
  const { error: regionalError } = await client
    .from('regional_plan_countries')
    .delete()
    .eq('regional_plan_id', planId);

  if (regionalError) {
    console.warn('Error deleting regional plan countries:', regionalError);
  }

  // Delete from regional_plans if exists
  const { error: rpError } = await client
    .from('regional_plans')
    .delete()
    .eq('id', planId);

  if (rpError) {
    console.warn('Error deleting from regional_plans:', rpError);
  }

  // Delete the plan itself
  const { error } = await client
    .from('dataplans')
    .delete()
    .eq('id', planId);

  if (error) throw error;
}

/**
 * Soft delete (disable) a plan
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Updated plan
 */
export async function softDeletePlan(planId) {
  return updatePlan(planId, {
    is_enabled: false,
    status: 'inactive'
  });
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Update prices for multiple plans
 * @param {Array<{id: string, price: number}>} planUpdates - Array of plan updates
 * @returns {Promise<Object>} Summary of updates
 */
export async function bulkUpdatePrices(planUpdates) {
  const client = ensureSupabase();
  let successCount = 0;
  let errorCount = 0;

  for (const update of planUpdates) {
    try {
      await updatePlanPrice(update.id, update.price);
      successCount++;
    } catch (error) {
      console.error(`Failed to update plan ${update.id}:`, error);
      errorCount++;
    }
  }

  return { successCount, errorCount };
}

// ============================================================================
// STATS OPERATIONS
// ============================================================================

/**
 * Get plan statistics for a country
 * @param {string} countryCode - Country code
 * @returns {Promise<Object>} Stats object
 */
export async function getCountryPlanStats(countryCode) {
  const client = ensureSupabase();
  const normalizedCode = countryCode.toLowerCase();

  const { data, error } = await client
    .from('dataplans')
    .select('id, price')
    .eq('country_id', normalizedCode)
    .eq('status', 'active')
    .eq('is_enabled', true);

  if (error) throw error;

  const plans = data || [];
  const prices = plans.map(p => parseFloat(p.price)).filter(p => p > 0);

  return {
    planCount: plans.length,
    minPrice: prices.length > 0 ? Math.min(...prices) : null,
    maxPrice: prices.length > 0 ? Math.max(...prices) : null,
    avgPrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null
  };
}
