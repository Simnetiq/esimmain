import React from 'react';
import Link from 'next/link';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Wifi, DollarSign, Store, Settings, ArrowRight } from 'lucide-react';

const DashboardHeader = ({ currentUser, orders = [] }) => {
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

  // Generate localized URLs
  const getLocalizedUrl = (path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  };

  // Calculate stats
  const totalOrders = orders.length;
  const activeEsims = orders.filter(order => 
    order?.status === 'active' || order?.status === 'completed'
  ).length;
  const totalSpent = orders.reduce((sum, order) => sum + (order?.amount || 0), 0);

  return (
    <div className="bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header Section */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl w-full lg:mt-20 mt-10">
          
          <div className="px-4 pt-6 lg:pt-0 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            <p className="font-mono text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500 rtl:font-bold rtl:tracking-tight">
              {t('dashboard.manageOrders', 'Manage your eSIM orders and account settings')}
            </p>
            <h2 className="my-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl">
              {t('dashboard.welcomeBack', 'Welcome back, {{name}}!', { name: currentUser.displayName || currentUser.email })}
            </h2>

            {/* Divider */}
            <div className="w-full h-px bg-gray-200 my-4"></div>

            {/* Stats Line */}
            <div className={`flex flex-wrap items-center gap-4 sm:gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {/* Total Orders */}
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 bg-tufts-blue/10 rounded flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-tufts-blue" />
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-xs text-gray-500">{t('dashboard.totalOrders', 'Total Orders')}</p>
                  <p className="text-sm font-semibold text-gray-900">{totalOrders}</p>
                </div>
              </div>

              <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>

              {/* Active eSIMs */}
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 bg-tufts-blue/10 rounded flex items-center justify-center">
                  <Wifi className="w-4 h-4 text-tufts-blue" />
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-xs text-gray-500">{t('dashboard.activeEsims', 'Active eSIMs')}</p>
                  <p className="text-sm font-semibold text-gray-900">{activeEsims}</p>
                </div>
              </div>

              <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>

              {/* Total Spent */}
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 bg-tufts-blue/10 rounded flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-tufts-blue" />
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-xs text-gray-500">{t('dashboard.totalSpent', 'Total Spent')}</p>
                  <p className="text-sm font-semibold text-gray-900">{formatPrice(totalSpent)}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6">
              <div className={`flex flex-wrap gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {/* Browse eSIMs */}
                <Link 
                  href={getLocalizedUrl('/esim-plans')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 bg-tufts-blue text-white text-sm font-medium rounded-lg hover:bg-tufts-blue/90 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Store className="w-4 h-4" />
                  {t('dashboard.browseEsims', 'Browse eSIMs')}
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
                
                {/* Account Settings */}
                <Link 
                  href={getLocalizedUrl('/settings')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Settings className="w-4 h-4" />
                  {t('dashboard.accountSettings', 'Account Settings')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Full width gray line */}
      <div className="w-full h-px bg-gray-100 mt-6"></div>
    </div>
  );
};

export default DashboardHeader;
