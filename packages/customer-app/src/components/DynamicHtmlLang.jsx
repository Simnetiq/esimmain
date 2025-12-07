'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';

/**
 * Client component that dynamically updates the html lang and dir attributes
 * based on the current language from I18nContext or URL path
 */
export default function DynamicHtmlLang() {
  const pathname = usePathname();
  const { locale } = useI18n();

  useEffect(() => {
    // Detect current language
    const currentLanguage = locale || detectLanguageFromPath(pathname) || 'en';
    const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

    // Update html element attributes
    const htmlElement = document.documentElement;
    if (htmlElement) {
      htmlElement.setAttribute('lang', currentLanguage);
      htmlElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    }
  }, [pathname, locale]);

  return null; // This component doesn't render anything
}

