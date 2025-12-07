"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { Mail, Lock, User, Eye, EyeOff, Check, X, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';

// Lazy load Lottie to reduce initial bundle size
const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
  loading: () => <div className="animate-pulse w-full h-full bg-gray-200 rounded-lg"></div>
});

const RegisterForm = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [animationData, setAnimationData] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [mounted, setMounted] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  });
  const { signup, signInWithGoogle } = useAuth();
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { executeRecaptcha } = useGoogleReCaptcha();

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

  // Only calculate RTL after mount to prevent hydration mismatch
  const isRTL = mounted ? getLanguageDirection(currentLanguage) === 'rtl' : false;

  const getLocalizedUrl = (path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  };

  // Check for referral code in URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
    }
  }, [searchParams]);

  // Password strength checker
  useEffect(() => {
    setPasswordStrength({
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  }, [password]);

  const isPasswordStrong = Object.values(passwordStrength).every(Boolean);

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Honeypot check: silently abort if filled (bot)
    if (honeypot && honeypot.trim() !== '') {
      return;
    }
    
    // Sanitize inputs
    const normalizedDisplayName = (displayName || '').trim();
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedReferral = ((referralCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '')).slice(0, 10);
    
    if (!normalizedDisplayName || !normalizedEmail || !password) {
      toast.error(t('auth.register.fillAllFields', 'Please fill in all fields'));
      return;
    }

    if (!isPasswordStrong) {
      toast.error(t('auth.register.passwordNotStrong', 'Please meet all password requirements'));
      return;
    }

    if (!acceptedTerms) {
      toast.error(t('auth.register.acceptTerms', 'Please accept the Terms of Service and Privacy Policy'));
      return;
    }

    try {
      setLoading(true);
      
      // Execute reCAPTCHA if available
      let recaptchaToken = null;
      if (executeRecaptcha) {
        try {
          recaptchaToken = await executeRecaptcha('register');
        } catch (recaptchaError) {
          console.warn('reCAPTCHA execution failed:', recaptchaError);
          // Continue without reCAPTCHA token
        }
      }
      // Add a small jitter to reduce timing predictability
      await new Promise((r) => setTimeout(r, 80 + Math.floor(Math.random() * 120)));
      
      const result = await signup(normalizedEmail, password, normalizedDisplayName, normalizedReferral, recaptchaToken);
      
      if (result.pending) {
        // Show appropriate message based on email status
        if (result.emailSent) {
          toast.success(t('auth.register.emailSent', 'Verification code sent to your email!'), {
            duration: 6000
          });
        } else {
          toast.success(t('auth.register.checkConsole', 'Check console for verification code (email service unavailable)'), {
            duration: 8000
          });
        }
        
        // Always use English for verify-email page
        router.push(`/verify-email?email=${encodeURIComponent(normalizedEmail)}&name=${encodeURIComponent(normalizedDisplayName)}`);
        
        // Save English as preferred language
        if (typeof window !== 'undefined') {
          localStorage.setItem('Simnetiq-language', 'en');
        }
      } else {
        throw new Error('Unexpected registration result');
      }
    } catch {
      toast.error(t('auth.register.registrationFailed', 'Failed to register. Please try again.'), {
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      toast.success(t('auth.register.googleSignInSuccessful', 'Signed in with Google successfully!'));
      // Get current language and redirect to appropriate dashboard
      const currentLanguage = locale || detectLanguageFromPath(pathname) || 'en';
      const dashboardUrl = currentLanguage === 'en' ? '/dashboard' : `/${currentLanguage}/dashboard`;
      router.push(dashboardUrl);
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast.error(error.message || t('auth.register.googleSignInFailed', 'Failed to sign in with Google'));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-white max-w-7xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`flex flex-col ${isRTL ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}>
        {/* Left Side - Form Content */}
        <div className={`w-full px-4 ${isRTL ? 'lg:w-full' : 'lg:w-1/2'}`}>
          {/* Header Section */}
          <div className="mx-auto w-full">
            <div className="mx-auto max-w-2xl mt-10 sm:mt-40">
              <div className="mx-auto max-w-2xl pt-10 sm:pt-0">
                <p className="font-mono text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500 text-start rtl:font-bold rtl:tracking-tight">
                  {t('auth.login.welcomeMessage', 'Welcome to Simnetiq - Your global eSIM solution')}
                </p>
                <h2 className="my-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl text-start">
                  {t('auth.register.title', 'Create your account')}
                </h2>
                <p className="mt-4 text-start text-sm sm:text-base text-cool-black">
                  {t('auth.register.subtitle', 'Or')}{' '}
                  <Link
                    href={getLocalizedUrl('/login')}
                    className="font-semibold text-tufts-blue hover:text-cobalt-blue transition-colors"
                  >
                    {t('auth.register.signInExisting', 'sign in to your existing account')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
          <div className="w-full my-4 h-px bg-gray-100"></div>

          {/* Form Section */}
          <div className="mx-auto max-w-2xl">
              <form className="space-y-6 max-w-md" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="displayName" className="block text-sm sm:text-base font-medium text-cool-black mb-2 text-start">
                    {t('auth.register.fullNameLabel', 'Full Name')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 px-2 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-cool-black opacity-60" />
                    </div>
                    <input
                      id="displayName"
                      name="displayName"
                      type="text"
                      autoComplete="name"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="input-field w-full pl-12 py-1.5"
                      maxLength={80}
                      placeholder={t('auth.register.fullNamePlaceholder', 'Enter your full name')}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm sm:text-base font-medium text-cool-black mb-2 text-start">
                    {t('auth.register.emailLabel', 'Email address')}
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
                      placeholder={t('auth.register.emailPlaceholder', 'Enter your email')}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm sm:text-base font-medium text-cool-black mb-2 text-start">
                    {t('auth.register.passwordLabel', 'Password')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 px-2 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-cool-black opacity-60" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field w-full pl-12 pr-12 py-1.5"
                      maxLength={128}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={t('auth.register.passwordPlaceholder', 'Enter your password')}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-50 rounded-r-lg transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-cool-black opacity-60" />
                      ) : (
                        <Eye className="h-5 w-5 text-cool-black opacity-60" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {t('auth.register.passwordStrength', 'Password Strength')}
                      </span>
                      <Shield className={`w-4 h-4 ${isPasswordStrong ? 'text-green-500' : 'text-gray-400'}`} />
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className={`flex items-center gap-2 ${passwordStrength.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordStrength.minLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>{t('auth.register.minLength', 'At least 8 characters')}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordStrength.hasUpperCase ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordStrength.hasUpperCase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>{t('auth.register.hasUpperCase', 'One uppercase letter')}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordStrength.hasLowerCase ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordStrength.hasLowerCase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>{t('auth.register.hasLowerCase', 'One lowercase letter')}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordStrength.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordStrength.hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>{t('auth.register.hasNumber', 'One number')}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordStrength.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                        {passwordStrength.hasSpecialChar ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>{t('auth.register.hasSpecialChar', 'One special character (!@#$%^&*)')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Terms and Conditions Checkbox */}
              <div className="flex items-start gap-3">
                {/* Honeypot field (hidden from users) */}
                <label htmlFor="company" className="sr-only">Company</label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                />
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 text-tufts-blue border-gray-300 rounded focus:ring-tufts-blue"
                />
                <label htmlFor="acceptTerms" className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('auth.register.acceptTermsText', 'I agree to the')}{' '}
                  <Link href={getLocalizedUrl('/terms-of-service')} target="_blank" className="text-tufts-blue hover:text-cobalt-blue font-semibold">
                    {t('auth.register.termsOfService', 'Terms of Service')}
                  </Link>
                  {' '}{t('auth.register.and', 'and')}{' '}
                  <Link href={getLocalizedUrl('/privacy-policy')} target="_blank" className="text-tufts-blue hover:text-cobalt-blue font-semibold">
                    {t('auth.register.privacyPolicy', 'Privacy Policy')}
                  </Link>
                </label>
              </div>

              <div className="space-y-4 items-start justify-start">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-1.5 flex items-center justify-center text-start"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    t('auth.register.createAccountButton', 'Create Account')
                  )}
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-sm sm:text-base text-cool-black">
                      {t('auth.register.orContinueWith', 'Or continue with')}
                    </span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="btn-secondary w-full py-1.5 flex justify-center items-center"
                >
                  <svg className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {t('auth.register.signInWithGoogle', 'Sign in with Google')}
                </button>
              </div>
            </form>
          </div>
        </div>
        {/* Right Side - Full Height Lottie Animation (hidden on mobile, visible on lg+, hidden in RTL) */}
        {!isRTL && (
          <div className="hidden lg:block lg:w-1/2  max-w-7xl mx-auto lg:right-0 lg:top-0 lg:h-screen lg:pt-20">
            <div className="relative h-full w-full flex items-center justify-center ">
              {animationData && (
                <Lottie 
                  animationData={animationData}
                  loop={true}
                  className="w-full h-full max-w-2xl"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Register = () => {
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  
  if (!recaptchaSiteKey) {
    console.error('reCAPTCHA site key is not configured');
    return <div>Configuration error: reCAPTCHA key missing</div>;
  }
  
  return (
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey}>
      <RegisterForm />
    </GoogleReCaptchaProvider>
  );
};

export default Register;
