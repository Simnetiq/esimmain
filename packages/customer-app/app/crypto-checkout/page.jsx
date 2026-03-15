'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { coinbasePaymentService } from '@esim/shared/services/coinbasePaymentService';
import { detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import toast from 'react-hot-toast';
import { 
  Wallet,
  Shield,
  Zap,
  Globe
} from 'lucide-react';
import Loading from '../../src/components/Loading';

const CryptoCheckoutContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const { t, locale } = useI18n();
  
  // Detect current language
  const getCurrentLanguage = () => {
    if (locale) return locale;
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('Simnetiq-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname);
  };

  const currentLanguage = getCurrentLanguage();
  
  // Helper function to generate localized URLs
  const getLocalizedUrl = (path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  };

  const [loading, setLoading] = useState(false);
  const [packageData, setPackageData] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('USDC'); // Default to USDC

  // Crypto options (Only BTC and USDC)
  const cryptoOptions = [
    { code: 'BTC', name: 'Bitcoin', symbol: '₿', network: 'Bitcoin' },
    { code: 'USDC', name: 'USD Coin', symbol: '$', network: 'Multiple' },
  ];

  useEffect(() => {
    // Load package data from localStorage or URL params
    const loadPackageData = () => {
      const selectedPackage = localStorage.getItem('selectedPackage');
      if (selectedPackage) {
        try {
          const data = JSON.parse(selectedPackage);
          setPackageData(data);
        } catch { // Silent error handling for security
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
      toast.error('Please log in to continue');
      router.push(getLocalizedUrl('/login'));
      return;
    }

    if (!packageData) {
      toast.error('Package data not loaded');
      return;
    }

    setLoading(true);

    try {
      // Process with Coinbase Commerce crypto payment
      
      const orderData = {
        planId: packageData.packageId,
        planName: packageData.packageName,
        amount: packageData.price,
        currency: 'USD', // Coinbase charges in USD, user pays in selected crypto
        customerEmail: currentUser.email,
        userId: currentUser.id,
      };

      const result = await coinbasePaymentService.createCheckoutSession(orderData);

      if (result.success && result.paymentUrl) {
        toast.success('Redirecting to payment...');
        window.location.href = result.paymentUrl;
      } else {
        throw new Error(result.error || 'Failed to create payment');
      }
    } catch {
      toast.error(error.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  if (!packageData) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            {t('cryptoCheckout.title', 'Choose Cryptocurrency')}
          </h1>
          <p className="text-text-muted">
            {t('cryptoCheckout.subtitle', 'Pay with Bitcoin, USDC, Ethereum, and more')}
          </p>
          <div className="mt-2 text-sm text-text-muted">
            Powered by Coinbase Commerce 🔒
          </div>
        </div>

        {/* Package Summary */}
        <div className="bg-[var(--bg-primary)] rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            {t('cryptoCheckout.orderSummary', 'Order Summary')}
          </h2>
          <div className="flex justify-between items-center mb-2">
            <span className="text-text-muted">{packageData.packageName}</span>
            <span className="font-semibold text-text-primary">
              {formatPrice(packageData.price)}
            </span>
          </div>
          {packageData.data && (
            <div className="text-sm text-text-muted mt-2">
              {packageData.data} {packageData.dataUnit || 'GB'} • {packageData.period} days
            </div>
          )}
        </div>

        {/* Cryptocurrency Selection */}
        <div className="bg-[var(--bg-primary)] rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            {t('cryptoCheckout.selectCryptocurrency', 'Select Cryptocurrency')}
          </h2>
          <p className="text-sm text-text-muted mb-4">
            Choose your preferred cryptocurrency. Coinbase Commerce will show you the exact amount to pay.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {cryptoOptions.map((crypto) => (
              <button
                key={crypto.code}
                onClick={() => setSelectedCurrency(crypto.code)}
                className={`p-5 rounded-lg border-2 transition-all ${
                  selectedCurrency === crypto.code
                    ? 'border-tufts-blue bg-blue-50 shadow-md'
                    : 'border-[var(--card-border)] hover:border-text-muted hover:shadow'
                }`}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{crypto.symbol}</div>
                  <div className="font-semibold text-base text-text-primary">{crypto.code}</div>
                  <div className="text-xs text-text-muted mt-1">{crypto.name}</div>
                  <div className="text-xs text-text-muted mt-1">{crypto.network}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="bg-[var(--bg-primary)] rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-tufts-blue mt-1" />
              <div>
                <div className="font-semibold text-sm text-text-primary">
                  {t('cryptoCheckout.secure', 'Secure Payment')}
                </div>
                <div className="text-xs text-text-muted">
                  {t('cryptoCheckout.secureDesc', 'End-to-end encrypted')}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-tufts-blue mt-1" />
              <div>
                <div className="font-semibold text-sm text-text-primary">
                  {t('cryptoCheckout.instant', 'Instant Delivery')}
                </div>
                <div className="text-xs text-text-muted">
                  {t('cryptoCheckout.instantDesc', 'Get your eSIM immediately')}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-tufts-blue mt-1" />
              <div>
                <div className="font-semibold text-sm text-text-primary">
                  {t('cryptoCheckout.global', 'Global Coverage')}
                </div>
                <div className="text-xs text-text-muted">
                  {t('cryptoCheckout.globalDesc', 'Works worldwide')}
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
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>{t('cryptoCheckout.processing', 'Processing...')}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Wallet className="w-5 h-5" />
              <span>{t('cryptoCheckout.payWithCrypto', `Continue to Payment`)}</span>
            </div>
          )}
        </button>

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="w-full mt-4 py-3 text-text-muted hover:text-text-primary transition-colors"
        >
          {t('cryptoCheckout.back', 'Back to Plans')}
        </button>
      </div>
    </div>
  );
};

const CryptoCheckoutPage = () => {
  return (
    <Suspense fallback={<Loading />}>
      <CryptoCheckoutContent />
    </Suspense>
  );
};

export default CryptoCheckoutPage;

