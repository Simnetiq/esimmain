'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

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
        // Handle interpolation even in fallback
        if (typeof result === 'string' && variables && typeof variables === 'object') {
          Object.keys(variables).forEach(varKey => {
            const placeholder = `{{${varKey}}}`;
            result = result.replace(new RegExp(placeholder, 'g'), variables[varKey]);
          });
        }
        return result;
      },
      translations: {},
      isLoading: true, // Match provider's initial state to prevent hydration mismatch
      changeLanguage: async () => {}, // Add fallback changeLanguage function
    };
  }
  return context;
};

// Helper function to detect language from pathname
const getLanguageFromPathname = (pathname) => {
  if (pathname.startsWith('/he/') || pathname === '/he') return 'he';
  if (pathname.startsWith('/ar/') || pathname === '/ar') return 'ar';
  if (pathname.startsWith('/ru/') || pathname === '/ru') return 'ru';
  if (pathname.startsWith('/de/') || pathname === '/de') return 'de';
  if (pathname.startsWith('/fr/') || pathname === '/fr') return 'fr';
  if (pathname.startsWith('/es/') || pathname === '/es') return 'es';
  return 'en';
};

export const I18nProvider = ({ children }) => {
  const pathname = usePathname();
  
  // Get initial locale from pathname
  const initialLocale = getLanguageFromPathname(pathname);
  
  const [locale, setLocale] = useState(initialLocale);
  const [translations, setTranslations] = useState(() => {
    // Check if we have cached translations for initial locale
    if (translationCache[initialLocale]) {
      return translationCache[initialLocale];
    }
    return {};
  });
  const [isLoading, setIsLoading] = useState(!translationCache[initialLocale]);
  const [currentUser, setCurrentUser] = useState(null);

  // Load translations on mount and when locale changes
  useEffect(() => {
    const currentLocale = getLanguageFromPathname(pathname);
    
    // Update locale if pathname changed
    if (currentLocale !== locale) {
      setLocale(currentLocale);
    }
    
    // Load translations if not cached
    if (!translationCache[currentLocale]) {
      loadTranslations(currentLocale);
    } else if (translations !== translationCache[currentLocale]) {
      // Use cached translations
      setTranslations(translationCache[currentLocale]);
      setIsLoading(false);
    }
  }, [pathname]);

  // Listen to auth state changes
  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  // Load language preference from Firebase for logged-in users
  const loadUserLanguagePreference = async (user) => {
    if (!db) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.preferredLanguage) {
          return userData.preferredLanguage;
        }
      }
    } catch {
    }
    return null;
  };

  // Save language preference to Firebase for logged-in users
  const saveUserLanguagePreference = async (user, language) => {
    if (!db) return;
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        preferredLanguage: language,
        updatedAt: new Date()
      });
    } catch {
    }
  };

  // Load translations - simple and straightforward
  const loadTranslations = async (localeToLoad) => {
    try {
      setIsLoading(true);
      
      // Check cache first
      if (translationCache[localeToLoad]) {
        setTranslations(translationCache[localeToLoad]);
        setIsLoading(false);
        return;
      }
      
      // Load translations
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
        return fallback || key;
      }
    }
    
    let result = typeof value === 'string' ? value : fallback || key;
    
    // Handle interpolation with variables like {{name}}, {{number}}, etc.
    if (typeof result === 'string' && variables && typeof variables === 'object') {
      Object.keys(variables).forEach(varKey => {
        const placeholder = `{{${varKey}}}`;
        result = result.replace(new RegExp(placeholder, 'g'), variables[varKey]);
      });
    }
    
    return result;
  };

  const changeLanguage = async (newLocale) => {
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('Simnetiq-language', newLocale);
      
      // Also save to cookies as backup
      if (window.saveLanguageToCookie) {
        window.saveLanguageToCookie(newLocale);
      }
    }
    
    // Save to Firebase if user is logged in
    if (currentUser) {
      await saveUserLanguagePreference(currentUser, newLocale);
    }
    
    // Update locale state and load translations
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

