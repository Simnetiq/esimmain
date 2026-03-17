'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getSupabase } from '../lib/supabase';

const I18nContext = createContext();

// In-memory cache for translations to prevent re-fetching
const translationCache = {};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    // Return a fallback context instead of throwing an error
    return {
      locale: 'en',
      t: (key, fallback, variables) => {
        let result = fallback || key;
        if (typeof result === 'string' && variables && typeof variables === 'object') {
          Object.keys(variables).forEach(varKey => {
            const placeholder = `{{${varKey}}}`;
            result = result.replace(new RegExp(placeholder, 'g'), variables[varKey]);
          });
        }
        return result;
      },
      translations: {},
      isLoading: true,
      changeLanguage: async () => {},
    };
  }
  return context;
};

// Helper function to detect language from pathname
const getLanguageFromPathname = (pathname) => {
  const langCodes = ['he', 'ar', 'ru', 'de', 'fr', 'es', 'pt', 'ja', 'hi', 'zh', 'pl', 'uk', 'it', 'ko', 'nl', 'th', 'tr', 'vi', 'id', 'sv', 'cs', 'el', 'ro', 'da', 'fi', 'nb'];
  for (const code of langCodes) {
    if (pathname.startsWith(`/${code}/`) || pathname === `/${code}`) return code;
  }
  return 'en';
};

/**
 * I18nProvider — accepts optional `initialTranslations` and `initialLocale`
 * props so that SSR can render correct translated text (no hydration mismatch).
 *
 * When `initialTranslations` is provided (from server-side JSON read), the
 * provider initialises with those translations and skips the client-side
 * fetch for the initial locale. Navigation to other locales still triggers
 * a client-side fetch.
 */
export const I18nProvider = ({ children, initialTranslations, initialLocale }) => {
  const pathname = usePathname();
  const pathnameLocale = getLanguageFromPathname(pathname);

  // Determine whether we have server-provided translations for this locale
  const hasInitialData =
    initialTranslations &&
    Object.keys(initialTranslations).length > 0 &&
    initialLocale === pathnameLocale;

  // Seed the in-memory cache so client-side navigation back to this locale
  // won't trigger a fetch either.
  if (hasInitialData && !translationCache[initialLocale]) {
    translationCache[initialLocale] = initialTranslations;
  }

  const [locale, setLocale] = useState(pathnameLocale);
  const [translations, setTranslations] = useState(
    hasInitialData ? initialTranslations : (translationCache[pathnameLocale] || {})
  );
  const [isLoading, setIsLoading] = useState(
    hasInitialData || translationCache[pathnameLocale] ? false : true
  );
  // Track which locale the current translations belong to so we can detect
  // stale state even when locale === pathnameLocale (e.g. navigating away and
  // back to the same locale — useState keeps old translations but server has {}).
  const [translationsLocale, setTranslationsLocale] = useState(
    hasInitialData ? initialLocale : (translationCache[pathnameLocale] ? pathnameLocale : null)
  );

  // Synchronous state reset during render — the provider persists in the layout
  // so useState does NOT re-initialize on navigation. Reset whenever the URL
  // locale changes OR translations are stale (loaded for a previous locale).
  if (locale !== pathnameLocale || (translationsLocale && translationsLocale !== pathnameLocale)) {
    setLocale(pathnameLocale);
    // If we have cached translations for the new locale, use them immediately
    if (translationCache[pathnameLocale]) {
      setTranslations(translationCache[pathnameLocale]);
      setTranslationsLocale(pathnameLocale);
      setIsLoading(false);
    } else {
      setTranslations({});
      setTranslationsLocale(null);
      setIsLoading(true);
    }
  }

  useEffect(() => {
    const currentLocale = getLanguageFromPathname(pathname);

    if (translationCache[currentLocale]) {
      setTranslations(translationCache[currentLocale]);
      setTranslationsLocale(currentLocale);
      setIsLoading(false);
    } else {
      loadTranslations(currentLocale);
    }
  }, [pathname]);

  const loadTranslations = async (localeToLoad) => {
    try {
      setIsLoading(true);

      if (translationCache[localeToLoad]) {
        setTranslations(translationCache[localeToLoad]);
        setTranslationsLocale(localeToLoad);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/locales/${localeToLoad}/common.json`, {
        cache: 'force-cache',
      });

      if (response.ok) {
        const data = await response.json();
        translationCache[localeToLoad] = data;
        setTranslations(data);
        setTranslationsLocale(localeToLoad);
      }
    } catch (error) {
      console.error(`Failed to load translations for ${localeToLoad}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const t = (key, fallback = '', variables = {}) => {
    const keys = key.split('.');
    let value = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }

    let result = (typeof value === 'string' ? value : undefined) || fallback || key;

    if (typeof result === 'string' && variables && typeof variables === 'object') {
      Object.keys(variables).forEach(varKey => {
        const placeholder = `{{${varKey}}}`;
        result = result.replace(new RegExp(placeholder, 'g'), variables[varKey]);
      });
    }

    return result;
  };

  const changeLanguage = async (newLocale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('Simnetiq-language', newLocale);

      if (window.saveLanguageToCookie) {
        window.saveLanguageToCookie(newLocale);
      }
    }

    // Save to Supabase if user is logged in
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('users')
          .update({ preferred_language: newLocale, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      }
    } catch {
      // Not logged in or Supabase not available — that's fine
    }

    setLocale(newLocale);
    await loadTranslations(newLocale);
  };

  const value = {
    locale,
    t,
    translations,
    isLoading,
    changeLanguage,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};
