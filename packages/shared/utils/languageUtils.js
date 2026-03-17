// Language detection and utilities for blog localization
// ============================================================================
// CENTRALIZED LANGUAGE CONFIGURATION
// This is the single source of truth for all supported languages in the system.
// Used by: countries, regions, plans, blog posts, and all translation systems.
// ============================================================================

/**
 * Complete list of supported languages for translations.
 *
 * When adding a new language:
 * 1. Add it to this array with all required properties
 * 2. Run the translation automation to populate missing translations
 * 3. No other code changes should be needed
 *
 * ISO 639-1 codes are used for consistency.
 */
export const supportedLanguages = [
  // Original languages
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', isRTL: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', isRTL: false },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', isRTL: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', isRTL: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', isRTL: true },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', isRTL: true },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', isRTL: false },
  // New languages (added for expanded translation support)
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', isRTL: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', isRTL: false },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', isRTL: false },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', isRTL: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', isRTL: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', isRTL: false },
  // Added languages (2026-03-16)
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', isRTL: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', isRTL: false },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', isRTL: false },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', isRTL: false },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', isRTL: false },
  // Added languages (2026-03-17)
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', isRTL: false },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', isRTL: false },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', isRTL: false },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', isRTL: false },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', isRTL: false },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', isRTL: false },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', isRTL: false },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', isRTL: false },
  { code: 'nb', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', isRTL: false }
];

/**
 * Map of language codes to their full names (for translation prompts)
 */
export const languageNameMap = Object.fromEntries(
  supportedLanguages.map(lang => [lang.code, lang.name])
);

/**
 * Get native language name from code (e.g., 'Русский' for Russian)
 * @param {string} code - Language code
 * @returns {string} - Native language name
 */
export const getNativeLanguageName = (code) => {
  const language = supportedLanguages.find(lang => lang.code === code);
  return language ? language.nativeName : 'English';
};

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
  const language = supportedLanguages.find(lang => lang.code === code);
  return language?.isRTL ? 'rtl' : 'ltr';
};

/**
 * Check if a language is RTL
 * @param {string} code - Language code
 * @returns {boolean}
 */
export const isRTLLanguage = (code) => {
  const language = supportedLanguages.find(lang => lang.code === code);
  return language?.isRTL ?? false;
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