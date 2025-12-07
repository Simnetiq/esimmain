"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { validateOTPFormat } from '@esim/shared/utils/otpUtils';
import { detectLanguageFromPath } from '@esim/shared/utils/languageUtils';

const VerifyEmail = () => {
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const { verifyEmailOTP, currentUser } = useAuth();
  const { locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Security check: If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (currentUser) {
      const currentLanguage = locale || detectLanguageFromPath(pathname) || 'en';
      const dashboardUrl = currentLanguage === 'en' ? '/dashboard' : `/${currentLanguage}/dashboard`;
      router.push(dashboardUrl);
    }
  }, [currentUser, router, locale, pathname]);

  useEffect(() => {
    // Get email from URL params
    const emailParam = searchParams.get('email');
    
    if (emailParam) {
      setEmail(emailParam);
    }

    // Check if there's pending signup data
    const pendingSignupData = localStorage.getItem('pendingSignup');
    if (pendingSignupData) {
    } else {
    }

    // Check if there's pending user data from referral code step
    const pendingUserData = localStorage.getItem('pendingUserData');
    if (pendingUserData) {
      const userData = JSON.parse(pendingUserData);
      if (userData.email) setEmail(userData.email);
    }
  }, [searchParams]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!otp) {
      toast.error('Please enter the OTP');
      return;
    }

    if (!validateOTPFormat(otp)) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      
      // Use AuthContext's verifyEmailOTP function to create account
      await verifyEmailOTP(otp);
      
      setVerificationComplete(true);
      toast.success('Account created and email verified successfully!');
      
      // Save English as preferred language
      if (typeof window !== 'undefined') {
        localStorage.setItem('Simnetiq-language', 'en');
      }
      
      // Redirect to dashboard in current language
      setTimeout(() => {
        const currentLanguage = locale || detectLanguageFromPath(pathname) || 'en';
        const dashboardUrl = currentLanguage === 'en' ? '/dashboard' : `/${currentLanguage}/dashboard`;
        router.push(dashboardUrl);
      }, 2000);
      
    } catch { 
      toast.error('An error occurred during verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleBackToRegister = () => {
    const currentLanguage = locale || detectLanguageFromPath(pathname) || 'en';
    const registerUrl = currentLanguage === 'en' ? '/register' : `/${currentLanguage}/register`;
    router.push(registerUrl);
  };

  if (verificationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-8 text-center"
        >
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Email Verified!
            </h2>
            <p className="text-sm text-gray-600">
              Your email has been successfully verified. Redirecting to dashboard...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div>
          <button
            onClick={handleBackToRegister}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Register
          </button>
          
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Verify Your Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We&apos;ve sent a 6-digit verification code to your email address.
          </p>
          {email && (
            <p className="mt-1 text-center text-sm font-medium text-blue-600">
              {email}
            </p>
          )}
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
              Verification Code
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-600" />
              </div>
              <input
                id="otp"
                name="otp"
                type="text"
                maxLength="6"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center text-lg tracking-widest"
                placeholder="000000"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Enter the 6-digit code sent to your email
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading || !otp}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Verify Email'
              )}
            </button>
            
          </div>
        </form>

      </motion.div>
    </div>
  );
};

export default VerifyEmail;
