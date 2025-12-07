'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { CheckCircle, Smartphone, Wifi, ArrowRight, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const ThankYou = ({ orderDetails }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useI18n();
  const [countdown, setCountdown] = useState(10);
  const [autoRedirect, setAutoRedirect] = useState(true);

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

  useEffect(() => {
    if (autoRedirect && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (autoRedirect && countdown === 0) {
      router.push('/dashboard');
    }
  }, [countdown, autoRedirect, router]);

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleCancelAutoRedirect = () => {
    setAutoRedirect(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden ${isRTL ? 'font-arabic' : ''}`}
      >
        {/* Success Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <CheckCircle className="w-20 h-20 text-white mx-auto mb-4" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {t('thankYou.title', 'Payment Successful!')}
          </h1>
          <p className="text-green-50 text-lg">
            {t('thankYou.subtitle', 'Your eSIM is being prepared')}
          </p>
        </div>

        {/* Order Details */}
        <div className="p-8">
          <div className="mb-8">
            <h2 className={`text-xl font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('thankYou.orderDetails', 'Order Details')}
            </h2>
            
            {orderDetails && (
              <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                {orderDetails.planName && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('thankYou.plan', 'Plan')}:</span>
                    <span className="font-semibold text-gray-900">{orderDetails.planName}</span>
                  </div>
                )}
                {orderDetails.amount && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('thankYou.amount', 'Amount')}:</span>
                    <span className="font-semibold text-gray-900">
                      ${orderDetails.amount} {orderDetails.currency?.toUpperCase()}
                    </span>
                  </div>
                )}
                {orderDetails.email && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('thankYou.email', 'Email')}:</span>
                    <span className="font-medium text-gray-900">{orderDetails.email}</span>
                  </div>
                )}
                {orderDetails.orderId && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('thankYou.orderId', 'Order ID')}:</span>
                    <span className="font-mono text-sm text-gray-900">{orderDetails.orderId}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Next Steps */}
          <div className="mb-8">
            <h2 className={`text-xl font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('thankYou.nextSteps', 'What Happens Next?')}
            </h2>
            
            <div className="space-y-4">
              <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {t('thankYou.step1Title', 'Check Your Email')}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {t('thankYou.step1Desc', 'We\'ve sent a confirmation email with your eSIM details and QR code.')}
                  </p>
                </div>
              </div>

              <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-purple-600" />
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {t('thankYou.step2Title', 'Access Your Dashboard')}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {t('thankYou.step2Desc', 'View your eSIM QR code and activation instructions in your dashboard.')}
                  </p>
                </div>
              </div>

              <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-green-600" />
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {t('thankYou.step3Title', 'Activate & Connect')}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {t('thankYou.step3Desc', 'Scan the QR code with your device to install and activate your eSIM.')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGoToDashboard}
              className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              {t('thankYou.goToDashboard', 'Go to Dashboard')}
              <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            </button>

            {autoRedirect && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  {t('thankYou.autoRedirect', 'Redirecting automatically in')} {countdown} {t('thankYou.seconds', 'seconds')}
                </p>
                <button
                  onClick={handleCancelAutoRedirect}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  {t('thankYou.cancelRedirect', 'Cancel auto-redirect')}
                </button>
              </div>
            )}
          </div>

          {/* Support Note */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className={`text-sm text-blue-900 text-center ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('thankYou.support', 'Need help? Contact our support team at')}{' '}
              <a href="mailto:support@simnetiq.store" className="font-semibold underline">
                support@simnetiq.store
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ThankYou;

