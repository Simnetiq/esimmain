import { NextResponse } from 'next/server';

// Simplified middleware - no redirects to avoid chunk loading issues
export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Add pathname to headers for language detection in server components
  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  
  // Add language detection header for better Vercel routing
  const language = pathname.startsWith('/he') ? 'he' :
                  pathname.startsWith('/ar') ? 'ar' :
                  pathname.startsWith('/ru') ? 'ru' :
                  pathname.startsWith('/de') ? 'de' :
                  pathname.startsWith('/fr') ? 'fr' :
                  pathname.startsWith('/es') ? 'es' : 'en';
  
  response.headers.set('x-language', language);
  
  return response;
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, api, static files)
    '/((?!_next|api|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\.).*)',
  ],
};
