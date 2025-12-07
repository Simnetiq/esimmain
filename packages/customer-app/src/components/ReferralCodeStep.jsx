'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Gift, CheckCircle, X } from 'lucide-react';
import { isValidReferralCode, hasUserUsedReferralCode } from '@esim/shared/services/referralService';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import toast from 'react-hot-toast';

const ReferralCodeStep = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeGoogleSignup, currentUser } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUsedReferral, setHasUsedReferral] = useState(false);

  // Get user data from URL params (passed from registration)
  const email = searchParams.get('email');
  const name = searchParams.get('name');
  const isGoogleSignup = searchParams.get('google') === 'true';

  useEffect(() => {
    // If no email/name, redirect to register
    if (!email || !name) {
      router.push('/register');
    }
  }, [email, name, router]);

  // Check if user has already used a referral code
  useEffect(() => {
    const checkReferralStatus = async () => {
      if (currentUser) {
        try {
          const hasUsed = await hasUserUsedReferralCode(currentUser.uid);
          setHasUsedReferral(hasUsed);
        } catch {
        } finally {
        }
      }
    };

    checkReferralStatus();
  }, [currentUser]);

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
        setValidationError('Invalid or expired referral code');
      }
    } catch {
      setIsValid(false);
      setValidationError('Error validating referral code');
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

  const handleSkip = async () => {
    // Store user data and proceed to email verification
    const userData = {
      email,
      name,
      referralCode: null,
      isGoogleSignup
    };
    
    localStorage.setItem('pendingUserData', JSON.stringify(userData));
    
    // Save English as preferred language
    if (typeof window !== 'undefined') {
      localStorage.setItem('Simnetiq-language', 'en');
    }
    
    if (isGoogleSignup) {
      // For Google signup, complete the signup process
      try {
        await completeGoogleSignup();
        router.push('/dashboard');
      } catch {
        toast.error('Failed to complete signup');
      }
    } else {
      // For regular signup, go to email verification
      router.push(`/verify-email?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!referralCode.trim()) {
      toast.error('Please enter a referral code or skip this step');
      return;
    }

    if (!isValid) {
      toast.error('Please enter a valid referral code');
      return;
    }

    setIsSubmitting(true);

    try {
      // Store user data with referral code
      const userData = {
        email,
        name,
        referralCode: referralCode.trim().toUpperCase(),
        isGoogleSignup
      };
      
      localStorage.setItem('pendingUserData', JSON.stringify(userData));
      
      // Save English as preferred language
      if (typeof window !== 'undefined') {
        localStorage.setItem('Simnetiq-language', 'en');
      }
      
      toast.success('Referral code applied successfully!');
      
      if (isGoogleSignup) {
        // For Google signup, complete the signup process
        try {
          await completeGoogleSignup();
          router.push(`/hot-deals?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&referralCode=${encodeURIComponent(referralCode.trim().toUpperCase())}`);
        } catch {
          toast.error('Failed to complete signup');
        }
      } else {
        // For regular signup, go to email verification
        router.push(`/verify-email?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&referralCode=${encodeURIComponent(referralCode.trim().toUpperCase())}`);
      }
    } catch {
      toast.error('Failed to apply referral code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-8">
      {/* Header */}
      <section className="bg-white py-8">
        <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
          <div className="relative">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-6 pb-6">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-cool-black" />
                  </button>
                  <div>
                    <h1 className="text-xl font-medium tracking-tight text-eerie-black">Referral Code</h1>
                    <p className="text-sm text-cool-black">Optional step</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
          <div className="relative">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <div className="text-center mb-8">
                  <div className="bg-tufts-blue/10 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Gift className="w-10 h-10 text-tufts-blue" />
                  </div>
                  <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-2">Got a Referral Code?</h2>
                  <p className="text-cool-black">
                    Enter a referral code from a friend to get started with special benefits
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-cool-black mb-2">
                      Referral Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={referralCode}
                        onChange={handleCodeChange}
                        placeholder="Enter referral code"
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
                          <X className="w-5 h-5 text-red-600" />
                        </div>
                      )}
                    </div>
                    
                    {validationError && (
                      <p className="text-red-600 text-sm mt-2">{validationError}</p>
                    )}
                    
                    {isValid && (
                      <p className="text-green-600 text-sm mt-2">✓ Valid referral code!</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {!hasUsedReferral && (
                      <button
                        type="submit"
                        disabled={isSubmitting || isValidating || (referralCode && !isValid)}
                        className="w-full bg-tufts-blue hover:bg-cobalt-blue disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg text-white font-medium transition-colors"
                      >
                        {isSubmitting ? 'Applying...' : 'Apply Referral Code'}
                      </button>
                    )}
                    
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="w-full text-cool-black hover:text-eerie-black text-sm underline transition-colors"
                    >
                      Skip this step
                    </button>
                  </div>
                </form>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>
        </div>
      </section>

      {/* Spacing after content */}
      <div className="h-20"></div>
    </div>
  );
};

export default ReferralCodeStep;
