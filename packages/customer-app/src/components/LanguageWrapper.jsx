'use client';

import { usePathname } from 'next/navigation';
import { I18nProvider } from '@esim/shared/contexts/I18nContext';

const LanguageWrapper = ({ children }) => {
  const pathname = usePathname();
  
  // Pages that should have I18n context
  const translatedPages = [
    '/', 
    // Language-code routes
    '/he', '/ar', '/ru', '/de', '/fr', '/es', '/pt', '/ja', '/hi', '/zh', '/pl', '/uk', '/it', '/ko', '/nl', '/th', '/tr',
    // Old language routes (for backward compatibility)
    '/hebrew', '/arabic', '/russian', '/german', '/french', '/spanish', 
    // Other translated pages
    '/contact', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/dashboard', '/esim-plans', '/privacy-policy', '/terms-of-service', '/cookie-policy', '/return-policy', '/payment-success', '/stripe-checkout', '/crypto-checkout', '/affiliate-program'
  ];

  // Check for share-package pages
  const isSharePackagePage = pathname.startsWith('/share-package/');

  // Check for special pages that should always have i18n context
  const isSpecialPage = pathname === '/not-found' || pathname === '/404';
  
  // Check for help pages
  const isHelpPage = pathname.startsWith('/help');

  // Check for blog pages (both old and new language routes)
  const isBlogPage = pathname.startsWith('/blog') ||
                    // Language-code blog routes
                    pathname.startsWith('/he/blog') ||
                    pathname.startsWith('/ar/blog') ||
                    pathname.startsWith('/ru/blog') ||
                    pathname.startsWith('/de/blog') ||
                    pathname.startsWith('/fr/blog') ||
                    pathname.startsWith('/es/blog') ||
                    pathname.startsWith('/pt/blog') ||
                    pathname.startsWith('/ja/blog') ||
                    pathname.startsWith('/hi/blog') ||
                    pathname.startsWith('/zh/blog') ||
                    pathname.startsWith('/pl/blog') ||
                    pathname.startsWith('/uk/blog') ||
                    pathname.startsWith('/it/blog') ||
                    pathname.startsWith('/ko/blog') ||
                    pathname.startsWith('/nl/blog') ||
                    pathname.startsWith('/th/blog') ||
                    pathname.startsWith('/tr/blog') ||
                    // Old language blog routes (for backward compatibility)
                    pathname.startsWith('/hebrew/blog') ||
                    pathname.startsWith('/arabic/blog') ||
                    pathname.startsWith('/russian/blog') ||
                    pathname.startsWith('/german/blog') ||
                    pathname.startsWith('/french/blog') ||
                    pathname.startsWith('/spanish/blog');

  // Check for language-specific routes (e.g., /he/contact, /ru/login, etc.)
  const isLanguageSpecificPage = pathname.startsWith('/he/') ||
                                pathname.startsWith('/ar/') ||
                                pathname.startsWith('/ru/') ||
                                pathname.startsWith('/de/') ||
                                pathname.startsWith('/fr/') ||
                                pathname.startsWith('/es/') ||
                                pathname.startsWith('/pt/') ||
                                pathname.startsWith('/ja/') ||
                                pathname.startsWith('/hi/') ||
                                pathname.startsWith('/zh/') ||
                                pathname.startsWith('/pl/') ||
                                pathname.startsWith('/uk/') ||
                                pathname.startsWith('/it/') ||
                                pathname.startsWith('/ko/') ||
                                pathname.startsWith('/nl/') ||
                                pathname.startsWith('/th/') ||
                                pathname.startsWith('/tr/') ||
                                // Old language routes (for backward compatibility)
                                pathname.startsWith('/hebrew/') ||
                                pathname.startsWith('/arabic/') ||
                                pathname.startsWith('/russian/') ||
                                pathname.startsWith('/german/') ||
                                pathname.startsWith('/french/') ||
                                pathname.startsWith('/spanish/');
  
  if (!translatedPages.includes(pathname) && !isBlogPage && !isHelpPage && !isLanguageSpecificPage && !isSpecialPage && !isSharePackagePage) {
    return children;
  }
  
  return (
    <I18nProvider>
      {children}
    </I18nProvider>
  );
};

export default LanguageWrapper;
