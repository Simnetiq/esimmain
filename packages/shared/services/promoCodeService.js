/**
 * Promo Code Service - Supabase version
 */

import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

export const getAllPromoCodes = async () => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      discountPercentage: row.discount_percentage,
      countries: row.countries || [],
      validFrom: row.valid_from ? new Date(row.valid_from) : null,
      validUntil: row.valid_until ? new Date(row.valid_until) : null,
      enabled: row.enabled,
      usageCount: row.usage_count || 0,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      createdBy: row.created_by
    }));
  } catch (error) {
    console.error('Error getting promo codes:', error);
    throw error;
  }
};

export const getActivePromoCodes = async () => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('enabled', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const now = new Date();
    return (data || [])
      .map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        discountPercentage: row.discount_percentage,
        countries: row.countries || [],
        validFrom: row.valid_from ? new Date(row.valid_from) : null,
        validUntil: row.valid_until ? new Date(row.valid_until) : null,
        enabled: row.enabled,
        usageCount: row.usage_count || 0,
        createdAt: row.created_at ? new Date(row.created_at) : null,
        createdBy: row.created_by
      }))
      .filter(code => {
        const validFrom = code.validFrom || new Date(0);
        const validUntil = code.validUntil || new Date('2099-12-31');
        return now >= validFrom && now <= validUntil;
      });
  } catch (error) {
    console.error('Error getting active promo codes:', error);
    throw error;
  }
};

export const getPromoCodeByCode = async (code) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    const row = data[0];
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      discountPercentage: row.discount_percentage,
      countries: row.countries || [],
      validFrom: row.valid_from ? new Date(row.valid_from) : null,
      validUntil: row.valid_until ? new Date(row.valid_until) : null,
      enabled: row.enabled,
      usageCount: row.usage_count || 0,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      createdBy: row.created_by
    };
  } catch (error) {
    console.error('Error getting promo code:', error);
    throw error;
  }
};

export const validatePromoCode = async (code, countryCode) => {
  try {
    const promoCode = await getPromoCodeByCode(code);

    if (!promoCode) return { valid: false, error: 'Promo code not found' };
    if (!promoCode.enabled) return { valid: false, error: 'Promo code is not active' };

    const now = new Date();
    const validFrom = promoCode.validFrom || new Date(0);
    const validUntil = promoCode.validUntil || new Date('2099-12-31');

    if (now < validFrom) return { valid: false, error: 'Promo code is not yet active' };
    if (now > validUntil) return { valid: false, error: 'Promo code has expired' };

    if (promoCode.countries && promoCode.countries.length > 0) {
      if (!promoCode.countries.includes(countryCode)) {
        return { valid: false, error: 'Promo code is not valid for this country' };
      }
    }

    return {
      valid: true,
      promoCode,
      discountPercentage: promoCode.discountPercentage,
      code: promoCode.code
    };
  } catch (error) {
    console.error('Error validating promo code:', error);
    return { valid: false, error: 'Error validating promo code' };
  }
};

export const createPromoCode = async (promoData) => {
  try {
    const supabase = getSupabase();

    const promoCode = {
      code: promoData.code.toUpperCase().trim(),
      name: promoData.name || promoData.code,
      discount_percentage: parseFloat(promoData.discountPercentage) || 0,
      countries: promoData.countries || [],
      valid_from: promoData.validFrom ? new Date(promoData.validFrom).toISOString() : null,
      valid_until: promoData.validUntil ? new Date(promoData.validUntil).toISOString() : null,
      enabled: promoData.enabled !== false,
      usage_count: 0,
      created_by: promoData.createdBy || 'admin'
    };

    const { data, error } = await supabase
      .from('promo_codes')
      .insert(promoCode)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    return { success: true, id: data.id, promoCode: { id: data.id, ...promoCode } };
  } catch (error) {
    console.error('Error creating promo code:', error);
    return { success: false, error: error.message };
  }
};

export const updatePromoCode = async (promoId, updateData) => {
  try {
    const supabase = getSupabase();
    const updates = { updated_at: new Date().toISOString() };

    if (updateData.code !== undefined) updates.code = updateData.code.toUpperCase().trim();
    if (updateData.name !== undefined) updates.name = updateData.name;
    if (updateData.discountPercentage !== undefined) updates.discount_percentage = parseFloat(updateData.discountPercentage);
    if (updateData.countries !== undefined) updates.countries = updateData.countries;
    if (updateData.validFrom !== undefined) updates.valid_from = updateData.validFrom ? new Date(updateData.validFrom).toISOString() : null;
    if (updateData.validUntil !== undefined) updates.valid_until = updateData.validUntil ? new Date(updateData.validUntil).toISOString() : null;
    if (updateData.enabled !== undefined) updates.enabled = updateData.enabled;

    const { error } = await supabase
      .from('promo_codes')
      .update(updates)
      .eq('id', promoId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('Error updating promo code:', error);
    return { success: false, error: error.message };
  }
};

export const deletePromoCode = async (promoId) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('promo_codes').delete().eq('id', promoId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('Error deleting promo code:', error);
    return { success: false, error: error.message };
  }
};

export const togglePromoCode = async (promoId, enabled) => {
  return updatePromoCode(promoId, { enabled });
};

export const incrementPromoCodeUsage = async (promoId) => {
  try {
    const supabase = getSupabase();

    // First get current count
    const { data: current, error: fetchError } = await supabase
      .from('promo_codes')
      .select('usage_count')
      .eq('id', promoId)
      .single();

    if (fetchError) return { success: false, error: 'Promo code not found' };

    const { error } = await supabase
      .from('promo_codes')
      .update({
        usage_count: (current.usage_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', promoId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('Error incrementing promo code usage:', error);
    return { success: false, error: error.message };
  }
};

export const getPromoCodesForCountry = async (countryCode) => {
  try {
    const activeCodes = await getActivePromoCodes();
    return activeCodes.filter(code => {
      if (!code.countries || code.countries.length === 0) return true;
      return code.countries.includes(countryCode);
    });
  } catch (error) {
    console.error('Error getting promo codes for country:', error);
    throw error;
  }
};

export default {
  getAllPromoCodes,
  getActivePromoCodes,
  getPromoCodeByCode,
  validatePromoCode,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  togglePromoCode,
  incrementPromoCodeUsage,
  getPromoCodesForCountry
};
