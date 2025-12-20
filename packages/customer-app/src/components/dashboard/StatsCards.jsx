import React, { useState, useEffect, useMemo } from 'react';
import { Globe, QrCode, Wallet, Users } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { formatPrice } from '@esim/shared/utils/priceUtils';

const StatsCards = ({ orders, activeOrders, referralStats }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Language detection with fallback
  const detectedLanguage = useMemo(() => {
    try {
      if (i18nLoading) {
        if (typeof window !== 'undefined') {
          const savedLanguage = localStorage.getItem('Simnetiq-language');
          if (savedLanguage) return savedLanguage;
        }
        return detectLanguageFromPath(pathname) || 'en';
      }
      return locale || 'en';
    } catch {
      return 'en';
    }
  }, [locale, pathname, i18nLoading]);

  const direction = mounted ? getLanguageDirection(detectedLanguage) : 'ltr';
  const isRTL = direction === 'rtl';
  
  // Helper function to generate localized URLs
  const getLocalizedUrl = (path) => {
    if (detectedLanguage === 'en') {
      return path;
    }
    return `/${detectedLanguage}${path}`;
  };

  return (
    <div className="bg-white" dir={direction} lang={detectedLanguage}>
      {/* Stats Section */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto w-full max-w-7xl">
          <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {/* Total Orders Card */}
          <div className="relative">
            <div className="absolute inset-px bg-white rounded-lg"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <p className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('dashboard.totalOrders', 'Total Orders')}
                </p>
                <Globe className="w-5 h-5 text-tufts-blue" />
              </div>
              <div className="flex items-center">
                <span className="text-3xl font-bold text-eerie-black">
                  {orders.length}
                </span>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-lg shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Active eSIMs Card */}
          <div className="relative">
            <div className="absolute inset-px bg-white rounded-lg"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <p className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('dashboard.activeEsims', 'Active eSIMs')}
                </p>
                <QrCode className="w-5 h-5 text-tufts-blue" />
              </div>
              <div className="flex items-center">
                <span className="text-3xl font-bold text-eerie-black">
                  {activeOrders.length}
                </span>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-lg shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Performance Card */}
          <div 
            className="relative cursor-pointer group"
            onClick={() => router.push(getLocalizedUrl('/affiliate-program'))}
          >
            <div className="absolute inset-px bg-white rounded-lg group-hover:bg-gray-50 transition-colors"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <p className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('dashboard.yourPerformance', 'Your Performance')}
                </p>
                <Wallet className="w-5 h-5 text-tufts-blue" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="text-3xl font-bold text-eerie-black">
                    {formatPrice(referralStats.totalEarnings)}
                  </span>
                </div>
                
                <p className={`text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('dashboard.totalEarnings', 'Total Earnings')}
                </p>
                
                {(referralStats.usageCount || 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-tufts-blue" />
                    <span className="text-sm font-medium text-eerie-black">
                      {Math.floor(referralStats.usageCount || 0)} {t('dashboard.uses', 'uses')}
                    </span>
                  </div>
                )}
              </div>
              
              <p className={`text-xs text-tufts-blue mt-4 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 
                  `← ${t('dashboard.tapToJoinAffiliate', 'Tap to join affiliate program')}` : 
                  `${t('dashboard.tapToJoinAffiliate', 'Tap to join affiliate program')} →`
                }
              </p>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-lg shadow-sm ring-1 ring-black/5 group-hover:ring-gray-300 transition-colors"></div>
          </div>
        </div>
          </div>
        </div>
        {/* Full width gray line */}
        <div className="w-full h-px bg-gray-100"></div>
      </div>
    </div>
  );
};

export default StatsCards;
