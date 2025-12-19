/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import {
  Globe,
  Wifi,
  Clock,

  DollarSign,
  CreditCard,
  Smartphone
} from 'lucide-react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { hasUserUsedReferralCode } from '@esim/shared/services/referralService';
import { getReferralSettings } from '@esim/shared/services/settingsService';
import toast from 'react-hot-toast';
import { getCountryName, mobileCountries } from '@esim/shared/data/mobileCountries';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import { appStoreLinks } from '@esim/shared/utils/appStoreLinks';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { getProviderFromPlanData } from '@esim/shared/utils/providerUtils';
import { getISOCode } from '@esim/shared/utils/countryCodeMap';
import { formatPrice, calculateDiscountedPrice } from '@esim/shared/utils/priceUtils';
import FraudBlockedModal from '../../../src/components/FraudBlockedModal';
import { useFraudCheck } from '../../../src/hooks/useFraudCheck';
import Image from 'next/image';
import AuthModal from '@esim/shared/components/AuthModal';


const SharePackagePage = () => {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const packageId = params.packageId;

  // Language detection and RTL support
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

  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  // Get country info from URL parameters (client-side only)
  const [urlCountryCode, setUrlCountryCode] = useState(null);
  const [urlCountryName, setUrlCountryName] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setUrlCountryCode(searchParams.get('country'));
      setUrlCountryName(searchParams.get('name'));
    }
  }, []);

  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Compute flag src based on available country code
  const flagSrc = useMemo(() => {
    const countryCode = urlCountryCode || packageData?.country_code;
    if (countryCode) {
      const isoCode = getISOCode(countryCode);
      return `/flags/4x3/${isoCode}.svg`;
    }
    return '/flags/4x3/un.svg'; // Default to UN flag
  }, [urlCountryCode, packageData?.country_code]);
  const [hasReferralDiscount, setHasReferralDiscount] = useState(false);
  const [referralSettings, setReferralSettings] = useState({ discountPercentage: 10, minimumPrice: 0.5 });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [providerInfo, setProviderInfo] = useState(null);
  const [countryTranslations, setCountryTranslations] = useState({});
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

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

  const loadFromAiraloAPI = useCallback(async () => {
    try {
      const response = await fetch(`/api/airalo/plans`);
      const data = await response.json();

      if (data.success && data.plans) {
        const packageData = data.plans.find(pkg =>
          pkg.slug === packageId ||
          pkg.id === packageId ||
          pkg.name?.toLowerCase().includes(packageId.toLowerCase())
        );

        if (packageData) {
          const transformedData = {
            id: packageData.slug || packageData.id,
            name: packageData.name,
            description: packageData.description,
            price: packageData.price,
            currency: packageData.currency || 'USD',
            data: packageData.capacity || packageData.data,
            dataUnit: packageData.data_unit || 'GB',
            period: packageData.period || packageData.validity,
            duration: packageData.period || packageData.validity,
            country_code: packageData.country_codes?.[0] || packageData.country_code,
            benefits: packageData.features || [],
            speed: packageData.speed,
            region_slug: packageData.region_slug,
            provider: packageData.provider || 'airalo',
            operator: packageData.operator || '',
            slug: packageData.slug
          };
          setPackageData(transformedData);

          // Extract provider info
          const provider = getProviderFromPlanData(transformedData);
          setProviderInfo(provider);

          // Fetch country translations from Firebase
          if (transformedData.country_code) {
            try {
              const { doc, getDoc } = await import('firebase/firestore');
              const { db } = await import('@esim/shared/firebase/config');
              const countryRef = doc(db, 'countries', transformedData.country_code.toUpperCase());
              const countrySnap = await getDoc(countryRef);
              if (countrySnap.exists()) {
                const countryData = countrySnap.data();
                setCountryTranslations(countryData.translations || {});
              }
            } catch (error) {
              console.error('Error fetching country translations:', error);
            }
          }
          setTranslationsLoaded(true);

          return true; // Package found
        } else {
        }
      } else {
      }
      return false; // Package not found
    } catch {
      return false;
    }
  }, [packageId]);

  const loadPackageData = useCallback(async () => {
    try {
      setLoading(true);

      // Try to load from Firebase dataplans collection first
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@esim/shared/firebase/config');

      const packageRef = doc(db, 'dataplans', packageId);
      const packageSnap = await getDoc(packageRef);

      if (packageSnap.exists()) {
        const data = packageSnap.data();
        const fullData = {
          id: packageSnap.id,
          ...data
        };
        setPackageData(fullData);

        // Extract provider info
        const provider = getProviderFromPlanData(fullData);
        setProviderInfo(provider);

        // Fetch country translations from Firebase
        if (fullData.country_code) {
          try {
            const countryRef = doc(db, 'countries', fullData.country_code.toUpperCase());
            const countrySnap = await getDoc(countryRef);
            if (countrySnap.exists()) {
              const countryData = countrySnap.data();
              setCountryTranslations(countryData.translations || {});
              setTranslationsLoaded(true);
            } else {
              setTranslationsLoaded(true);
            }
          } catch (error) {
            console.error('Error fetching country translations:', error);
            setTranslationsLoaded(true); // Mark as loaded even on error
          }
        } else {
          setTranslationsLoaded(true); // No country code, mark as loaded
        }

        return; // Package found, exit early
      } else {
      }

      // If not found in Firebase, try to load from Airalo API
      const foundInAPI = await loadFromAiraloAPI();

      if (!foundInAPI && urlCountryCode) {
        // Try to find a package for the country from the URL
        try {
          const response = await fetch(`/api/airalo/plans?country=${urlCountryCode}`);
          const data = await response.json();

          if (data.success && data.plans && data.plans.length > 0) {
            // Use the first available plan for this country
            const fallbackPackage = data.plans[0];
            const fallbackData = {
              id: fallbackPackage.slug || fallbackPackage.id,
              name: fallbackPackage.name,
              description: fallbackPackage.description,
              price: fallbackPackage.price,
              currency: fallbackPackage.currency || 'USD',
              data: fallbackPackage.capacity || fallbackPackage.data,
              dataUnit: fallbackPackage.data_unit || 'GB',
              period: fallbackPackage.period || fallbackPackage.validity,
              duration: fallbackPackage.period || fallbackPackage.validity,
              country_code: fallbackPackage.country_codes?.[0] || fallbackPackage.country_code,
              benefits: fallbackPackage.features || [],
              speed: fallbackPackage.speed,
              region_slug: fallbackPackage.region_slug,
              provider: fallbackPackage.provider || 'airalo',
              operator: fallbackPackage.operator || '',
              slug: fallbackPackage.slug
            };
            setPackageData(fallbackData);

            // Extract provider info
            const provider = getProviderFromPlanData(fallbackData);
            setProviderInfo(provider);

            // Fetch country translations from Firebase
            if (fallbackData.country_code) {
              try {
                const countryRef = doc(db, 'countries', fallbackData.country_code.toUpperCase());
                const countrySnap = await getDoc(countryRef);
                if (countrySnap.exists()) {
                  const countryData = countrySnap.data();
                  setCountryTranslations(countryData.translations || {});
                }
              } catch (error) {
                console.error('Error fetching country translations:', error);
              }
            }
            setTranslationsLoaded(true);

            return;
          }
        } catch {
        }
      }

      if (!foundInAPI) {
        // Don't set packageData to null here, let the component handle the "not found" state
      }
    } catch {
      toast.error('Failed to load package information');
    } finally {
      setLoading(false);
    }
  }, [packageId, loadFromAiraloAPI, urlCountryCode]);

  // Load referral settings
  const loadReferralSettings = useCallback(async () => {
    try {
      const settings = await getReferralSettings();
      setReferralSettings(settings);
    } catch {
    }
  }, []);

  // Check if user has referral discount
  const checkReferralDiscount = useCallback(async () => {
    if (currentUser) {
      try {
        const hasUsed = await hasUserUsedReferralCode(currentUser.uid);
        setHasReferralDiscount(hasUsed);
      } catch {
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (packageId) {
      loadPackageData();
    }
  }, [packageId, loadPackageData]);

  useEffect(() => {
    loadReferralSettings();
  }, [loadReferralSettings]);

  useEffect(() => {
    checkReferralDiscount();
  }, [checkReferralDiscount]);

  // Prepare checkout data
  const prepareCheckoutData = () => {
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
  };

  // Helper function to generate localized URLs
  const getLocalizedUrl = (path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  };

  // Handle Stripe payment
  const handleStripePayment = async () => {
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
      const fraudStatus = await checkFraudStatus(currentUser.uid, currentUser.email);

      if (fraudStatus.blocked) {
        setProcessingPayment(false);
        // Modal will be shown automatically by the hook
        return;
      }

      // Show warning if approaching limit
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

          // Only create Radar Session if we have a publishable key
          if (publishableKey) {
            const stripe = window.Stripe(publishableKey);

            // Check if createRadarSession is available (it might not be in older Stripe.js versions)
            if (stripe && typeof stripe.createRadarSession === 'function') {
              const { radarSession, error } = await stripe.createRadarSession();

              if (error) {
                console.warn('Radar Session creation failed:', error);
                // Continue anyway - Stripe Checkout will still work
              } else if (radarSession && radarSession.id) {
                radarSessionId = radarSession.id;
              }
            } else {
              console.warn('Radar Sessions not supported in this Stripe.js version');
            }
          }
        } catch (radarError) {
          console.warn('Radar Session error:', radarError);
          // Continue anyway - Stripe Checkout will still work
        }
      } else {
        console.warn('Stripe.js not loaded yet - continuing without Radar Session');
      }

      // Create Stripe checkout session
      // SECURITY: Don't send price from frontend - server will fetch from database
      const orderData = {
        order: checkoutData.packageId,
        email: currentUser.email,
        name: checkoutData.packageName,
        // total: checkoutData.price, // REMOVED - Server fetches price from database
        total: checkoutData.price, // Still sent but server validates against database
        currency: checkoutData.currency.toLowerCase(),
        domain: window.location.origin,
        userId: currentUser.uid, // SECURITY: Send userId for discount validation
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

        // Check if this is a fraud block error
        if (handlePaymentError(errorData)) {
          setProcessingPayment(false);
          return; // Modal will be shown
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
  };

  const formatData = useCallback((data, unit = 'GB') => {
    if (data === 'Unlimited' || data === -1) {
      return 'Unlimited';
    }

    // Handle cases where data might already contain the unit
    if (typeof data === 'string' && data.includes(unit)) {
      return data; // Return as-is if unit is already included
    }

    return `${data} ${unit}`;
  }, []);

  // Helper to capitalize first letter of each word
  const capitalizeWords = (str) => {
    if (!str) return '';
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getFullCountryName = useCallback((countryCode) => {
    if (!countryCode) return '';

    // Handle special cases for global plans
    if (countryCode === 'discover-global' || countryCode === 'global') {
      return t('sharePackage.globalCoverage', 'Global');
    }

    // First, try Firebase translations (most accurate)
    if (countryTranslations && countryTranslations[currentLanguage]) {
      return countryTranslations[currentLanguage];
    }

    // Fallback to hardcoded translations in getCountryName
    const translatedName = getCountryName(countryCode, currentLanguage);
    if (translatedName && translatedName !== countryCode) {
      return translatedName;
    }

    // Fallback to mobileCountries
    const country = mobileCountries.find(c =>
      c.code === countryCode.toUpperCase() ||
      c.id === countryCode.toUpperCase()
    );

    if (country) {
      return country.name;
    }

    return capitalizeWords(countryCode);
  }, [countryTranslations, currentLanguage, t]);

  // Generate SEO metadata - defined after helper functions to avoid reference errors
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

  // Set page title dynamically using useEffect - MUST be called before any conditional returns
  useEffect(() => {
    if (metadata && typeof window !== 'undefined') {
      document.title = metadata.title;
    }
  }, [metadata]);

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

  if (!packageData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-5 h-5 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">{t('sharePackage.notFound', 'Package Not Found')}</h3>
          <p className="text-xs text-gray-600 mb-4">
            {t('sharePackage.notFoundDesc', 'The package you\'re looking for doesn\'t exist or has been removed')}
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
      {/* Fraud Blocked Modal */}
      <FraudBlockedModal
        isOpen={isBlocked}
        onClose={clearBlockedState}
        blockType={blockData?.blockType}
        message={blockData?.message}
        expiresAt={blockData?.expiresAt}
        remainingHours={blockData?.remainingHours}
        canContactSupport={blockData?.canContactSupport}
        userId={currentUser?.uid}
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
        {/* Horizontal Line - Top */}
        <div className="hidden sm:block absolute top-0 left-0 right-0 h-px bg-gray-200"></div>

        {/* Horizontal Line - Bottom */}
        <div className="hidden sm:block absolute bottom-0 left-0 right-0 h-px bg-gray-200"></div>

        {/* Grid Pattern - Left Side */}
        <div
          className="hidden xl:block absolute left-0 top-0 bottom-0 w-32 "
          style={{
            backgroundSize: '10px 10px',
            backgroundAttachment: 'fixed',
            backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
          }}
        ></div>

        {/* Grid Pattern - Right Side */}
        <div
          className="hidden xl:block absolute right-0 top-0 bottom-0 w-32 "
          style={{
            backgroundSize: '10px 10px',
            backgroundAttachment: 'fixed',
            backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
          }}
        ></div>

        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className="font-mono text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500">
                {t('sharePackage.secureCheckout', 'Secure Checkout')}
              </p>
              {packageData ? (
                <div className="mt-4 max-w-5xl share-package-header">
                  <div className="flex justify-start items-center gap-4">
                    {/* Country Flag */}
                    <div className="flex-shrink-0 w-20 sm:w-24 lg:w-28 aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border-2 border-gray-200 overflow-hidden relative">
                      <img
                        src={flagSrc}
                        alt={`${capitalizeWords(urlCountryName) || getFullCountryName(urlCountryCode || packageData?.country_code) || 'Global'} flag`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Country Info */}
                    <div>
                      <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-tufts-blue">
                        {(urlCountryName || getFullCountryName(urlCountryCode || packageData.country_code)) &&
                          <>{capitalizeWords(urlCountryName) || getFullCountryName(urlCountryCode || packageData.country_code)} - </>}
                        {formatData(packageData.data || packageData.capacity, packageData.dataUnit || 'GB')}
                      </h2>
                      <div className={`mt-1 flex items-baseline gap-2`}>
                        <p className="text-xl sm:text-2xl font-semibold text-eerie-black">
                          {formatPrice(packageData.price)}
                        </p>
                        <span className="text-base sm:text-lg text-cool-black">
                          - {packageData.day || packageData.period || packageData.duration || packageData.validity} {t('sharePackage.days', 'days')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <h2 className="mt-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl">
                  {t('sharePackage.pageTitle', 'Secure Checkout - Buy eSIM')}
                </h2>
              )}
            </div>
          </div>
          {/* Full width gray line */}
          <div className="w-full h-px bg-gray-100"></div>
        </div>

        {/* Package Header Section */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div>
                <p className="text-cool-black text-sm mt-2 mx-auto">{packageData.description || t('sharePackage.travelPackage', 'Travel Package')}</p>

                {/* Payment Button */}
                <div className="mt-6 max-w-2xl space-y-4">
                  {/* Stripe Payment Button */}
                  <button
                    onClick={handleStripePayment}
                    disabled={processingPayment}
                    className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-tufts-blue hover:bg-jordy-blue/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className={`flex items-center gap-3`}>
                      <div className="w-12 h-12 bg-tufts-blue/10 rounded-lg flex items-center justify-center group-hover:bg-tufts-blue/20 transition-colors">
                        <CreditCard className="w-6 h-6 text-tufts-blue" />
                      </div>
                      <div>
                        <p className="font-semibold text-eerie-black">
                          {currentUser ? t('sharePackage.payNow', 'Proceed to Payment') : t('sharePackage.loginToContinue', 'Log in to Continue')}
                        </p>
                        <p className="text-xs text-cool-black">
                          {currentUser ? t('sharePackage.secureStripe', 'Secure payment via Stripe') : t('sharePackage.loginDesc', 'Sign in with Google or Apple')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-8 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </div>
                  </button>

                  {/* Implicit Terms and Conditions */}
                  <div className="text-center">
                    <p className={`text-xs text-cool-black`}>
                      {t('sharePackage.implicitTerms', 'By clicking "Proceed to Payment" you agree to the')}{' '}
                      <a
                        href={getLocalizedUrl('/terms-of-service')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-tufts-blue hover:underline"
                      >
                        {t('sharePackage.termsOfService', 'Terms of Service')}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Full width gray line */}
          <div className="w-full h-px bg-gray-100"></div>
        </div>

        {/* Package Stats Section */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl package-stats">
              <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="bg-jordy-blue/10 p-4 border border-gray-200/70">
                  <div className={`flex justify-start items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-shrink-0 bg-tufts-blue/10 p-2">
                      <Wifi className="w-5 h-5 text-tufts-blue" />
                    </div>
                    <div>
                      <div className="text-xs text-cool-black mb-1">{t('sharePackage.data', 'Data')}</div>
                      <div className="font-semibold text-eerie-black">{formatData(packageData.data, packageData.dataUnit)}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-jordy-blue/10 p-4 border border-gray-200/70">
                  <div className={`flex justify-start items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-shrink-0 bg-tufts-blue/10 p-2">
                      <Clock className="w-5 h-5 text-tufts-blue" />
                    </div>
                    <div>
                      <div className="text-xs text-cool-black mb-1">{t('sharePackage.validity', 'Validity')}</div>
                      <div className="font-semibold text-eerie-black">{packageData.period || packageData.duration || 'N/A'} {t('sharePackage.days', 'days')}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-jordy-blue/10 p-4 border border-gray-200/70">
                  <div className={`flex justify-start items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-shrink-0 bg-tufts-blue/10 p-2">
                      <DollarSign className="w-5 h-5 text-tufts-blue" />
                    </div>
                    <div className={`flex-1`}>
                      <div className="text-xs text-cool-black mb-1">{t('sharePackage.price', 'Price')}</div>
                      {hasReferralDiscount ? (
                        <div>
                          <div className={`flex justify-start items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                            <span className="font-semibold text-green-600">
                              {formatPrice(calculateDiscountedPrice(packageData.price, referralSettings.discountPercentage, referralSettings.minimumPrice))}
                            </span>
                            <div className="flex bg-cobalt-blue rounded-full px-2 py-0.5">
                              <span className="text-xs text-white font-medium whitespace-nowrap">
                                -{referralSettings.discountPercentage}%
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 line-through mt-1">{formatPrice(packageData.price)}</div>
                        </div>
                      ) : (
                        <div className="font-semibold text-eerie-black">{formatPrice(packageData.price)}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-jordy-blue/10 p-4 border border-gray-200/70">
                  <div className={`flex justify-start items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-shrink-0 bg-tufts-blue/10 p-2 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-tufts-blue" />
                    </div>
                    <div>
                      <div className="text-xs text-cool-black mb-1">{t('sharePackage.operator', 'Operator')}</div>
                      <div className="font-semibold text-eerie-black" style={{ color: providerInfo?.color }}>
                        {packageData.operator || packageData.networks || providerInfo?.name || packageData.provider || t('sharePackage.esim', 'eSIM')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Full width gray line */}
          <div className="w-full h-px bg-gray-100"></div>
        </div>

        {/* How to Use Section - Header */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className="text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500">
                {t('sharePackage.howToUse', 'How to Use')}
              </p>
              <h3 className="mt-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl">
                {t('sharePackage.activationSteps', 'Activate Your eSIM in Minutes')}
              </h3>
            </div>
          </div>
          <div className="w-full h-px bg-gray-100"></div>
        </div>

        {/* Activation Instructions - iOS and Android */}
        <div className="mx-auto w-full max-w-9xl activation-section">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="grid gap-6 lg:grid-cols-2">

                {/* iOS Instructions */}
                <div className="border border-gray-200 p-6">
                  <div className={`flex justify-start items-center gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <img
                      src="/images/logo_icon/apple.svg"
                      alt="iOS"
                      width="32"
                      height="32"
                      className="w-8 h-8"
                    />
                    <h4 className={`text-xl font-semibold text-eerie-black`}>
                      {t('sharePackage.iosInstructions', 'iOS Instructions')}
                    </h4>
                  </div>

                  <div className="space-y-4">
                    <div className={`flex justify-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-tufts-blue text-white flex items-center justify-center text-sm font-semibold">
                        1
                      </div>
                      <div>
                        <p className="text-sm text-cool-black">
                          {t('sharePackage.iosStep1', 'Open Settings → Cellular → Add eSIM')}
                        </p>
                      </div>
                    </div>

                    <div className={`flex justify-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-tufts-blue text-white flex items-center justify-center text-sm font-semibold">
                        2
                      </div>
                      <div>
                        <p className="text-sm text-cool-black">
                          {t('sharePackage.iosStep2', 'Scan the QR code you received via email')}
                        </p>
                      </div>
                    </div>

                    <div className={`flex justify-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-tufts-blue text-white flex items-center justify-center text-sm font-semibold">
                        3
                      </div>
                      <div>
                        <p className="text-sm text-cool-black">
                          {t('sharePackage.iosStep3', 'Label your eSIM and set it as your default line')}
                        </p>
                      </div>
                    </div>

                    <div className={`flex justify-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-tufts-blue text-white flex items-center justify-center text-sm font-semibold">
                        4
                      </div>
                      <div>
                        <p className="text-sm text-cool-black">
                          {t('sharePackage.iosStep4', 'Turn on Data Roaming for your eSIM and you\'re ready!')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <a
                    href={appStoreLinks.ios}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-6 btn-primary text-white shadow-sm inline-flex items-center w-full justify-center ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <img
                      src="/images/logo_icon/apple.svg"
                      alt="iOS"
                      width="20"
                      height="20"
                      className={isRTL ? 'w-5 h-5 ml-2' : 'w-5 h-5 mr-2'}
                    />
                    <span className="text-base">{t('sharePackage.downloadIOS', 'Download on iOS')}</span>
                  </a>
                </div>

                {/* Android Instructions */}
                <div className="border border-gray-200 p-6">
                  <div className={`flex justify-start items-center gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <img
                      src="/images/logo_icon/android.svg"
                      alt="Android"
                      width="32"
                      height="32"
                      className="w-8 h-8"
                    />
                    <h4 className={`text-xl font-semibold text-eerie-black`}>
                      {t('sharePackage.androidInstructions', 'Android Instructions')}
                    </h4>
                  </div>

                  <div className="space-y-4">
                    <div className={`flex justify-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-tufts-blue text-white flex items-center justify-center text-sm font-semibold">
                        1
                      </div>
                      <div>
                        <p className="text-sm text-cool-black">
                          {t('sharePackage.androidStep1', 'Open Settings → Network & Internet → SIMs → Add SIM')}
                        </p>
                      </div>
                    </div>

                    <div className={`flex justify-start items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-tufts-blue text-white flex items-center justify-center text-sm font-semibold">
                        2
                      </div>
                      <div>
                        <p className="text-sm text-cool-black">
                          {t('sharePackage.androidStep2', 'Select &quot;Download a SIM instead?&quot; and scan QR code')}
                        </p>
                      </div>
                    </div>

                    <div className={`flex justify-start items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-tufts-blue text-white flex items-center justify-center text-sm font-semibold">
                        3
                      </div>
                      <div>
                        <p className="text-sm text-cool-black">
                          {t('sharePackage.androidStep3', 'Name your eSIM and enable it')}
                        </p>
                      </div>
                    </div>

                    <div className={`flex justify-start items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-tufts-blue text-white flex items-center justify-center text-sm font-semibold">
                        4
                      </div>
                      <div>
                        <p className="text-sm text-cool-black">
                          {t('sharePackage.androidStep4', 'Enable Mobile Data and Data Roaming for your eSIM')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <a
                    href={appStoreLinks.android}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-6 btn-primary text-white shadow-sm inline-flex items-center w-full justify-center ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <img
                      src="/images/logo_icon/android.svg"
                      alt="Android"
                      width="18"
                      height="18"
                      className={isRTL ? 'w-4 h-4 ml-2' : 'w-4 h-4 mr-2'}
                    />
                    <span className="text-base">{t('sharePackage.downloadAndroid', 'Download on Android')}</span>
                  </a>
                </div>

              </div>
            </div>
          </div>
          <div className="w-full h-px bg-gray-100"></div>
        </div>


      </div>
    </div>
  );
};

export default SharePackagePage;
