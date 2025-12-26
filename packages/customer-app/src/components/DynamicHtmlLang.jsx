'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';

/**
 * Client component that dynamically updates the html lang and dir attributes
 * based on the current language from I18nContext or URL path.
 * Also dynamically loads RTL CSS only when needed to avoid render-blocking.
 */
export default function DynamicHtmlLang() {
  const pathname = usePathname();
  const { locale } = useI18n();
  const rtlStylesLoaded = useRef(false);

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

    // Dynamically load RTL styles only when needed
    if (isRTL && !rtlStylesLoaded.current) {
      rtlStylesLoaded.current = true;
      // Import RTL CSS dynamically
      import('../../app/rtl.css').catch(() => {
        // CSS might already be loaded statically, that's fine
      });
    }
  }, [pathname, locale]);

  return null; // This component doesn't render anything
}

