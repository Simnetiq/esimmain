'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, CheckCircle, AlertCircle } from 'lucide-react';
import { isValidReferralCode, hasUserUsedReferralCode } from '@esim/shared/services/referralService';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getSupabase } from '@esim/shared/lib/supabase';
import toast from 'react-hot-toast';

const ReferralBottomSheet = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const [referralCode, setReferralCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUsedReferral, setHasUsedReferral] = useState(false);
  const { currentUser, loadUserProfile } = useAuth();

  // Check if user has already used a referral code
  useEffect(() => {
    const checkReferralStatus = async () => {
      if (currentUser && isOpen) {
        try {
          const hasUsed = await hasUserUsedReferralCode(currentUser.uid);
          setHasUsedReferral(hasUsed);
        } catch (error) {
          console.error('Error checking referral status:', error);
        } finally {
        }
      }
    };

    checkReferralStatus();
  }, [currentUser, isOpen]);

  const validateReferralCode = async (code) => {
    if (!code.trim()) {
      setIsValid(false);
      setValidationError('');
      return;
    }

    setIsValidating(true);
    setValidationError('');

    try {
      const isValidCode = await isValidReferralCode(code.trim().toUpperCase());
      setIsValid(isValidCode);

      if (!isValidCode) {
        setValidationError(t('referral.invalidOrExpired', 'Invalid or expired referral code'));
      }
    } catch (error) {
      console.error('Error validating referral code:', error);
      setIsValid(false);
      setValidationError(t('referral.validatingError', 'Error validating referral code'));
    } finally {
      setIsValidating(false);
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.toUpperCase();
    setReferralCode(value);
    
    // Clear previous validation
    setIsValid(false);
    setValidationError('');
    
    // Validate after a short delay
    if (value.length >= 3) {
      const timeoutId = setTimeout(() => {
        validateReferralCode(value);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  };

  const handleApply = async () => {
    if (!referralCode.trim()) {
      toast.error(t('referral.pleaseEnterCode', 'Please enter a referral code'));
      return;
    }

    if (!isValid) {
      toast.error(t('referral.pleaseEnterValidCode', 'Please enter a valid referral code'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Process referral code usage
      const { processReferralUsage } = await import('@esim/shared/services/referralService');
      const result = await processReferralUsage(referralCode.trim().toUpperCase(), currentUser.uid);
      
      if (result.success) {
        // Update user profile to mark referral code as used
        const supabase = getSupabase();
        await supabase.from('users').update({
          referralCodeUsed: true,
          referredBy: referralCode.trim().toUpperCase()
        }).eq('id', currentUser.uid);

        // Reload user profile to reflect changes
        await loadUserProfile();

        toast.success(t('referral.appliedSuccessfully', 'Referral code applied successfully!'));
        onClose();
      } else {
        toast.error(result.error || t('referral.failedToApply', 'Failed to apply referral code'));
      }
    } catch {
      console.error('Error applying referral code:');
      toast.error(t('referral.failedToApply', 'Failed to apply referral code'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReferralCode('');
    setIsValid(false);
    setValidationError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={handleClose}
          >
            {/* Centered Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="text-center p-6 pb-4">
                <div className="bg-tufts-blue/10 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Gift className="w-8 h-8 text-tufts-blue" />
                </div>
                <h2 className="text-xl font-medium tracking-tight text-eerie-black mb-2">{t('referral.applyReferralCode', 'Apply Referral Code')}</h2>
                <p className="text-cool-black">{t('referral.enterCodeForRewards', 'Enter a referral code to get rewards')}</p>
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                <div className="space-y-6">
                  {/* Referral Code Input */}
                  <div>
                    <label className="block text-sm font-medium text-cool-black mb-2">
                      {t('referral.referralCode', 'Referral Code')}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={referralCode}
                        onChange={handleCodeChange}
                        placeholder={t('referral.enterReferralCode', 'Enter referral code')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tufts-blue focus:border-transparent text-center text-lg font-mono tracking-wider"
                        maxLength={8}
                        disabled={hasUsedReferral}
                      />
                      {isValidating && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-tufts-blue"></div>
                        </div>
                      )}
                      {isValid && !isValidating && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                      )}
                      {validationError && !isValidating && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                      )}
                    </div>
                    
                    {validationError && (
                      <p className="text-red-600 text-sm mt-2">{validationError}</p>
                    )}
                    
                    {isValid && (
                      <p className="text-green-600 text-sm mt-2">✓ {t('referral.validCode', 'Valid referral code!')}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {!hasUsedReferral && (
                      <button
                        onClick={handleApply}
                        disabled={isSubmitting || isValidating || (referralCode && !isValid)}
                        className="w-full bg-tufts-blue hover:bg-cobalt-blue disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg text-white font-medium transition-colors"
                      >
                        {isSubmitting ? t('referral.applying', 'Applying...') : t('referral.apply', 'Apply Referral Code')}
                      </button>
                    )}

                    <button
                      onClick={handleClose}
                      className="w-full bg-gray-100 hover:bg-gray-200 px-6 py-3 rounded-lg text-cool-black font-medium transition-colors"
                    >
                      {t('referral.cancel', 'Cancel')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Close button in top right */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-cool-black" />
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ReferralBottomSheet;
