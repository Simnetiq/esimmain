/**
 * promoCodeService.js — CLIENT-SAFE promo code operations.
 *
 * Uses the anon Supabase client. Suitable for admin UI and read operations.
 * For server-side validation and redemption → use promoServerService.js.
 *
 * Actual DB column mapping (promo_codes table):
 *   DB column          ↔  JS field
 *   ─────────────────────────────────────────
 *   discount_value     ↔  discountPercentage  (when discount_type = 'percentage')
 *   is_active          ↔  enabled
 *   current_uses       ↔  usageCount
 *   expires_at         ↔  validUntil
 *   valid_from         ↔  validFrom           (new column)
 *   max_uses           ↔  maxGlobalUses
 *   max_uses_per_user  ↔  maxUsesPerUser      (new column)
 *   min_purchase       ↔  minOrderAmount
 *   countries          ↔  countries           (new column)
 *   applicable_plans   ↔  applicablePlans
 */

import { getSupabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Mapper: DB row → JS object
// ─────────────────────────────────────────────────────────────────────────────
function mapRow(row) {
  return {
    id:                row.id,
    code:              row.code,
    name:              row.name || row.code,
    discountType:      row.discount_type || 'percentage',
    discountPercentage: row.discount_type === 'percentage' ? parseFloat(row.discount_value || 0) : 0,
    discountValue:     parseFloat(row.discount_value || 0),
    countries:         row.countries || [],
    applicablePlans:   row.applicable_plans || [],
    validFrom:         row.valid_from   ? new Date(row.valid_from)   : null,
    validUntil:        row.expires_at   ? new Date(row.expires_at)   : null,
    enabled:           row.is_active ?? true,
    usageCount:        row.current_uses || 0,
    maxGlobalUses:     row.max_uses ?? null,
    maxUsesPerUser:    row.max_uses_per_user ?? null,
    minOrderAmount:    row.min_purchase != null ? parseFloat(row.min_purchase) : null,
    metadata:          row.metadata || {},
    createdAt:         row.created_at ? new Date(row.created_at) : null,
    updatedAt:         row.updated_at ? new Date(row.updated_at) : null,
    createdBy:         row.created_by,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

export const getAllPromoCodes = async () => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRow);
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
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const now = new Date();
    return (data || [])
      .map(mapRow)
      .filter((code) => {
        const validFrom  = code.validFrom  || new Date(0);
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
      .eq('code', code.toUpperCase().trim())
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return null;
    return mapRow(data[0]);
  } catch (error) {
    console.error('Error getting promo code:', error);
    throw error;
  }
};

export const getPromoCodesForCountry = async (countryCode) => {
  try {
    const activeCodes = await getActivePromoCodes();
    return activeCodes.filter((code) => {
      if (!code.countries || code.countries.length === 0) return true;
      return code.countries.includes(countryCode.toUpperCase());
    });
  } catch (error) {
    console.error('Error getting promo codes for country:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// WRITE (admin only — for read-only client builds, skip these)
// ─────────────────────────────────────────────────────────────────────────────

export const createPromoCode = async (promoData) => {
  try {
    const supabase = getSupabase();

    const row = {
      code:              promoData.code.toUpperCase().trim(),
      name:              promoData.name || promoData.code,
      discount_type:     promoData.discountType || 'percentage',
      discount_value:    parseFloat(promoData.discountPercentage || promoData.discountValue || 0),
      countries:         promoData.countries || [],
      applicable_plans:  promoData.applicablePlans || [],
      valid_from:        promoData.validFrom  ? new Date(promoData.validFrom).toISOString()  : null,
      expires_at:        promoData.validUntil ? new Date(promoData.validUntil).toISOString() : null,
      is_active:         promoData.enabled !== false,
      current_uses:      0,
      max_uses:          promoData.maxGlobalUses   != null ? parseInt(promoData.maxGlobalUses)   : null,
      max_uses_per_user: promoData.maxUsesPerUser  != null ? parseInt(promoData.maxUsesPerUser)  : null,
      min_purchase:      promoData.minOrderAmount  != null ? parseFloat(promoData.minOrderAmount) : null,
      created_by:        promoData.createdBy || null,
    };

    const { data, error } = await supabase
      .from('promo_codes')
      .insert(row)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, id: data.id, promoCode: mapRow(data) };
  } catch (error) {
    console.error('Error creating promo code:', error);
    return { success: false, error: error.message };
  }
};

export const updatePromoCode = async (promoId, updateData) => {
  try {
    const supabase = getSupabase();
    const updates = { updated_at: new Date().toISOString() };

    if (updateData.code              !== undefined) updates.code              = updateData.code.toUpperCase().trim();
    if (updateData.name              !== undefined) updates.name              = updateData.name;
    if (updateData.discountType      !== undefined) updates.discount_type     = updateData.discountType;
    if (updateData.discountPercentage !== undefined) updates.discount_value   = parseFloat(updateData.discountPercentage);
    if (updateData.discountValue     !== undefined) updates.discount_value    = parseFloat(updateData.discountValue);
    if (updateData.countries         !== undefined) updates.countries         = updateData.countries;
    if (updateData.applicablePlans   !== undefined) updates.applicable_plans  = updateData.applicablePlans;
    if (updateData.validFrom         !== undefined) updates.valid_from        = updateData.validFrom ? new Date(updateData.validFrom).toISOString() : null;
    if (updateData.validUntil        !== undefined) updates.expires_at        = updateData.validUntil ? new Date(updateData.validUntil).toISOString() : null;
    if (updateData.enabled           !== undefined) updates.is_active         = updateData.enabled;
    if (updateData.maxGlobalUses     !== undefined) updates.max_uses          = updateData.maxGlobalUses != null ? parseInt(updateData.maxGlobalUses) : null;
    if (updateData.maxUsesPerUser    !== undefined) updates.max_uses_per_user = updateData.maxUsesPerUser != null ? parseInt(updateData.maxUsesPerUser) : null;
    if (updateData.minOrderAmount    !== undefined) updates.min_purchase      = updateData.minOrderAmount != null ? parseFloat(updateData.minOrderAmount) : null;

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

export default {
  getAllPromoCodes,
  getActivePromoCodes,
  getPromoCodeByCode,
  getPromoCodesForCountry,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  togglePromoCode,
};
