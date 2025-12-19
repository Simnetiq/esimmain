/**
 * Promo Code Service
 * Manages promotional codes with country-specific targeting and date-based validity
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Get all promo codes
 * @returns {Promise<Array>} Array of promo codes
 */
export const getAllPromoCodes = async () => {
  try {
    const promoCodesRef = collection(db, 'promoCodes');
    const q = query(promoCodesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      validFrom: doc.data().validFrom?.toDate(),
      validUntil: doc.data().validUntil?.toDate(),
      createdAt: doc.data().createdAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting promo codes:', error);
    throw error;
  }
};

/**
 * Get active promo codes (currently valid)
 * @returns {Promise<Array>} Array of active promo codes
 */
export const getActivePromoCodes = async () => {
  try {
    const now = new Date();
    const promoCodesRef = collection(db, 'promoCodes');
    const q = query(
      promoCodesRef, 
      where('enabled', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    // Filter by date range in memory (Firestore doesn't support multiple range queries)
    const codes = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        validFrom: doc.data().validFrom?.toDate(),
        validUntil: doc.data().validUntil?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }))
      .filter(code => {
        const validFrom = code.validFrom || new Date(0);
        const validUntil = code.validUntil || new Date('2099-12-31');
        return now >= validFrom && now <= validUntil;
      });
    
    return codes;
  } catch (error) {
    console.error('Error getting active promo codes:', error);
    throw error;
  }
};

/**
 * Get promo code by code string
 * @param {string} code - The promo code string
 * @returns {Promise<Object|null>} Promo code object or null
 */
export const getPromoCodeByCode = async (code) => {
  try {
    const promoCodesRef = collection(db, 'promoCodes');
    const q = query(promoCodesRef, where('code', '==', code.toUpperCase()));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      validFrom: doc.data().validFrom?.toDate(),
      validUntil: doc.data().validUntil?.toDate(),
      createdAt: doc.data().createdAt?.toDate()
    };
  } catch (error) {
    console.error('Error getting promo code:', error);
    throw error;
  }
};

/**
 * Validate promo code for a specific country
 * @param {string} code - The promo code string
 * @param {string} countryCode - ISO country code (e.g., 'US', 'BR')
 * @returns {Promise<Object>} Validation result with discount info
 */
export const validatePromoCode = async (code, countryCode) => {
  try {
    const promoCode = await getPromoCodeByCode(code);
    
    if (!promoCode) {
      return { valid: false, error: 'Promo code not found' };
    }
    
    if (!promoCode.enabled) {
      return { valid: false, error: 'Promo code is not active' };
    }
    
    const now = new Date();
    const validFrom = promoCode.validFrom || new Date(0);
    const validUntil = promoCode.validUntil || new Date('2099-12-31');
    
    if (now < validFrom) {
      return { valid: false, error: 'Promo code is not yet active' };
    }
    
    if (now > validUntil) {
      return { valid: false, error: 'Promo code has expired' };
    }
    
    // Check country restriction
    if (promoCode.countries && promoCode.countries.length > 0) {
      if (!promoCode.countries.includes(countryCode)) {
        return { valid: false, error: 'Promo code is not valid for this country' };
      }
    }
    
    return {
      valid: true,
      promoCode: promoCode,
      discountPercentage: promoCode.discountPercentage,
      code: promoCode.code
    };
  } catch (error) {
    console.error('Error validating promo code:', error);
    return { valid: false, error: 'Error validating promo code' };
  }
};

/**
 * Create a new promo code
 * @param {Object} promoData - Promo code data
 * @returns {Promise<Object>} Created promo code
 */
export const createPromoCode = async (promoData) => {
  try {
    const promoId = `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const promoRef = doc(db, 'promoCodes', promoId);
    
    const promoCode = {
      code: promoData.code.toUpperCase().trim(),
      name: promoData.name || promoData.code,
      discountPercentage: parseFloat(promoData.discountPercentage) || 0,
      countries: promoData.countries || [], // Empty = all countries
      validFrom: promoData.validFrom ? Timestamp.fromDate(new Date(promoData.validFrom)) : null,
      validUntil: promoData.validUntil ? Timestamp.fromDate(new Date(promoData.validUntil)) : null,
      enabled: promoData.enabled !== false,
      usageCount: 0,
      createdAt: serverTimestamp(),
      createdBy: promoData.createdBy || 'admin'
    };
    
    await setDoc(promoRef, promoCode);
    
    return { 
      success: true, 
      id: promoId,
      promoCode: { id: promoId, ...promoCode }
    };
  } catch (error) {
    console.error('Error creating promo code:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update a promo code
 * @param {string} promoId - Promo code ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Update result
 */
export const updatePromoCode = async (promoId, updateData) => {
  try {
    const promoRef = doc(db, 'promoCodes', promoId);
    
    const updates = {
      updatedAt: serverTimestamp()
    };
    
    if (updateData.code !== undefined) {
      updates.code = updateData.code.toUpperCase().trim();
    }
    if (updateData.name !== undefined) {
      updates.name = updateData.name;
    }
    if (updateData.discountPercentage !== undefined) {
      updates.discountPercentage = parseFloat(updateData.discountPercentage);
    }
    if (updateData.countries !== undefined) {
      updates.countries = updateData.countries;
    }
    if (updateData.validFrom !== undefined) {
      updates.validFrom = updateData.validFrom ? Timestamp.fromDate(new Date(updateData.validFrom)) : null;
    }
    if (updateData.validUntil !== undefined) {
      updates.validUntil = updateData.validUntil ? Timestamp.fromDate(new Date(updateData.validUntil)) : null;
    }
    if (updateData.enabled !== undefined) {
      updates.enabled = updateData.enabled;
    }
    
    await updateDoc(promoRef, updates);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating promo code:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a promo code
 * @param {string} promoId - Promo code ID
 * @returns {Promise<Object>} Delete result
 */
export const deletePromoCode = async (promoId) => {
  try {
    const promoRef = doc(db, 'promoCodes', promoId);
    await deleteDoc(promoRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting promo code:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Toggle promo code enabled status
 * @param {string} promoId - Promo code ID
 * @param {boolean} enabled - New enabled status
 * @returns {Promise<Object>} Update result
 */
export const togglePromoCode = async (promoId, enabled) => {
  return updatePromoCode(promoId, { enabled });
};

/**
 * Increment usage count for a promo code
 * @param {string} promoId - Promo code ID
 * @returns {Promise<Object>} Update result
 */
export const incrementPromoCodeUsage = async (promoId) => {
  try {
    const promoRef = doc(db, 'promoCodes', promoId);
    const promoDoc = await getDoc(promoRef);
    
    if (!promoDoc.exists()) {
      return { success: false, error: 'Promo code not found' };
    }
    
    const currentCount = promoDoc.data().usageCount || 0;
    await updateDoc(promoRef, { 
      usageCount: currentCount + 1,
      lastUsedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error incrementing promo code usage:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get promo codes for a specific country
 * @param {string} countryCode - ISO country code
 * @returns {Promise<Array>} Array of valid promo codes for the country
 */
export const getPromoCodesForCountry = async (countryCode) => {
  try {
    const activeCodes = await getActivePromoCodes();
    
    // Filter codes that apply to this country (or have no country restriction)
    return activeCodes.filter(code => {
      if (!code.countries || code.countries.length === 0) {
        return true; // No restriction = applies to all
      }
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





