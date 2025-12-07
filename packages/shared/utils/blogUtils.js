/**
 * Blog utility functions for categories, view counts, and translations
 */

/**
 * Category color mapping
 * Each category gets a distinct color for visual differentiation
 */
export const categoryColors = {
  technology: 'bg-tufts-blue text-white',
  travel: 'bg-orange-500 text-white',
  general: 'bg-gray-800 text-white',
  tutorial: 'bg-teal-600 text-white',
  tutorials: 'bg-teal-600 text-white',
  business: 'bg-yellow-500 text-white',
  security: 'bg-red-600 text-white',
  innovation: 'bg-green-600 text-white',
  guides: 'bg-green-600 text-white',
  tips: 'bg-purple-600 text-white',
  news: 'bg-red-600 text-white',
  esim: 'bg-cyan-600 text-white',
  connectivity: 'bg-indigo-600 text-white',
  destinations: 'bg-amber-600 text-white',
  reviews: 'bg-pink-600 text-white',
  // Default fallback
  default: 'bg-tufts-blue text-white'
};

/**
 * Get color classes for a category
 * @param {string} category - The category name
 * @returns {string} Tailwind CSS classes for the category
 */
export const getCategoryColor = (category) => {
  if (!category) return categoryColors.default;
  
  const normalizedCategory = category.toLowerCase().trim();
  return categoryColors[normalizedCategory] || categoryColors.default;
};

/**
 * Category translations for all supported languages
 */
export const categoryTranslations = {
  technology: {
    en: 'Technology',
    es: 'Tecnología',
    fr: 'Technologie',
    de: 'Technologie',
    ar: 'تكنولوجيا',
    he: 'טכנולוגיה',
    ru: 'Технологии'
  },
  travel: {
    en: 'Travel',
    es: 'Viajes',
    fr: 'Voyage',
    de: 'Reisen',
    ar: 'سفر',
    he: 'טיולים',
    ru: 'Путешествия'
  },
  guides: {
    en: 'Guides',
    es: 'Guías',
    fr: 'Guides',
    de: 'Anleitungen',
    ar: 'أدلة',
    he: 'מדריכים',
    ru: 'Руководства'
  },
  tips: {
    en: 'Tips',
    es: 'Consejos',
    fr: 'Conseils',
    de: 'Tipps',
    ar: 'نصائح',
    he: 'טיפים',
    ru: 'Советы'
  },
  news: {
    en: 'News',
    es: 'Noticias',
    fr: 'Actualités',
    de: 'Nachrichten',
    ar: 'أخبار',
    he: 'חדשות',
    ru: 'Новости'
  },
  general: {
    en: 'General',
    es: 'General',
    fr: 'Général',
    de: 'Allgemein',
    ar: 'عام',
    he: 'כללי',
    ru: 'Общее'
  },
  esim: {
    en: 'eSIM',
    es: 'eSIM',
    fr: 'eSIM',
    de: 'eSIM',
    ar: 'eSIM',
    he: 'eSIM',
    ru: 'eSIM'
  },
  connectivity: {
    en: 'Connectivity',
    es: 'Conectividad',
    fr: 'Connectivité',
    de: 'Konnektivität',
    ar: 'الاتصال',
    he: 'קישוריות',
    ru: 'Связь'
  },
  destinations: {
    en: 'Destinations',
    es: 'Destinos',
    fr: 'Destinations',
    de: 'Reiseziele',
    ar: 'وجهات',
    he: 'יעדים',
    ru: 'Направления'
  },
  tutorials: {
    en: 'Tutorials',
    es: 'Tutoriales',
    fr: 'Tutoriels',
    de: 'Anleitungen',
    ar: 'دروس',
    he: 'הדרכות',
    ru: 'Учебники'
  },
  reviews: {
    en: 'Reviews',
    es: 'Reseñas',
    fr: 'Avis',
    de: 'Bewertungen',
    ar: 'مراجعات',
    he: 'ביקורות',
    ru: 'Обзоры'
  },
  business: {
    en: 'Business',
    es: 'Negocios',
    fr: 'Affaires',
    de: 'Geschäft',
    ar: 'أعمال',
    he: 'עסקים',
    ru: 'Бизнес'
  }
};

/**
 * Translate category name to specified language
 * @param {string} category - The category name
 * @param {string} language - The target language code
 * @returns {string} Translated category name
 */
export const translateCategory = (category, language = 'en') => {
  if (!category) return '';
  
  const normalizedCategory = category.toLowerCase().trim();
  const translations = categoryTranslations[normalizedCategory];
  
  if (!translations) return category;
  
  return translations[language] || translations.en || category;
};

/**
 * Format view count with K/M suffix
 * @param {number} views - The view count
 * @returns {string} Formatted view count
 */
export const formatViewCount = (views) => {
  if (!views || views === 0) return '0';
  
  // Format large numbers with K/M suffix
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  
  return views.toString();
};

/**
 * View count translations for all supported languages
 */
export const viewTranslations = {
  en: {
    singular: 'view',
    plural: 'views',
    format: (count) => `${count} ${count === 1 ? 'view' : 'views'}`
  },
  es: {
    singular: 'vista',
    plural: 'vistas',
    format: (count) => `${count} ${count === 1 ? 'vista' : 'vistas'}`
  },
  fr: {
    singular: 'vue',
    plural: 'vues',
    format: (count) => `${count} ${count === 1 ? 'vue' : 'vues'}`
  },
  de: {
    singular: 'Aufruf',
    plural: 'Aufrufe',
    format: (count) => `${count} ${count === 1 ? 'Aufruf' : 'Aufrufe'}`
  },
  ar: {
    singular: 'مشاهدة',
    plural: 'مشاهدة',
    format: (count) => `${count} مشاهدة`
  },
  he: {
    singular: 'צפייה',
    plural: 'צפיות',
    format: (count) => `${count} צפיות`
  },
  ru: {
    singular: 'просмотр',
    plural: 'просмотров',
    format: (count) => {
      // Russian has complex plural rules
      const lastDigit = count % 10;
      const lastTwoDigits = count % 100;
      
      if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return `${count} просмотров`;
      } else if (lastDigit === 1) {
        return `${count} просмотр`;
      } else if (lastDigit >= 2 && lastDigit <= 4) {
        return `${count} просмотра`;
      } else {
        return `${count} просмотров`;
      }
    }
  }
};

/**
 * Translate view count to specified language
 * @param {number} views - The view count
 * @param {string} language - The target language code
 * @returns {string} Translated view count
 */
export const translateViews = (views, language = 'en') => {
  const formattedViews = formatViewCount(views);
  const translation = viewTranslations[language] || viewTranslations.en;
  
  return translation.format(formattedViews);
};

/**
 * Format date for blog posts
 * @param {string|Date} date - The date to format
 * @param {string} language - The target language code
 * @returns {string} Formatted date
 */
export const formatBlogDate = (date, language = 'en') => {
  if (!date) return '';
  
  return new Date(date).toLocaleDateString(language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Get all available categories
 * @returns {Array<string>} Array of category names
 */
export const getAllCategories = () => {
  return Object.keys(categoryTranslations);
};

/**
 * Get all categories with their colors
 * @param {string} language - The target language code
 * @returns {Array<Object>} Array of category objects with name, color, and translation
 */
export const getCategoriesWithColors = (language = 'en') => {
  return getAllCategories().map(category => ({
    key: category,
    name: translateCategory(category, language),
    color: getCategoryColor(category)
  }));
};

