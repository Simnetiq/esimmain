// Language detection and utilities for blog localization

export const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' }
];

export const supportedLanguageCodes = supportedLanguages.map(lang => lang.code);

/**
 * Detect current language from URL path
 * @param {string} pathname - Current pathname (e.g., '/es/blog', '/blog', '/fr/blog/post-slug')
 * @returns {string} - Language code (e.g., 'es', 'en', 'fr')
 */
export const detectLanguageFromPath = (pathname) => {
  if (!pathname) return 'en';
  
  // Remove leading slash and split path
  const pathSegments = pathname.replace(/^\//, '').split('/');
  const firstSegment = pathSegments[0];
  
  // Check if first segment matches a language code directly
  if (supportedLanguageCodes.includes(firstSegment)) {
    return firstSegment;
  }
  
  // Check if first segment matches old language route names (for backward compatibility)
  const languageRoutes = {
    'spanish': 'es',
    'french': 'fr', 
    'german': 'de',
    'arabic': 'ar',
    'hebrew': 'he',
    'russian': 'ru'
  };
  
  return languageRoutes[firstSegment] || 'en';
};

/**
 * Get language name from code
 * @param {string} code - Language code
 * @returns {string} - Language name
 */
export const getLanguageName = (code) => {
  const language = supportedLanguages.find(lang => lang.code === code);
  return language ? language.name : 'English';
};

/**
 * Get language flag from code
 * @param {string} code - Language code
 * @returns {string} - Language flag emoji
 */
export const getLanguageFlag = (code) => {
  const language = supportedLanguages.find(lang => lang.code === code);
  return language ? language.flag : '🇺🇸';
};

/**
 * Get text direction for language
 * @param {string} code - Language code
 * @returns {string} - 'rtl' or 'ltr'
 */
export const getLanguageDirection = (code) => {
  const rtlLanguages = ['ar', 'he']; // Arabic and Hebrew are RTL
  return rtlLanguages.includes(code) ? 'rtl' : 'ltr';
};

/**
 * Generate localized blog URL
 * @param {string} slug - Blog post slug
 * @param {string} language - Language code
 * @returns {string} - Localized URL
 */
export const getLocalizedBlogUrl = (slug, language = 'en') => {
  if (language === 'en') {
    return `/blog/${slug}`;
  }
  
  // Use language codes directly in URLs
  if (supportedLanguageCodes.includes(language)) {
    return `/${language}/blog/${slug}`;
  }
  
  return `/blog/${slug}`;
};

/**
 * Generate localized blog list URL
 * @param {string} language - Language code
 * @returns {string} - Localized blog list URL
 */
export const getLocalizedBlogListUrl = (language = 'en') => {
  if (language === 'en') {
    return '/blog';
  }
  
  // Use language codes directly in URLs
  if (supportedLanguageCodes.includes(language)) {
    return `/${language}/blog`;
  }
  
  return '/blog';
};