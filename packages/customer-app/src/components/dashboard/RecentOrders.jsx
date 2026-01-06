import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { usePathname } from 'next/navigation';
import EsimCard from './EsimCard';

// Usage data is preloaded when dashboard loads (up to 10 eSIMs)
// Additional usage data can be loaded on-demand when user opens the QRCodeModal
// planMetadataMap contains Supabase plan data (operator branding, coverage, etc.)
const RecentOrders = ({ orders, loading, onViewQRCode, usageCache = {}, loadingUsageMap = {}, planMetadataMap = {}, plansLoading = false }) => {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  
  // Get current language for RTL detection
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
  

  return (
    <div className="bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Recent Orders Section */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto w-full max-w-7xl">
          <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            <h2 className={`text-xl sm:text-2xl font-semibold text-eerie-black mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('dashboard.recentOrders', 'Recent Orders')}
            </h2>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-tufts-blue"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">{t('dashboard.noOrders', 'No orders yet')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.map((order) => {
                  if (!order) return null;
                  // Get ICCID from order for cache lookup
                  const iccid = order.qrCode?.iccid || order.iccid || order.airaloOrderData?.sims?.[0]?.iccid;
                  const orderUsageData = iccid ? usageCache[iccid] : undefined;
                  const isLoadingUsage = iccid ? loadingUsageMap[iccid] : false;

                  // Get plan metadata from Supabase (operator branding, coverage, etc.)
                  const packageId = order.packageId || order.planId || order.packageSlug;
                  const planMetadata = packageId ? planMetadataMap[packageId] : null;

                  return (
                    <EsimCard
                      key={order.id || order.orderId || Math.random()}
                      order={order}
                      usageData={orderUsageData}
                      loadingUsage={isLoadingUsage}
                      onViewQRCode={onViewQRCode}
                      isRTL={isRTL}
                      planMetadata={planMetadata}
                      planMetadataLoading={plansLoading}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecentOrders;