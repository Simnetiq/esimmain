'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { 
  mapPackageCountryData, 
  mapPlanDetails, 
  getQrCodeValue 
} from '@esim/shared/utils/esimFieldMapper';
import { CheckCircle, Smartphone, Wifi, ArrowRight, Mail, Clock, Globe, QrCode } from 'lucide-react';
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

  // Extract order data using shared utilities (handles both snake_case and camelCase)
  const planName = orderDetails?.planName || orderDetails?.plan_name || orderDetails?.customerName || null;
  const amount = orderDetails?.amount || orderDetails?.price || 0;
  const email = orderDetails?.email || orderDetails?.customerEmail || orderDetails?.userEmail || null;
  const orderId = orderDetails?.orderId || orderDetails?.order_id || orderDetails?.id || null;
  
  // Get country/region data using shared mapper
  const countryData = orderDetails ? mapPackageCountryData(orderDetails) : null;
  const countryName = countryData?.countryName || null;
  
  // Get plan details using shared mapper  
  const rawPlanDetails = orderDetails?.planDetails || {};
  const planDetails = mapPlanDetails(rawPlanDetails);
  const validity = planDetails?.validity || orderDetails?.validity || null;
  const dataAmount = planDetails?.data || (planDetails?.dataAmountMb ? `${planDetails.dataAmountMb} MB` : null);
  
  // Check if QR code is available
  const hasQrCode = orderDetails?.qrCode ? !!getQrCodeValue(orderDetails.qrCode) : false;

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-secondary)]" dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`max-w-2xl w-full bg-[var(--bg-primary)] rounded-2xl shadow-xl overflow-hidden border border-[var(--card-border)] ${isRTL ? 'font-arabic' : ''}`}
      >
        {/* Success Header */}
        <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-600 p-8 text-center overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
          </div>
          
          <div className="relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mb-4"
            >
              <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {t('thankYou.title', 'Payment Successful!')}
            </h1>
            <p className="text-emerald-100 text-lg">
              {t('thankYou.subtitle', 'Your eSIM is being prepared')}
            </p>
          </div>
        </div>

        {/* Order Details */}
        <div className="p-8">
          <div className="mb-8">
            <h2 className={`text-xl font-semibold text-text-primary mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('thankYou.orderDetails', 'Order Details')}
            </h2>

            {orderDetails && (
              <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--card-border)] overflow-hidden">
                {/* Plan Header */}
                {(planName || countryName) && (
                  <div className="bg-gray-900 px-5 py-4">
                    <div className={`flex items-center gap-3 `}>
                      <div className="w-10 h-10 bg-tufts-blue rounded-lg flex items-center justify-center">
                        <Globe className="w-5 h-5 text-white" />
                      </div>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <p className="font-semibold text-white">{planName || t('thankYou.esimPlan', 'eSIM Plan')}</p>
                        {countryName && <p className="text-sm text-gray-300">{countryName}</p>}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Details Grid */}
                <div className="p-5 space-y-3">
                  {/* Amount - Highlighted */}
                  {amount > 0 && (
                    <div className={`flex justify-between items-center py-2 `}>
                      <span className="text-text-muted">{t('thankYou.amount', 'Amount')}</span>
                      <span className="text-lg font-bold text-tufts-blue">
                        {formatPrice(amount)}
                      </span>
                    </div>
                  )}
                  
                  {/* Data & Validity Badges */}
                  {(dataAmount || validity) && (
                    <div className={`flex flex-wrap gap-2 py-2 `}>
                      {dataAmount && (
                        <div className={`inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium `}>
                          <Wifi className="w-4 h-4" />
                          <span>{dataAmount}</span>
                        </div>
                      )}
                      {validity && (
                        <div className={`inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium `}>
                          <Clock className="w-4 h-4" />
                          <span>{validity} {t('dashboard.days', 'days')}</span>
                        </div>
                      )}
                      {hasQrCode && (
                        <div className={`inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-medium `}>
                          <QrCode className="w-4 h-4" />
                          <span>{t('thankYou.qrReady', 'QR Ready')}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Divider */}
                  <div className="border-t border-[var(--card-border)] my-2"></div>
                  
                  {/* Email */}
                  {email && (
                    <div className={`flex justify-between items-center `}>
                      <span className="text-sm text-text-muted">{t('thankYou.email', 'Email')}</span>
                      <span className="text-sm font-medium text-text-primary">{email}</span>
                    </div>
                  )}
                  
                  {/* Order ID */}
                  {orderId && (
                    <div className={`flex justify-between items-center `}>
                      <span className="text-sm text-text-muted">{t('thankYou.orderId', 'Order ID')}</span>
                      <span className="text-xs font-mono text-text-muted bg-[var(--subtle-bg)] px-2 py-1 rounded">{orderId}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Next Steps */}
          <div className="mb-8">
            <h2 className={`text-xl font-semibold text-text-primary mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('thankYou.nextSteps', 'What Happens Next?')}
            </h2>
            
            <div className="space-y-3">
              {/* Step 1 */}
              <div className={`flex items-start gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100 `}>
                <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-sm">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">{t('thankYou.step', 'Step')} 1</span>
                    <h3 className="font-semibold text-text-primary">
                      {t('thankYou.step1Title', 'Check Your Email')}
                    </h3>
                  </div>
                  <p className="text-text-muted text-sm">
                    {t('thankYou.step1Desc', 'We\'ve sent a confirmation email with your eSIM details and QR code.')}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`flex items-start gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100 `}>
                <div className="flex-shrink-0 w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center shadow-sm">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">{t('thankYou.step', 'Step')} 2</span>
                    <h3 className="font-semibold text-text-primary">
                      {t('thankYou.step2Title', 'Access Your Dashboard')}
                    </h3>
                  </div>
                  <p className="text-text-muted text-sm">
                    {t('thankYou.step2Desc', 'View your eSIM QR code and activation instructions in your dashboard.')}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`flex items-start gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 `}>
                <div className="flex-shrink-0 w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-sm">
                  <Wifi className="w-5 h-5 text-white" />
                </div>
                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">{t('thankYou.step', 'Step')} 3</span>
                    <h3 className="font-semibold text-text-primary">
                      {t('thankYou.step3Title', 'Activate & Connect')}
                    </h3>
                  </div>
                  <p className="text-text-muted text-sm">
                    {t('thankYou.step3Desc', 'Scan the QR code with your device to install and activate your eSIM.')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleGoToDashboard}
              className={`w-full bg-[var(--login-bg)] hover:opacity-90 text-[var(--login-text)] font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98] `}
            >
              <QrCode className="w-5 h-5" />
              {t('thankYou.goToDashboard', 'Go to Dashboard')}
              <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            </button>

            {autoRedirect && (
              <div className="text-center py-2">
                <div className="inline-flex items-center gap-2 bg-[var(--subtle-bg)] rounded-full px-4 py-2">
                  <div className="w-2 h-2 bg-tufts-blue rounded-full animate-pulse"></div>
                  <p className="text-sm text-text-muted">
                    {t('thankYou.autoRedirect', 'Redirecting automatically in')} <span className="font-bold text-text-primary">{countdown}</span> {t('thankYou.seconds', 'seconds')}
                  </p>
                </div>
                <button
                  onClick={handleCancelAutoRedirect}
                  className="mt-2 text-sm text-text-muted hover:text-text-primary underline"
                >
                  {t('thankYou.cancelRedirect', 'Cancel auto-redirect')}
                </button>
              </div>
            )}
          </div>

          {/* Support Note */}
          <div className="mt-8 p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--card-border)]">
            <p className={`text-sm text-text-muted text-center`}>
              {t('thankYou.support', 'Need help? Contact our support team at')}{' '}
              <a href="mailto:support@simnetiq.store" className="font-semibold text-tufts-blue hover:underline">
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

