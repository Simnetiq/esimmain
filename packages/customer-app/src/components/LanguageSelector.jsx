'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getNativeLanguageName, getLanguageFlag, getLocalizedBlogUrl, getLocalizedBlogListUrl } from '@esim/shared/utils/languageUtils';
import { Globe, ChevronDown, Check } from 'lucide-react';

const LanguageSelector = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, changeLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  // Listen for navbar hide event to close dropdown
  useEffect(() => {
    const handleCloseDropdowns = () => {
      setIsOpen(false);
    };

    window.addEventListener('closeNavbarDropdowns', handleCloseDropdowns);
    return () => window.removeEventListener('closeNavbarDropdowns', handleCloseDropdowns);
  }, []);

  const languages = [
    { code: 'en', name: getNativeLanguageName('en'), flag: getLanguageFlag('en'), route: '/' },
    { code: 'he', name: getNativeLanguageName('he'), flag: getLanguageFlag('he'), route: '/he' },
    { code: 'ru', name: getNativeLanguageName('ru'), flag: getLanguageFlag('ru'), route: '/ru' },
    { code: 'ar', name: getNativeLanguageName('ar'), flag: getLanguageFlag('ar'), route: '/ar' },
    { code: 'de', name: getNativeLanguageName('de'), flag: getLanguageFlag('de'), route: '/de' },
    { code: 'fr', name: getNativeLanguageName('fr'), flag: getLanguageFlag('fr'), route: '/fr' },
    { code: 'es', name: getNativeLanguageName('es'), flag: getLanguageFlag('es'), route: '/es' }
  ];

  // Determine current language from context or pathname (no localStorage during render to avoid hydration mismatch)
  const currentLanguage = React.useMemo(() => {
    if (locale) {
      return languages.find(lang => lang.code === locale) || languages.find(lang => lang.code === 'en');
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
    return languages.find(lang => lang.code === 'en');
  }, [locale, pathname]);

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
    
    // IMPORTANT: Change language first (this saves to localStorage and Supabase)
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
        className="flex items-center gap-1.5 py-2 px-2 lg:px-3 text-sm font-medium text-eerie-black hover:text-tufts-blue transition-colors rounded-md"
        aria-label="Select Language"
      >
        {/* Mobile: Globe icon only */}
        <Globe className="w-5 h-5 lg:hidden" />
        {/* Desktop: Language name + chevron */}
        <span className="hidden lg:inline text-sm">{currentLanguage.name}</span>
        <ChevronDown 
          className={`w-4 h-4 hidden lg:block transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200  shadow-xl shadow-gray-100/30 z-50">
            <ul className="p-2 text-sm font-medium text-gray-700">
            {languages.map((language) => (
                <li key={language.code}>
              <button
                onClick={() => handleLanguageChange(language)}
                    className={`inline-flex items-center justify-between w-full p-2 rounded hover:bg-gray-100 hover:text-eerie-black transition-colors ${
                      language.code === locale ? 'bg-tufts-blue/10 text-tufts-blue' : ''
                }`}
              >
                <span>{language.name}</span>
                {language.code === locale && (
                      <Check className="w-4 h-4" />
                )}
              </button>
                </li>
            ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;
