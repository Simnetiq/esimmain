'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import toast from 'react-hot-toast';
import {
  CreditCard,
  Shield,
  Zap,
  Globe,
  Lock
} from 'lucide-react';
import Loading from '../../src/components/Loading';
import AuthModal from '@esim/shared/components/AuthModal';

const StripeCheckoutContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const { t, locale } = useI18n();

  // Detect current language for RTL support
  const getCurrentLanguage = () => {
    if (locale) return locale;
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('Simnetiq-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname);
  };

  const currentLanguage = getCurrentLanguage();
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  // Helper function to generate localized URLs
  const getLocalizedUrl = (path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  };

  const [loading, setLoading] = useState(false);
  const [packageData, setPackageData] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Load package data from localStorage or URL params
    const loadPackageData = () => {
      const selectedPackage = localStorage.getItem('selectedPackage');
      if (selectedPackage) {
        try {
          const data = JSON.parse(selectedPackage);
          setPackageData(data);
        } catch {
          toast.error('Failed to load package information');
        }
      } else {
        // Try to construct from URL params
        const planId = searchParams.get('plan_id');
        const planName = searchParams.get('name');
        const amount = searchParams.get('amount');
        const currency = searchParams.get('currency');

        if (planId && planName && amount) {
          setPackageData({
            packageId: planId,
            packageName: decodeURIComponent(planName),
            price: parseFloat(amount),
            currency: currency || 'USD',
          });
        }
      }
    };

    loadPackageData();
  }, [searchParams, router]);

  const handlePayment = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    if (!packageData) {
      toast.error('Package data not loaded');
      return;
    }

    setLoading(true);

    try {
      // Process with Stripe Checkout
      const orderData = {
        order: packageData.packageId,
        email: currentUser.email,
        name: packageData.packageName,
        total: packageData.price,
        currency: (packageData.currency || 'USD').toLowerCase(),
        domain: window.location.origin,
        language: currentLanguage // Pass current language for localized redirect URLs
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
      toast.error(error.message || t('stripeCheckout.error', 'Payment processing failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={() => {
          setShowAuthModal(false);
          // Optionally auto-trigger payment here or let user click pay again
          // handlePayment(); // Be careful with loops or state, maybe just let user click again?
          // Actually, better to just close. The user sees "Pay" button again and can click it.
          // But for better UX, maybe we should auto-click?
          // Let's just toast "Signed in successfully" and let them click pay.
          toast.success(t('auth.loggedIn', 'Logged in successfully'));
        }}
      />
      {!packageData ? (
        <Loading />
      ) : (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className={`text-center mb-8 ${isRTL ? 'font-arabic' : ''}`}>
              <div className="flex items-center justify-center mb-4">
                <CreditCard className="w-12 h-12 text-tufts-blue" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t('stripeCheckout.title', 'Secure Card Payment')}
              </h1>
              <p className="text-gray-600">
                {t('stripeCheckout.subtitle', 'Pay securely with your credit or debit card')}
              </p>
              <div className={`mt-2 flex items-center justify-center gap-2 text-sm text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Lock className="w-4 h-4" />
                <span>{t('stripeCheckout.poweredBy', 'Powered by Stripe - Industry-leading security')}</span>
              </div>
            </div>

            {/* Package Summary */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('stripeCheckout.orderSummary', 'Order Summary')}
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{packageData.packageName}</span>
                  <span className="font-semibold text-gray-900">
                    {formatPrice(packageData.price)}
                  </span>
                </div>
                {packageData.data && (
                  <div className="text-sm text-gray-500 pt-2 border-t">
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Globe className="w-4 h-4" />
                      <span>{packageData.data} {packageData.dataUnit || 'GB'} • {packageData.period} {t('stripeCheckout.days', 'days')}</span>
                    </div>
                  </div>
                )}
                {packageData.originalPrice && packageData.originalPrice > packageData.price && (
                  <div className="flex justify-between items-center text-sm pt-2 border-t">
                    <span className="text-gray-500">{t('stripeCheckout.originalPrice', 'Original Price')}</span>
                    <span className="text-gray-500 line-through">
                      {formatPrice(packageData.originalPrice)}
                    </span>
                  </div>
                )}
                {packageData.hasReferralDiscount && (
                  <div className="flex justify-between items-center text-sm text-green-600">
                    <span>{t('stripeCheckout.referralDiscount', 'Referral Discount Applied')}</span>
                    <span className="font-semibold">
                      -{formatPrice(packageData.originalPrice - packageData.price)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t text-lg font-bold">
                  <span className="text-gray-900">{t('stripeCheckout.total', 'Total')}</span>
                  <span className="text-tufts-blue">
                    {formatPrice(packageData.price)} {packageData.currency || 'USD'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Info */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('stripeCheckout.paymentMethod', 'Payment Method')}
              </h2>
              <div className={`flex items-center gap-4 p-4 bg-blue-50 rounded-lg border-2 border-tufts-blue ${isRTL ? 'flex-row-reverse' : ''}`}>
                <CreditCard className="w-8 h-8 text-tufts-blue" />
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <div className="font-semibold text-gray-900">{t('stripeCheckout.cardType', 'Credit / Debit Card')}</div>
                  <div className="text-sm text-gray-600">{t('stripeCheckout.cardBrands', 'Visa, Mastercard, American Express, and more')}</div>
                </div>
              </div>
              <div className={`mt-4 text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p>{t('stripeCheckout.redirectNote', "You'll be redirected to Stripe's secure checkout page to complete your payment.")}</p>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Shield className="w-5 h-5 text-tufts-blue mt-1 flex-shrink-0" />
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="font-semibold text-sm text-gray-900">
                      {t('stripeCheckout.secure', 'Bank-Level Security')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('stripeCheckout.secureDesc', 'PCI DSS Level 1 certified')}
                    </div>
                  </div>
                </div>
                <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Zap className="w-5 h-5 text-tufts-blue mt-1 flex-shrink-0" />
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="font-semibold text-sm text-gray-900">
                      {t('stripeCheckout.instant', 'Instant Activation')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('stripeCheckout.instantDesc', 'eSIM ready in seconds')}
                    </div>
                  </div>
                </div>
                <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Globe className="w-5 h-5 text-tufts-blue mt-1 flex-shrink-0" />
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="font-semibold text-sm text-gray-900">
                      {t('stripeCheckout.global', 'Worldwide Coverage')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('stripeCheckout.globalDesc', 'Works in 190+ countries')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full btn-primary py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className={`flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{t('stripeCheckout.processing', 'Processing...')}</span>
                </div>
              ) : (
                <div className={`flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Lock className="w-5 h-5" />
                  <span>{currentUser ? t('stripeCheckout.payNow', `Pay ${formatPrice(packageData.price)} Securely`) : t('stripeCheckout.loginToPay', 'Log in to Pay')}</span>
                </div>
              )}
            </button>

            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="w-full mt-4 py-3 text-gray-600 hover:text-gray-900 transition-colors"
            >
              {t('stripeCheckout.back', 'Back to Plans')}
            </button>

            {/* Trust Badges */}
            <div className="mt-8 text-center">
              <div className="text-xs text-gray-500 mb-3">{t('stripeCheckout.trusted', 'Trusted by thousands worldwide')}</div>
              <div className={`flex items-center justify-center gap-6 text-gray-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Shield className="w-4 h-4" />
                  <span className="text-xs">{t('stripeCheckout.sslEncrypted', 'SSL Encrypted')}</span>
                </div>
                <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Lock className="w-4 h-4" />
                  <span className="text-xs">{t('stripeCheckout.pciCompliant', 'PCI Compliant')}</span>
                </div>
                <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs">{t('stripeCheckout.stripeVerified', 'Stripe Verified')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const StripeCheckoutPage = () => {
  return (
    <Suspense fallback={<Loading />}>
      <StripeCheckoutContent />
    </Suspense>
  );
};

export default StripeCheckoutPage;

