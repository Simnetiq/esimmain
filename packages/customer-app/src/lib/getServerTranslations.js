import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Server-side translation loader.
 *
 * Reads the JSON file from `public/locales/{locale}/common.json` at build /
 * request time so that SSR HTML contains correct translated strings instead of
 * English fallbacks.
 *
 * Uses a module-level cache so each locale is read from disk at most once per
 * server process (works with both `next dev` and production).
 */

const SUPPORTED_LOCALES = new Set([
  'en', 'ar', 'cs', 'da', 'de', 'el', 'es', 'fi', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko',
  'nb', 'nl', 'pl', 'pt', 'ro', 'ru', 'sv', 'th', 'tr', 'uk', 'vi', 'zh',
]);

/** @type {Map<string, Record<string, unknown>>} */
const cache = new Map();

/**
 * @param {string} locale - two-letter locale code
 * @returns {Record<string, unknown>} parsed translations object (empty {} on failure)
 */
export function getServerTranslations(locale) {
  const safeLocale = SUPPORTED_LOCALES.has(locale) ? locale : 'en';

  if (cache.has(safeLocale)) {
    return cache.get(safeLocale);
  }

  try {
    // process.cwd() points to the customer-app package root during Next.js build/serve
    const filePath = join(process.cwd(), 'public', 'locales', safeLocale, 'common.json');
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    cache.set(safeLocale, data);
    return data;
  } catch (err) {
    console.error(`[getServerTranslations] Failed to load locale "${safeLocale}":`, err.message);
    // Return empty object so `t()` falls back to the hardcoded fallback strings
    return {};
  }
}

/**
 * Detects the locale from the URL pathname.
 * @param {string} pathname
 * @returns {string}
 */
export function getLocaleFromPathname(pathname) {
  if (!pathname || pathname === '/') return 'en';
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return SUPPORTED_LOCALES.has(firstSegment) ? firstSegment : 'en';
}
