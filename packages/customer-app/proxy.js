import { NextResponse } from 'next/server';

// Note: English (en) uses root-level pages, other languages have their own folders
const languagesWithFolders = ['ar', 'cs', 'da', 'de', 'el', 'es', 'fi', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'nb', 'nl', 'pl', 'pt', 'ro', 'ru', 'sv', 'th', 'tr', 'uk', 'vi', 'zh'];
const supportedLanguages = ['en', ...languagesWithFolders];
const defaultLanguage = 'en';

// Helper function to detect language from Accept-Language header
function detectLanguageFromHeader(acceptLanguage) {
  if (!acceptLanguage) return defaultLanguage;
  
  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,de;q=0.8")
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, priority] = lang.trim().split(';q=');
      return {
        code: code.split('-')[0].toLowerCase(), // Get base language code (en from en-US)
        priority: priority ? parseFloat(priority) : 1.0
      };
    })
    .sort((a, b) => b.priority - a.priority); // Sort by priority
  
  // Find first supported language
  for (const lang of languages) {
    if (supportedLanguages.includes(lang.code)) {
      return lang.code;
    }
  }
  
  return defaultLanguage;
}

// Protected routes that require authentication
const protectedPaths = ['/dashboard', '/payment-success', '/settings'];
const SUPABASE_PROJECT_REF = 'eujmomonscnlmwcbkbfy';

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // --- Auth guard for protected routes ---
  // Strip locale prefix to get the base path
  const segments = pathname.split('/').filter(Boolean);
  const hasLocalePrefix = segments.length > 0 && languagesWithFolders.includes(segments[0]);
  const basePath = hasLocalePrefix ? '/' + segments.slice(1).join('/') : pathname;
  const localePrefix = hasLocalePrefix ? '/' + segments[0] : '';

  if (protectedPaths.some(p => basePath === p || basePath.startsWith(p + '/'))) {
    const authCookie = request.cookies.get(`sb-${SUPABASE_PROJECT_REF}-auth-token`);
    // Supabase may also store as base64 chunks: sb-{ref}-auth-token.0, .1, etc.
    const authCookieChunk = request.cookies.get(`sb-${SUPABASE_PROJECT_REF}-auth-token.0`);

    if (!authCookie && !authCookieChunk) {
      const url = request.nextUrl.clone();
      url.pathname = `${localePrefix}/login`;
      return NextResponse.redirect(url);
    }
  }

  // Only redirect root path based on browser language
  if (pathname === '/') {
    // Don't redirect search engine crawlers — they should see English content at /
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = /googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|msnbot|facebookexternalhit|twitterbot|linkedinbot|applebot/i.test(userAgent);

    if (!isBot) {
      const acceptLanguage = request.headers.get('accept-language');
      const detectedLanguage = detectLanguageFromHeader(acceptLanguage);

      // If detected language is English or not in languagesWithFolders, stay on root
      // Otherwise redirect to language folder
      if (detectedLanguage !== 'en' && languagesWithFolders.includes(detectedLanguage)) {
        const url = request.nextUrl.clone();
        url.pathname = `/${detectedLanguage}`;
        return NextResponse.redirect(url);
      }
    }
    // For English or bots, stay on root (no redirect needed)
  }
  
  // Add pathname to headers for language detection in server components
  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  
  // Extract language from pathname
  const language = pathname.startsWith('/he') ? 'he' :
                  pathname.startsWith('/ar') ? 'ar' :
                  pathname.startsWith('/ru') ? 'ru' :
                  pathname.startsWith('/de') ? 'de' :
                  pathname.startsWith('/fr') ? 'fr' :
                  pathname.startsWith('/es') ? 'es' :
                  pathname.startsWith('/pt') ? 'pt' :
                  pathname.startsWith('/ja') ? 'ja' :
                  pathname.startsWith('/hi') ? 'hi' :
                  pathname.startsWith('/zh') ? 'zh' :
                  pathname.startsWith('/pl') ? 'pl' :
                  pathname.startsWith('/uk') ? 'uk' :
                  pathname.startsWith('/ko') ? 'ko' :
                  pathname.startsWith('/tr') ? 'tr' :
                  pathname.startsWith('/it') ? 'it' :
                  pathname.startsWith('/th') ? 'th' :
                  pathname.startsWith('/nl') ? 'nl' :
                  pathname.startsWith('/vi') ? 'vi' :
                  pathname.startsWith('/id') ? 'id' :
                  pathname.startsWith('/sv') ? 'sv' :
                  pathname.startsWith('/cs') ? 'cs' :
                  pathname.startsWith('/el') ? 'el' :
                  pathname.startsWith('/ro') ? 'ro' :
                  pathname.startsWith('/da') ? 'da' :
                  pathname.startsWith('/fi') ? 'fi' :
                  pathname.startsWith('/nb') ? 'nb' : 'en';
  
  response.headers.set('x-language', language);
  
  return response;
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, api, static files)
    '/((?!_next|api|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\.).*)',
  ],
};
