'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageName, getLanguageFlag, getLocalizedBlogUrl, getLocalizedBlogListUrl } from '@esim/shared/utils/languageUtils';

const LanguageSelector = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, changeLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', name: getLanguageName('en'), flag: getLanguageFlag('en'), route: '/' },
    { code: 'he', name: getLanguageName('he'), flag: getLanguageFlag('he'), route: '/he' },
    { code: 'ru', name: getLanguageName('ru'), flag: getLanguageFlag('ru'), route: '/ru' },
    { code: 'ar', name: getLanguageName('ar'), flag: getLanguageFlag('ar'), route: '/ar' },
    { code: 'de', name: getLanguageName('de'), flag: getLanguageFlag('de'), route: '/de' },
    { code: 'fr', name: getLanguageName('fr'), flag: getLanguageFlag('fr'), route: '/fr' },
    { code: 'es', name: getLanguageName('es'), flag: getLanguageFlag('es'), route: '/es' }
  ];

  // Determine current language from multiple sources
  const getCurrentLanguage = () => {
    // First try to use the I18n context locale
    if (locale) {
      return languages.find(lang => lang.code === locale) || languages.find(lang => lang.code === 'en');
    }
    
    // Check localStorage for saved language preference
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('Simnetiq-language');
      if (savedLanguage) {
        const savedLang = languages.find(lang => lang.code === savedLanguage);
        if (savedLang) {
          return savedLang;
        }
      }
    }
    
    // Fallback to pathname detection for both old and new routes
    if (pathname.startsWith('/he')) return languages.find(lang => lang.code === 'he');
    if (pathname.startsWith('/ar')) return languages.find(lang => lang.code === 'ar');
    if (pathname.startsWith('/ru')) return languages.find(lang => lang.code === 'ru');
    if (pathname.startsWith('/de')) return languages.find(lang => lang.code === 'de');
    if (pathname.startsWith('/fr')) return languages.find(lang => lang.code === 'fr');
    if (pathname.startsWith('/es')) return languages.find(lang => lang.code === 'es');
    // Support old routes for backward compatibility
    if (pathname.startsWith('/hebrew')) return languages.find(lang => lang.code === 'he');
    if (pathname.startsWith('/arabic')) return languages.find(lang => lang.code === 'ar');
    if (pathname.startsWith('/russian')) return languages.find(lang => lang.code === 'ru');
    if (pathname.startsWith('/german')) return languages.find(lang => lang.code === 'de');
    if (pathname.startsWith('/french')) return languages.find(lang => lang.code === 'fr');
    if (pathname.startsWith('/spanish')) return languages.find(lang => lang.code === 'es');
    return languages.find(lang => lang.code === 'en'); // default to English
  };

  const currentLanguage = getCurrentLanguage();

  const getLocalizedPath = (languageCode, currentPath) => {
    
    // Handle blog URLs specially
    if (currentPath.includes('/blog')) {
      // Check for blog post with language prefix first
      const langBlogPostMatch = currentPath.match(/^\/(he|ar|ru|de|fr|es)\/blog\/(.+)$/);
      if (langBlogPostMatch) {
        const slug = langBlogPostMatch[2];
        return getLocalizedBlogUrl(slug, languageCode);
      }
      
      // Check for root blog post
      const blogPostMatch = currentPath.match(/^\/blog\/(.+)$/);
      if (blogPostMatch) {
        const slug = blogPostMatch[1];
        return getLocalizedBlogUrl(slug, languageCode);
      }
      
      // Check for localized blog list page
      const langBlogListMatch = currentPath.match(/^\/(he|ar|ru|de|fr|es)\/blog\/?$/);
      if (langBlogListMatch) {
        return getLocalizedBlogListUrl(languageCode);
      }
      
      // It's a root blog list page
      if (currentPath === '/blog' || currentPath === '/blog/') {
        return getLocalizedBlogListUrl(languageCode);
      }
    }
    
    // Remove any existing language prefix from the path
    let cleanPath = currentPath;
    const languagePrefixes = [
      '/he', '/ar', '/ru', '/de', '/fr', '/es', // New language codes
      '/hebrew', '/arabic', '/russian', '/german', '/french', '/spanish' // Old language names
    ];
    
    for (const prefix of languagePrefixes) {
      // Make sure we match the exact language prefix followed by / or end of string
      if (cleanPath === prefix || cleanPath.startsWith(prefix + '/')) {
        cleanPath = cleanPath.substring(prefix.length) || '/';
        break;
      }
    }
    
    // Ensure cleanPath starts with /
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }
    
    // Get the new language prefix using language codes
    const languageRoutes = {
      'en': '',
      'he': '/he',
      'ar': '/ar', 
      'ru': '/ru',
      'de': '/de',
      'fr': '/fr',
      'es': '/es'
    };
    
    const newPrefix = languageRoutes[languageCode] || '';
    
    // Handle special cases for English
    if (languageCode === 'en') {
      // For English, remove language prefix but keep the path
      const newPath = cleanPath === '/' ? '/' : cleanPath;
      return newPath;
    }
    
    // For other languages, add the language prefix
    const newPath = `${newPrefix}${cleanPath}`;
    return newPath;
  };

  const handleLanguageChange = async (language) => {
    setIsOpen(false);
    
    // IMPORTANT: Change language first (this saves to localStorage and Firebase)
    if (changeLanguage && typeof changeLanguage === 'function') {
      await changeLanguage(language.code);
    } else {
      // Fallback: save to localStorage if changeLanguage is not available
      if (typeof window !== 'undefined') {
        localStorage.setItem('Simnetiq-language', language.code);
      }
    }
    
    // Get the localized path for the current page
    const localizedPath = getLocalizedPath(language.code, pathname);
    
    // Small delay to ensure language preference is saved
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Navigate to the same page but in the new language
    router.push(localizedPath);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-tufts-blue transition-colors rounded-md hover:bg-gray-100"
        aria-label="Select Language"
      >
        <span>{currentLanguage.flag}</span>
        <span className="hidden lg:inline text-xs">{currentLanguage.code.toUpperCase()}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center space-x-3 ${
                  language.code === locale ? 'bg-tufts-blue text-white hover:bg-tufts-blue' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{language.flag}</span>
                <span>{language.name}</span>
                {language.code === locale && (
                  <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
