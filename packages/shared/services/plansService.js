/**
 * Plans Service - Supabase version
 */

import { getSupabase, isSupabaseAvailable } from '../lib/supabase';
import { formatPriceNumber } from '../utils/priceUtils';

const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  if (countryCode.includes('-') || countryCode.length > 2) return '🌍';
  try {
    const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  } catch (error) {
    return '🌍';
  }
};

export const getAllPlans = async () => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('dataplans')
      .select('*')
      .neq('package_type', 'topup');

    if (error) throw error;

    const allPlans = (data || []).map(row => ({ id: row.id, ...row }));
    return allPlans.filter(plan => plan.enabled !== false && plan.is_enabled !== false);
  } catch (error) {
    console.error('Error getting all plans:', error);
    throw error;
  }
};

export const getPlansCount = async () => {
  try {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from('dataplans')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting plans count:', error);
    return 0;
  }
};

export const getCountriesWithPricing = async () => {
  try {
    const supabase = getSupabase();
    const { data: countriesData, error: countriesError } = await supabase
      .from('countries')
      .select('*');

    if (countriesError) throw countriesError;

    const countries = (countriesData || []).map(row => ({
      id: row.id,
      ...row,
      flagEmoji: row.flagEmoji || row.flag_emoji || getFlagEmoji(row.code)
    }));

    const allPlans = await getAllPlans();

    const countriesWithPricing = countries.map(country => {
      const countryPlans = allPlans.filter(plan => {
        if (plan.country_codes && Array.isArray(plan.country_codes)) return plan.country_codes.includes(country.code);
        if (plan.country_ids && Array.isArray(plan.country_ids)) return plan.country_ids.includes(country.code);
        if (plan.country) return plan.country === country.name;
        return false;
      });

      const minPrice = countryPlans.length > 0
        ? Math.min(...countryPlans.map(plan => parseFloat(plan.price) || 999))
        : 999;

      return { ...country, minPrice, plansCount: countryPlans.length, plans: countryPlans };
    });

    return countriesWithPricing;
  } catch (error) {
    throw error;
  }
};

export const getPricingStats = async () => {
  try {
    const allPlans = await getAllPlans();

    if (allPlans.length === 0) {
      return { totalPlans: 0, totalCountries: 0, averagePrice: 0, minPrice: 0, maxPrice: 0 };
    }

    const prices = allPlans.map(plan => parseFloat(plan.price) || 0).filter(price => price > 0);
    const countries = new Set();

    allPlans.forEach(plan => {
      if (plan.country_codes) plan.country_codes.forEach(code => countries.add(code));
      if (plan.country_ids) plan.country_ids.forEach(id => countries.add(id));
      if (plan.country) countries.add(plan.country);
    });

    return {
      totalPlans: allPlans.length,
      totalCountries: countries.size,
      averagePrice: prices.length > 0 ? formatPriceNumber(prices.reduce((sum, price) => sum + price, 0) / prices.length) : '0.00',
      minPrice: prices.length > 0 ? formatPriceNumber(Math.min(...prices)) : '0.00',
      maxPrice: prices.length > 0 ? formatPriceNumber(Math.max(...prices)) : '0.00'
    };
  } catch (error) {
    throw error;
  }
};
