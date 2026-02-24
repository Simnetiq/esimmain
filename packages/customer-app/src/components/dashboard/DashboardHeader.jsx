import React, { useMemo } from 'react';
import Link from 'next/link';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { usePathname } from 'next/navigation';

// ─── Inline SVG icons (no lucide-react) ───────────────────────────────────

const ShoppingBagIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

const WifiIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>
  </svg>
);

const DollarSignIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

const StoreIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>
  </svg>
);

const SettingsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const ArrowUpRightIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 7h10v10"/><path d="M7 17 17 7"/>
  </svg>
);

const DashboardHeader = ({ currentUser, orders = [] }) => {
  const { t, locale } = useI18n();
  const pathname = usePathname();

  const currentLanguage = useMemo(() => {
    if (locale) return locale;
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('Simnetiq-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname);
  }, [locale, pathname]);

  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  const getLocalizedUrl = (path) => {
    if (currentLanguage === 'en') return path;
    return `/${currentLanguage}${path}`;
  };

  // Calculate stats
  const totalOrders = orders.length;
  const activeEsims = orders.filter(order =>
    order?.status === 'active' || order?.status === 'completed'
  ).length;
  const totalSpent = orders.reduce((sum, order) => sum + (order?.amount || 0), 0);

  const stats = [
    { icon: ShoppingBagIcon, label: t('dashboard.totalOrders', 'Total Orders'), value: totalOrders },
    { icon: WifiIcon, label: t('dashboard.activeEsims', 'Active eSIMs'), value: activeEsims },
    { icon: DollarSignIcon, label: t('dashboard.totalSpent', 'Total Spent'), value: formatPrice(totalSpent) },
  ];

  return (
    <div className="bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
          <div className={`px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className={`text-sm sm:text-base font-medium tracking-widest uppercase text-gray-500 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('dashboard.manageOrders', 'Manage your eSIM orders and account settings')}
            </p>
            <h2 className={`text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-eerie-black max-w-5xl ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('dashboard.welcomeBack', 'Welcome back, {{name}}!', { name: currentUser.displayName || currentUser.email })}
            </h2>
          </div>
        </div>
        <div className="w-full h-px bg-gray-100" />
      </div>

      {/* Stats + Actions */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto w-full max-w-7xl">
          <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="group relative bg-gray-50 overflow-hidden hover:bg-white transition-all duration-500 p-5"
                >
                  {/* Actual value as faded watermark — zero-padded if <10 */}
                  <span
                    className={`absolute top-3 text-[5rem] lg:text-[6rem] font-semibold leading-none text-gray-400/20 select-none pointer-events-none ${isRTL ? 'left-4' : 'right-4'}`}
                    aria-hidden="true"
                  >
                    {typeof stat.value === 'number' && stat.value < 10 ? `0${stat.value}` : stat.value}
                  </span>

                  <div className="relative">
                    <div className={`w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 ${isRTL ? 'ml-auto' : ''}`}>
                      <stat.icon className="w-5 h-5 text-tufts-blue" />
                    </div>
                    <p className={`text-xs font-medium tracking-widest uppercase text-tufts-blue ${isRTL ? 'text-right' : 'text-left'}`}>
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className={`flex flex-wrap gap-3 ${isRTL ? 'justify-end' : 'justify-start'}`}>
              <Link
                href={getLocalizedUrl('/esim-plans')}
                className="relative inline-flex items-center justify-center pl-5 pr-12 py-3 bg-eerie-black text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
              >
                <span>{t('dashboard.browseEsims', 'Browse eSIMs')}</span>
                <span className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white flex items-center justify-center ${isRTL ? 'left-3' : 'right-3'}`}>
                  <ArrowUpRightIcon className="w-3.5 h-3.5 text-eerie-black" />
                </span>
              </Link>

              <Link
                href={getLocalizedUrl('/settings')}
                className={`inline-flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-200 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <SettingsIcon className="w-4 h-4" />
                <span>{t('dashboard.accountSettings', 'Account Settings')}</span>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
