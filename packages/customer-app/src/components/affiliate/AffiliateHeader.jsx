import React from 'react';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';

const AffiliateHeader = ({ onBack }) => {
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

  return (
    <div className={`flex items-center justify-start ${isRTL ? 'space-x-reverse space-x-3 sm:space-x-4' : 'space-x-3 sm:space-x-4'}`}>
      <button
        onClick={onBack}
        className="p-1.5 sm:p-2 rounded-full transition-colors flex-shrink-0"
      >
        <ArrowLeft className={`w-4 h-4 sm:w-5 sm:h-5 text-cool-black ${isRTL ? 'rotate-180' : ''}`} />
      </button>
      <div className={`flex items-center min-w-0 ${isRTL ? 'space-x-reverse space-x-2 sm:space-x-3' : 'space-x-2 sm:space-x-3'}`}>
        <div className="bg-tufts-blue/10 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-tufts-blue" />
        </div>
        <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-medium tracking-tight text-eerie-black truncate">{t('affiliate.title', 'Affiliate Program')}</h1>
          <p className="text-sm sm:text-base text-cool-black truncate">{t('affiliate.subtitle', 'Earn money by referring friends')}</p>
        </div>
      </div>
    </div>
  );
};

export default AffiliateHeader;
