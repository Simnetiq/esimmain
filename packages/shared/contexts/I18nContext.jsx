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
  const langCodes = ['he', 'ar', 'ru', 'de', 'fr', 'es', 'pt', 'ja', 'hi', 'zh', 'pl', 'uk', 'it', 'ko', 'nl', 'th', 'tr'];
  for (const code of langCodes) {
    if (pathname.startsWith(`/${code}/`) || pathname === `/${code}`) return code;
  }
  return 'en';
};

export const I18nProvider = ({ children }) => {
  const pathname = usePathname();
  const initialLocale = getLanguageFromPathname(pathname);
  
  const [locale, setLocale] = useState(initialLocale);
  const [translations, setTranslations] = useState(() => {
    if (translationCache[initialLocale]) {
      return translationCache[initialLocale];
    }
    return {};
  });
  const [isLoading, setIsLoading] = useState(!translationCache[initialLocale]);

  useEffect(() => {
    const currentLocale = getLanguageFromPathname(pathname);
    
    if (currentLocale !== locale) {
      setLocale(currentLocale);
    }
    
    if (!translationCache[currentLocale]) {
      loadTranslations(currentLocale);
    } else if (translations !== translationCache[currentLocale]) {
      setTranslations(translationCache[currentLocale]);
      setIsLoading(false);
    }
  }, [pathname]);

  const loadTranslations = async (localeToLoad) => {
    try {
      setIsLoading(true);
      
      if (translationCache[localeToLoad]) {
        setTranslations(translationCache[localeToLoad]);
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
