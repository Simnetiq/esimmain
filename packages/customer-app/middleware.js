import { NextResponse } from 'next/server';

// Note: English (en) uses root-level pages, other languages have their own folders
const languagesWithFolders = ['ar', 'de', 'es', 'fr', 'he', 'hi', 'ja', 'pl', 'pt', 'ru', 'uk', 'zh'];
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

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Only redirect root path based on browser language
  if (pathname === '/') {
    const acceptLanguage = request.headers.get('accept-language');
    const detectedLanguage = detectLanguageFromHeader(acceptLanguage);
    
    // If detected language is English or not in languagesWithFolders, stay on root
    // Otherwise redirect to language folder
    if (detectedLanguage !== 'en' && languagesWithFolders.includes(detectedLanguage)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${detectedLanguage}`;
      return NextResponse.redirect(url);
    }
    // For English, stay on root (no redirect needed)
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
                  pathname.startsWith('/uk') ? 'uk' : 'en';
  
  response.headers.set('x-language', language);
  
  return response;
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, api, static files)
    '/((?!_next|api|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\.).*)',
  ],
};
