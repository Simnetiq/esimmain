'use client';

import { useQuery } from '@tanstack/react-query';
import { getSupabase, isSupabaseAvailable } from '../lib/supabase';
import { transformPlanToViewModel } from '../services/plansServiceSupabase';

/**
 * Fetch a single plan by ID from Supabase
 * @param {string} planId - The plan ID (e.g., "connect-cambodia-in-5days-unlimited")
 * @returns {Promise<Object|null>} Plan view model or null if not found
 */
export async function fetchPlanById(planId) {
  if (!planId || !isSupabaseAvailable()) {
    return null;
  }

  const supabase = getSupabase();

  // Fetch plan with all fields including operator info
  const { data, error } = await supabase
    .from('dataplans')
    .select('*')
    .eq('id', planId)
    .eq('status', 'active')
    .eq('is_enabled', true)
    .single();

  if (error) {
    // Handle "no rows returned" gracefully
    if (error.code === 'PGRST116') {
      console.warn(`[fetchPlanById] Plan not found: ${planId}`);
      return null;
    }
    console.error('[fetchPlanById] Error:', error);
    throw error;
  }

  if (!data) {
    return null;
  }

  // Transform to view model with all operator/coverage data
  return transformPlanToViewModel(data);
}

/**
 * Fetch a single plan by ID with fallback search
 * Tries exact ID match first, then searches by slug patterns
 * @param {string} planId - The plan ID or slug
 * @returns {Promise<Object|null>} Plan view model or null if not found
 */
export async function fetchPlanByIdWithFallback(planId) {
  if (!planId || !isSupabaseAvailable()) {
    return null;
  }

  // Try exact ID match first
  const exactMatch = await fetchPlanById(planId);
  if (exactMatch) {
    return exactMatch;
  }

  // Try fallback search by name/slug patterns
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('dataplans')
    .select('*')
    .eq('status', 'active')
    .eq('is_enabled', true)
    .neq('package_type', 'topup')
    .or(`name.ilike.%${planId}%,country_id.ilike.%${planId}%`)
    .order('price', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    console.warn(`[fetchPlanByIdWithFallback] No plan found for: ${planId}`);
    return null;
  }

  return transformPlanToViewModel(data);
}

/**
 * Hook to fetch a single plan by ID from Supabase
 * @param {string} planId - The plan ID
 * @param {Object} options - Query options
 * @returns {{
 *   plan: Object|null,
 *   isLoading: boolean,
 *   error: Error|null,
 *   refetch: Function
 * }}
 */
export function usePlanSupabase(planId, options = {}) {
  const { enableFallback = false } = options;

  const {
    data: plan,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['plan-supabase', planId],
    queryFn: () => enableFallback
      ? fetchPlanByIdWithFallback(planId)
      : fetchPlanById(planId),
    enabled: !!planId && isSupabaseAvailable(),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  return {
    plan: plan || null,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook to fetch multiple plans by IDs
 * @param {string[]} planIds - Array of plan IDs
 * @returns {{
 *   plans: Object[],
 *   isLoading: boolean,
 *   error: Error|null
 * }}
 */
export function usePlansSupabase(planIds) {
  const {
    data: plans,
    isLoading,
    error
  } = useQuery({
    queryKey: ['plans-supabase', planIds],
    queryFn: async () => {
      if (!planIds || planIds.length === 0 || !isSupabaseAvailable()) {
        return [];
      }

      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('dataplans')
        .select('*')
        .in('id', planIds)
        .eq('status', 'active')
        .eq('is_enabled', true)
        .neq('package_type', 'topup');

      if (error) {
        console.error('[usePlansSupabase] Error:', error);
        throw error;
      }

      return (data || []).map(transformPlanToViewModel);
    },
    enabled: Array.isArray(planIds) && planIds.length > 0 && isSupabaseAvailable(),
    retry: 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  return {
    plans: plans || [],
    isLoading,
    error
  };
}

export default usePlanSupabase;
