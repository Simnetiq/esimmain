/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { Globe } from 'lucide-react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { hasUserUsedReferralCode } from '@esim/shared/services/referralService';
import { getReferralSettings } from '@esim/shared/services/settingsService';
import toast from 'react-hot-toast';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import { formatPrice, calculateDiscountedPrice } from '@esim/shared/utils/priceUtils';
import FraudBlockedModal from '../../../src/components/FraudBlockedModal';
import { useFraudCheck } from '../../../src/hooks/useFraudCheck';
import { AuthModal } from '@esim/shared';

// Import custom hook and components
import { usePackageData } from './hooks/usePackageData';
import {
  PackageHeader,
  PackageStats,
  PaymentSection,
  ActivationInstructions
} from './components';

const SharePackagePage = () => {
  const router = useRouter();
  const { currentUser } = useAuth();

  // Use custom hook for package data
  const {
    packageId,
    packageData,
    loading,
    providerInfo,
    countryTranslations,
    countryImage,
    translationsLoaded,
    urlCountryCode,
    urlCountryName,
    currentLanguage,
    isRTL,
    isGlobalPlan,
    t
  } = usePackageData();

  // Referral state
  const [hasReferralDiscount, setHasReferralDiscount] = useState(false);
  const [referralSettings, setReferralSettings] = useState({ discountPercentage: 10, minimumPrice: 0.5 });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Fraud detection hook
  const {
    isBlocked,
    blockData,
    checkFraudStatus,
    clearBlockedState,
    handlePaymentError,
    loading: fraudCheckLoading
  } = useFraudCheck();

  // Load referral settings
  const loadReferralSettings = useCallback(async () => {
    try {
      const settings = await getReferralSettings();
      setReferralSettings(settings);
    } catch {
      // Silent fail
    }
  }, []);

  // Check if user has referral discount
  const checkReferralDiscount = useCallback(async () => {
    if (currentUser) {
      try {
        const hasUsed = await hasUserUsedReferralCode(currentUser.id);
        setHasReferralDiscount(hasUsed);
      } catch {
        // Silent fail
      }
    }
  }, [currentUser]);

  useEffect(() => {
    loadReferralSettings();
  }, [loadReferralSettings]);

  useEffect(() => {
    checkReferralDiscount();
  }, [checkReferralDiscount]);

  // Helper to capitalize words
  const capitalizeWords = (str) => {
    if (!str) return '';
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get full country name
  // PURE DATA FROM PROPS/STATE - NO HARDCODED FALLBACKS
  const getFullCountryName = useCallback((countryCode) => {
    if (!countryCode) return '';

    if (countryCode === 'discover-global' || countryCode === 'global') {
      return t('sharePackage.globalCoverage', 'Global');
    }

    // Use translations from Supabase (passed via countryTranslations)
    if (countryTranslations && countryTranslations[currentLanguage]) {
      return countryTranslations[currentLanguage];
    }

    // Fall back to capitalizing the country code
    return capitalizeWords(countryCode);
  }, [countryTranslations, currentLanguage, t]);

  // Format data helper
  const formatData = useCallback((data, unit = 'GB') => {
    if (data === 'Unlimited' || data === -1) {
      return 'Unlimited';
    }
    if (typeof data === 'string' && data.includes(unit)) {
      return data;
    }
    return `${data} ${unit}`;
  }, []);

  // Helper function to generate localized URLs
  const getLocalizedUrl = useCallback((path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  }, [currentLanguage]);

  // Prepare checkout data
  const prepareCheckoutData = useCallback(() => {
    if (!packageData) return null;

    const originalPrice = parseFloat(packageData.price);
    const discountPercentage = referralSettings.discountPercentage || 10;
    const minimumPrice = referralSettings.minimumPrice || 0.5;

    const discountedPrice = hasReferralDiscount
      ? Math.max(minimumPrice, originalPrice * (100 - discountPercentage) / 100)
      : originalPrice;
    const finalPrice = hasReferralDiscount ? discountedPrice : originalPrice;

    return {
      packageId: packageId,
      packageName: packageData.name,
      packageDescription: packageData.description,
      price: finalPrice,
      originalPrice: originalPrice,
      currency: packageData.currency || 'USD',
      data: packageData.data,
      dataUnit: packageData.dataUnit || 'GB',
      period: packageData.period || packageData.duration,
      country_code: packageData.country_code,
      benefits: packageData.benefits || [],
      speed: packageData.speed,
      hasReferralDiscount: hasReferralDiscount
    };
  }, [packageData, packageId, hasReferralDiscount, referralSettings]);

  // Handle Stripe payment
  const handleStripePayment = useCallback(async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    if (!packageData) {
      toast.error('Package data not loaded yet');
      return;
    }

    setProcessingPayment(true);

    try {
      // Check fraud status before proceeding
      const fraudStatus = await checkFraudStatus(currentUser.id, currentUser.email);

      if (fraudStatus.blocked) {
        setProcessingPayment(false);
        return;
      }

      if (fraudStatus.warning) {
        toast(fraudStatus.warning.message, {
          icon: '⚠️',
          duration: 5000
        });
      }

      const checkoutData = prepareCheckoutData();

      // Track purchase initiation
      trackCustomFacebookEvent('InitiateCheckout', {
        content_name: packageData.name,
        content_type: 'esim_package',
        content_ids: [packageId],
        value: checkoutData.price,
        currency: checkoutData.currency,
        payment_method: 'stripe',
        source: 'share_package_page',
        timestamp: new Date().toISOString()
      });

      // Store package data in localStorage for payment success page
      localStorage.setItem('selectedPackage', JSON.stringify(checkoutData));

      // Create Radar Session for enhanced fraud detection
      let radarSessionId = null;
      if (typeof window !== 'undefined' && window.Stripe) {
        try {
          const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

          if (publishableKey) {
            const stripe = window.Stripe(publishableKey);

            if (stripe && typeof stripe.createRadarSession === 'function') {
              const { radarSession, error } = await stripe.createRadarSession();

              if (!error && radarSession && radarSession.id) {
                radarSessionId = radarSession.id;
              }
            }
          }
        } catch (radarError) {
          console.warn('Radar Session error:', radarError);
        }
      }

      // Create Stripe checkout session
      const orderData = {
        order: checkoutData.packageId,
        email: currentUser.email,
        name: checkoutData.packageName,
        total: checkoutData.price,
        currency: checkoutData.currency.toLowerCase(),
        domain: window.location.origin,
        userId: currentUser.id,
        language: currentLanguage,
        radarSessionId
      };

      const response = await fetch('/api/create-payment-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (handlePaymentError(errorData)) {
          setProcessingPayment(false);
          return;
        }

        throw new Error(errorData.error || 'Failed to create payment session');
      }

      const result = await response.json();

      if (result.sessionUrl) {
        toast.success('Redirecting to Stripe checkout...');
        window.location.href = result.sessionUrl;
      } else {
        throw new Error('No session URL received');
      }
    } catch (error) {
      toast.error(error.message || 'Payment processing failed');
      setProcessingPayment(false);
    }
  }, [currentUser, packageData, packageId, checkFraudStatus, prepareCheckoutData, handlePaymentError, currentLanguage]);

  // Generate SEO metadata
  const metadata = useMemo(() => {
    if (!packageData) return null;

    const countryName = capitalizeWords(urlCountryName) || getFullCountryName(urlCountryCode || packageData.country_code) || 'Global';
    const planName = packageData.name || 'eSIM Package';
    const price = formatPrice(packageData.price);
    const data = formatData(packageData.data, packageData.dataUnit);
    const provider = providerInfo?.name || 'Provider';

    const metaTitle = t('sharePackage.metaTitle', 'Buy {planName} eSIM - {country} | Secure Checkout')
      .replace('{planName}', planName)
      .replace('{country}', countryName);

    const metaDescription = t('sharePackage.metaDescription',
      'Buy {planName} eSIM for {country}. Instant activation, secure checkout, global coverage. Starting from ${price}. Perfect for travelers and digital nomads.')
      .replace('{planName}', planName)
      .replace('{country}', countryName)
      .replace('{price}', price);

    return {
      title: metaTitle,
      description: metaDescription,
      keywords: `eSIM, ${countryName}, ${planName}, ${provider}, buy eSIM, purchase eSIM, secure checkout, travel eSIM, ${data}, instant activation`,
      ogTitle: metaTitle,
      ogDescription: metaDescription,
      ogImage: '/images/logo_icon/logo.png'
    };
  }, [packageData, urlCountryName, urlCountryCode, providerInfo, t, getFullCountryName, formatData]);

  // Set page title dynamically
  useEffect(() => {
    if (metadata && typeof window !== 'undefined') {
      document.title = metadata.title;
    }
  }, [metadata]);

  // Loading state
  if (loading || !translationsLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-tufts-blue mx-auto mb-4"></div>
          <p className="text-gray-600">{t('sharePackage.loading', 'Loading package information...')}</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!packageData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-5 h-5 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">{t('sharePackage.notFound', 'Package Not Found')}</h3>
          <p className="text-xs text-gray-600 mb-4">
            {t('sharePackage.notFoundDesc', "The package you're looking for doesn't exist or has been removed")}
          </p>
          <button
            onClick={() => router.push('/esim-plans')}
            className="bg-tufts-blue hover:bg-tufts-blue text-white px-6 py-2 rounded-lg transition-colors"
          >
            {t('sharePackage.browsePackages', 'Browse Available Packages')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Load Stripe.js only on this page where it's needed */}
      <Script src="https://js.stripe.com/v3/" strategy="lazyOnload" />

      {/* Fraud Blocked Modal */}
      <FraudBlockedModal
        isOpen={isBlocked}
        onClose={clearBlockedState}
        blockType={blockData?.blockType}
        message={blockData?.message}
        expiresAt={blockData?.expiresAt}
        remainingHours={blockData?.remainingHours}
        canContactSupport={blockData?.canContactSupport}
        userId={currentUser?.id}
        email={currentUser?.email}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={() => {
          setShowAuthModal(false);
          toast.success(t('auth.loggedIn', 'Logged in successfully'));
        }}
      />

      {/* Processing Overlay */}
      {(processingPayment || fraudCheckLoading) && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tufts-blue mx-auto mb-4"></div>
              <p className="text-gray-900 font-semibold">
                {fraudCheckLoading
                  ? t('sharePackage.verifyingAccount', 'Verifying your account...')
                  : t('sharePackage.redirectingPayment', 'Redirecting to payment...')
                }
              </p>
              <p className="text-gray-600 text-sm mt-2">{t('sharePackage.pleaseWait', 'Please wait while we redirect you')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="relative isolate flex-1 flex flex-col">
        {/* Decorative Lines */}
        <div className="hidden sm:block absolute top-0 left-0 right-0 h-px bg-gray-200"></div>
        <div className="hidden sm:block absolute bottom-0 left-0 right-0 h-px bg-gray-200"></div>

        {/* Grid Patterns */}
        <div
          className="hidden xl:block absolute left-0 top-0 bottom-0 w-32"
          style={{
            backgroundSize: '10px 10px',
            backgroundAttachment: 'fixed',
            backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
          }}
        ></div>
        <div
          className="hidden xl:block absolute right-0 top-0 bottom-0 w-32"
          style={{
            backgroundSize: '10px 10px',
            backgroundAttachment: 'fixed',
            backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
          }}
        ></div>

        <div className="mx-auto w-full max-w-9xl">
          {/* Package Header */}
          <PackageHeader
            packageData={packageData}
            countryImage={countryImage}
            countryTranslations={countryTranslations}
            urlCountryName={urlCountryName}
            urlCountryCode={urlCountryCode}
            currentLanguage={currentLanguage}
            isRTL={isRTL}
            isGlobalPlan={isGlobalPlan}
            t={t}
          />

          {/* Payment Section */}
          <PaymentSection
            packageData={packageData}
            currentUser={currentUser}
            processingPayment={processingPayment}
            onPayment={handleStripePayment}
            getLocalizedUrl={getLocalizedUrl}
            isRTL={isRTL}
            t={t}
          />

          {/* Package Stats */}
          <PackageStats
            packageData={packageData}
            providerInfo={providerInfo}
            hasReferralDiscount={hasReferralDiscount}
            referralSettings={referralSettings}
            isRTL={isRTL}
            currentLanguage={currentLanguage}
            t={t}
          />

          {/* Activation Instructions */}
          <ActivationInstructions
            isRTL={isRTL}
            t={t}
          />
        </div>
      </div>
    </div>
  );
};

export default SharePackagePage;
