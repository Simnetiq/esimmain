'use client';

import { useState, useCallback } from 'react';

/**
 * useFraudCheck Hook
 * 
 * Provides fraud checking functionality before checkout.
 * 
 * Usage:
 * ```jsx
 * const { 
 *   isBlocked, 
 *   blockData, 
 *   checkFraudStatus, 
 *   loading 
 * } = useFraudCheck();
 * 
 * // Check before checkout
 * const handleCheckout = async () => {
 *   const result = await checkFraudStatus(userId, email);
 *   if (result.blocked) {
 *     // Show blocked modal
 *     return;
 *   }
 *   // Proceed with checkout
 * };
 * ```
 */
export function useFraudCheck() {
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockData, setBlockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState(null);

  /**
   * Check fraud status for a user
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {string} cardFingerprint - Optional card fingerprint from previous payment
   * @returns {Promise<Object>} - { allowed, blocked, blockType, message, etc. }
   */
  const checkFraudStatus = useCallback(async (userId, email, cardFingerprint = null) => {
    setLoading(true);
    setWarning(null);

    try {
      const response = await fetch('/api/check-fraud-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email,
          cardFingerprint
        })
      });

      const data = await response.json();

      if (data.blocked) {
        setIsBlocked(true);
        setBlockData({
          blockType: data.blockType,
          message: data.message || data.reason,
          expiresAt: data.expiresAt,
          remainingHours: data.remainingHours,
          canContactSupport: data.canContactSupport !== false,
          userId,
          email
        });
        return { blocked: true, ...data };
      }

      // Check for warnings
      if (data.warning) {
        setWarning(data.warning);
      }

      setIsBlocked(false);
      setBlockData(null);
      return { blocked: false, allowed: true, warning: data.warning };

    } catch (error) {
      console.error('Error checking fraud status:', error);
      // Fail open - allow checkout on error
      setIsBlocked(false);
      setBlockData(null);
      return { blocked: false, allowed: true, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear the blocked state (e.g., when modal is closed)
   */
  const clearBlockedState = useCallback(() => {
    setIsBlocked(false);
    setBlockData(null);
    setWarning(null);
  }, []);

  /**
   * Handle payment error responses that indicate fraud blocking
   * @param {Object} errorResponse - Error response from payment API
   * @returns {boolean} - Whether this was a fraud block error
   */
  const handlePaymentError = useCallback((errorResponse) => {
    if (
      errorResponse.code === 'FRAUD_BLOCKED' ||
      errorResponse.code === 'BLOCKED' ||
      errorResponse.code === 'COUNTRY_BLOCKED' ||
      errorResponse.blockType
    ) {
      setIsBlocked(true);
      setBlockData({
        blockType: errorResponse.blockType || 'temporary',
        message: errorResponse.supportMessage || errorResponse.error || errorResponse.message,
        expiresAt: errorResponse.expiresAt,
        remainingHours: errorResponse.remainingHours,
        canContactSupport: errorResponse.canContactSupport !== false
      });
      return true;
    }
    return false;
  }, []);

  return {
    isBlocked,
    blockData,
    warning,
    loading,
    checkFraudStatus,
    clearBlockedState,
    handlePaymentError
  };
}

export default useFraudCheck;
