import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { usePathname } from 'next/navigation';
import { esimService } from '@esim/shared/services/esimService';
import EsimCard from './EsimCard';

const RecentOrders = ({ orders, loading, onViewQRCode }) => {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const [usageData, setUsageData] = useState({});
  const [loadingUsage, setLoadingUsage] = useState({});
  
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
  
  // Fetch usage data for ALL orders with ICCID (not just active)
  // This allows us to detect expired eSIMs and show accurate remaining data
  useEffect(() => {
    const fetchUsageForOrders = async () => {
      // Fetch for all orders that have an ICCID, regardless of status
      // This ensures we can detect when an eSIM expires
      const ordersWithIccid = orders.filter(order => 
        order && order.qrCode?.iccid
      );
      
      for (const order of ordersWithIccid.slice(0, 10)) {
        const alreadyFetched = usageData[order.id] !== undefined;
        const currentlyLoading = loadingUsage[order.id];
        
        if (!alreadyFetched && !currentlyLoading) {
          setLoadingUsage(prev => ({ ...prev, [order.id]: true }));
          
          try {
            const result = await esimService.getEsimUsageByIccid(order.qrCode.iccid);
            if (result.success && result.data) {
              // Combine usage data from Airalo API with package details from the order
              // The usage API returns: remaining, total, remaining_voice, remaining_text, status, expired_at
              // But it doesn't return: total_voice, total_text, is_unlimited (these come from the package)
              const planDetails = order.planDetails || {};
              const airaloOrderData = order.airaloOrderData || {};
              const simData = airaloOrderData.sims?.[0] || {};
              
              // Get total voice/text from stored order data
              const totalVoice = planDetails.voice || simData.voice || airaloOrderData.voice || 0;
              const totalText = planDetails.sms || simData.text || airaloOrderData.text || 0;
              const isUnlimited = planDetails.isUnlimited || airaloOrderData.is_unlimited || result.data?.is_unlimited || false;
              
              // Get total data from order if API didn't return it
              const totalData = result.data?.total || planDetails.dataAmountMb || simData.data_amount_mb || 0;
              
              const combinedUsageData = {
                ...result.data,
                // Ensure total is set even if API didn't return it
                total: result.data?.total || totalData,
                // Add total_voice and total_text from package data (not returned by usage API)
                total_voice: result.data?.total_voice || totalVoice,
                total_text: result.data?.total_text || totalText,
                is_unlimited: isUnlimited,
                // Keep the status from the API (ACTIVE, EXPIRED, RECYCLED, FINISHED, etc.)
                status: result.data?.status,
                // Keep the expired_at timestamp
                expired_at: result.data?.expired_at,
              };
              
              setUsageData(prev => ({ ...prev, [order.id]: combinedUsageData }));
            } else {
              // Mark as attempted even if failed to prevent retry loop
              // Silently fail - don't log errors to avoid console spam in development
              setUsageData(prev => ({ ...prev, [order.id]: null }));
            }
          } catch (error) {
            // Mark as attempted even if failed to prevent retry loop
            setUsageData(prev => ({ ...prev, [order.id]: null }));
            
            // Silently fail - usage data is optional and requires production credentials
            // Don't show any errors in development to avoid console spam
          } finally {
            setLoadingUsage(prev => ({ ...prev, [order.id]: false }));
          }
        }
      }
    };
    
    if (orders && orders.length > 0) {
      fetchUsageForOrders();
    }
  }, [orders]); // Only re-run when orders change
  
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
                {orders.slice(0, 6).map((order) => (
                  order && (
                    <EsimCard
                      key={order.id || order.orderId || Math.random()}
                      order={order}
                      usageData={usageData[order.id]}
                      loadingUsage={loadingUsage[order.id]}
                      onViewQRCode={onViewQRCode}
                      isRTL={isRTL}
                    />
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecentOrders;