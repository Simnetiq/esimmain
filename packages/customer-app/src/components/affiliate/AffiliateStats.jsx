import React from 'react';
import { Copy, Share2, Users, Wallet, Gift } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import toast from 'react-hot-toast';

const AffiliateStats = ({ referralStats, loadingReferralStats, onEarningsClick }) => {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  
  // Detect current language from URL with fallback
  const currentLanguage = React.useMemo(() => {
    try {
      return detectLanguageFromPath(pathname) || locale || 'en';
    } catch {
      return locale || 'en';
    }
  }, [pathname, locale]);
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  const copyReferralCode = async () => {
    if (referralStats.referralCode) {
      try {
        await navigator.clipboard.writeText(referralStats.referralCode);
        toast.success(t('affiliate.referralCodeCopied', 'Referral code copied to clipboard!'));
      } catch {
        toast.error(t('affiliate.copyFailed', 'Failed to copy referral code'));
      }
    }
  };

  const shareReferralCode = async () => {
    if (referralStats.referralCode) {
      const shareText = t('affiliate.shareMessage', 'Join me on Simnetiq! Use my referral code: {{code}}', { code: referralStats.referralCode });

      if (navigator.share) {
        try {
          await navigator.share({
            title: t('affiliate.shareTitle', 'Simnetiq Referral'),
            text: shareText,
          });
        } catch {
        }
      } else {
        // Fallback to copying to clipboard
        try {
          await navigator.clipboard.writeText(shareText);
          toast.success(t('affiliate.shareMessageCopied', 'Referral message copied to clipboard!'));
            } catch {
        }
      }
    }
  };

  return (
    <section className="bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <div className="relative">
          <div className="absolute inset-px rounded-xl bg-white"></div>
          <div className="relative flex h-full flex-col overflow-hidden rounded-xl border-2 border-gray-200/50 shadow-xl shadow-gray-200/50">
            <div className="px-4 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6 md:px-8 md:pt-8 md:pb-8">
              <div className={`mb-6 sm:mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-medium tracking-tight text-eerie-black mb-2">{t('affiliate.yourPerformance', 'Your Performance')}</h3>
                <p className="text-sm sm:text-base text-cool-black">{t('affiliate.trackSuccess', 'Track your referral success and earnings')}</p>
              </div>

              {loadingReferralStats ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tufts-blue"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  {/* Referral Code Card */}
                  <div className={`sm:col-span-2 lg:col-span-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="bg-tufts-blue/5 rounded-xl p-4 sm:p-6 mb-3 sm:mb-4 border border-tufts-blue/10">
                      <div className={`flex items-center mb-3 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                        <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-tufts-blue" />
                      </div>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold font-mono text-eerie-black mb-2 break-all">
                        {referralStats.referralCode || t('affiliate.loading', 'Loading...')}
                      </p>
                      <p className="text-sm sm:text-base lg:text-lg text-cool-black font-medium">{t('affiliate.yourReferralCode', 'Your Referral Code')}</p>
                    </div>
                    <div className={`flex flex-col sm:flex-row space-y-2 sm:space-y-0 ${isRTL ? 'sm:space-x-reverse sm:space-x-2' : 'sm:space-x-2'}`}>
                      <button
                        onClick={copyReferralCode}
                        disabled={!referralStats.referralCode}
                        className="flex-1 bg-tufts-blue hover:bg-cobalt-blue disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-full text-sm sm:text-base lg:text-lg font-medium transition-colors text-white"
                      >
                        <Copy className={`w-3 h-3 sm:w-4 sm:h-4 inline ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('affiliate.copy', 'Copy')}
                      </button>
                      <button
                        onClick={shareReferralCode}
                        disabled={!referralStats.referralCode}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-full text-sm sm:text-base lg:text-lg font-medium transition-colors text-cool-black border border-gray-200"
                      >
                        <Share2 className={`w-3 h-3 sm:w-4 sm:h-4 inline ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('affiliate.share', 'Share')}
                      </button>
                    </div>
                  </div>

                  {/* Total Referrals Card */}
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="bg-tufts-blue/5 rounded-xl p-4 sm:p-6 border border-tufts-blue/10">
                      <div className={`flex items-center mb-3 sm:mb-4 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                        <Users className="w-6 h-6 sm:w-8 sm:h-8 text-tufts-blue" />
                      </div>
                      <p className="text-xl sm:text-2xl font-bold text-eerie-black mb-2">{referralStats.usageCount}</p>
                      <p className="text-sm sm:text-base lg:text-lg text-cool-black font-medium">{t('affiliate.totalReferrals', 'Total Referrals')}</p>
                    </div>
                  </div>

                  {/* Total Earnings Card */}
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="bg-tufts-blue/5 rounded-xl p-4 sm:p-6 border border-tufts-blue/10">
                      <div className={`flex items-center mb-3 sm:mb-4 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                        <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-tufts-blue" />
                      </div>
                      <button
                        onClick={onEarningsClick}
                        className={`text-xl sm:text-2xl font-medium text-eerie-black hover:text-cobalt-blue transition-colors cursor-pointer mb-2 block w-full ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        {formatPrice(referralStats.totalEarnings)}
                      </button>
                      <p className="text-sm sm:text-base lg:text-lg text-cool-black font-medium">{t('affiliate.totalEarnings', 'Total Earnings')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
        </div>
      </div>
    </section>
  );
};

export default AffiliateStats;
