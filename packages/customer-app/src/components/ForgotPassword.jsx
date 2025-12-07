"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';

// Lazy load Lottie to reduce initial bundle size
const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
  loading: () => <div className="animate-pulse w-full h-full bg-gray-200 rounded-lg"></div>
});

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [animationData, setAnimationData] = useState(null);
  const [mounted, setMounted] = useState(false);
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  // Prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load Lottie animation
  useEffect(() => {
    fetch('/images/logo_icon/LoginCharacterAnimation.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(() => {});
  }, []);

  // Get current language for localized URLs - prioritize locale from context
  const currentLanguage = React.useMemo(() => {
    try {
      // Wait for I18n to initialize before using locale
      if (i18nLoading) {
        // While loading, use localStorage or pathname detection
        if (typeof window !== 'undefined') {
          const savedLanguage = localStorage.getItem('Simnetiq-language');
          if (savedLanguage) return savedLanguage;
        }
        return detectLanguageFromPath(pathname) || 'en';
      }
      // Once loaded, prioritize locale from I18nContext
      return locale || 'en';
    } catch {
      return 'en';
    }
  }, [locale, pathname, i18nLoading]);

  const isRTL = mounted ? getLanguageDirection(currentLanguage) === 'rtl' : false;

  const getLocalizedUrl = (path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Sanitize input
    const normalizedEmail = (email || '').trim().toLowerCase();
    
    if (!normalizedEmail) {
      toast.error(t('auth.forgotPassword.enterEmail', 'Please enter your email address'));
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      toast.error(t('auth.forgotPassword.invalidEmail', 'Please enter a valid email address'));
      return;
    }

    try {
      setLoading(true);
      
      // Use custom password reset via Hostinger email
      const response = await fetch('/api/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Password reset failed:', data);
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error;
        toast.error(errorMessage || t('auth.forgotPassword.failed', 'Failed to send reset email'));
        return;
      }
      
      setEmailSent(true);
      toast.success(t('auth.forgotPassword.success', 'Password reset email sent! Check your inbox.'));
    } catch {
      toast.error(t('auth.forgotPassword.error', 'Failed to send reset email. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push(getLocalizedUrl('/login'));
  };

  return (
    <div className="min-h-screen bg-white max-w-7xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`flex flex-col ${isRTL ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}>
        {/* Left Side - Form Content */}
        <div className="w-full lg:w-1/2 px-4">
          {/* Header Section */}
          <div className="mx-auto w-full">
            <div className="mx-auto max-w-2xl mt-10 sm:mt-40">
              <div className="mx-auto max-w-2xl pt-10 sm:pt-0">
                {/* Back to Login Button */}
                <button
                  onClick={handleBackToLogin}
                  className="flex items-center text-sm sm:text-base text-cool-black hover:text-tufts-blue transition-colors mb-6"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('auth.forgotPassword.backToLogin', 'Back to Login')}
                </button>

                <p className="text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500 text-start">
                  {emailSent 
                    ? t('auth.forgotPassword.emailSentTitle', 'Check Your Email')
                    : t('auth.forgotPassword.title', 'Password Recovery')
                  }
                </p>
                <h2 className="my-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl">
                  {emailSent 
                    ? t('auth.forgotPassword.emailSentHeading', 'Reset Link Sent!')
                    : t('auth.forgotPassword.heading', 'Forgot your password?')
                  }
                </h2>
                <p className="mt-4 text-start text-sm sm:text-base text-cool-black">
                  {emailSent 
                    ? t('auth.forgotPassword.emailSentDescription', "We've sent a password reset link to your email address.")
                    : t('auth.forgotPassword.description', "No worries! Enter your email address and we'll send you a link to reset your password.")
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="w-full my-4 h-px bg-gray-100"></div>

          {/* Form Section */}
          <div className="mx-auto max-w-2xl">
            {!emailSent ? (
              <form className="space-y-4 max-w-md" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm sm:text-base font-medium text-cool-black mb-2 text-start">
                    {t('auth.forgotPassword.emailLabel', 'Email address')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 px-2 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-cool-black opacity-60" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field w-full pl-12 py-1.5"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="email"
                      maxLength={254}
                      placeholder={t('auth.forgotPassword.emailPlaceholder', 'Enter your email')}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-1.5 flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      t('auth.forgotPassword.sendButton', 'Send Reset Link')
                    )}
                  </button>

                  <div className="text-center text-sm sm:text-base">
                    <span className="text-cool-black">
                      {t('auth.forgotPassword.rememberPassword', 'Remember your password?')}{' '}
                    </span>
                    <Link
                      href={getLocalizedUrl('/login')}
                      className="font-semibold text-tufts-blue hover:text-cobalt-blue transition-colors"
                    >
                      {t('auth.forgotPassword.signIn', 'Sign in')}
                    </Link>
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-6 max-w-md">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="ml-4">
                      <h3 className="text-base sm:text-lg font-semibold text-green-900 mb-2">
                        {t('auth.forgotPassword.successTitle', 'Email Sent Successfully!')}
                      </h3>
                      <p className="text-sm sm:text-base text-green-800 mb-2">
                        {t('auth.forgotPassword.successMessage', "We've sent a password reset link to")} <strong>{email}</strong>
                      </p>
                      <p className="text-xs sm:text-sm text-green-700">
                        {t('auth.forgotPassword.checkInbox', 'Check your inbox and click the link to reset your password. The link will expire in 1 hour.')}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleBackToLogin}
                  className="btn-primary w-full py-1.5 flex items-center justify-center"
                >
                  {t('auth.forgotPassword.backToLoginButton', 'Back to Login')}
                </button>

                <div className="text-center">
                  <p className="text-xs sm:text-sm text-cool-black">
                    {t('auth.forgotPassword.didntReceive', "Didn't receive the email?")}{' '}
                    <button
                      onClick={() => {
                        setEmailSent(false);
                        setEmail('');
                      }}
                      className="font-semibold text-tufts-blue hover:text-cobalt-blue transition-colors"
                    >
                      {t('auth.forgotPassword.tryAgain', 'Try again')}
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Full Height Lottie Animation (hidden on mobile, visible on lg+) */}
        <div className="hidden lg:block lg:w-1/2 max-w-7xl mx-auto lg:right-0 lg:top-0 lg:h-screen lg:pt-20">
          <div className="relative h-full w-full flex items-center justify-center">
            {animationData && (
              <Lottie 
                animationData={animationData}
                loop={true}
                className="w-full h-full max-w-2xl"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
