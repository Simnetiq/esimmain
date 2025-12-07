'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, Instagram } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection } from '@esim/shared/utils/languageUtils';

const Footer = () => {
  const pathname = usePathname();
  const { t, locale } = useI18n();
  
  // Get text direction for RTL support
  const direction = getLanguageDirection(locale);
  const isRTL = direction === 'rtl';
  
  // Hardcoded contact information
  const contactInfo = {
    email: 'support@Simnetiq.net'
  };
  
  // Hardcoded social media links
  const socialMedia = {
    instagram: 'https://www.instagram.com/esim.Simnetiq'
  };

  // Check if we're on a language-specific page or blog page (which has i18n context)
  const isLanguagePage = [
    // New language-code routes
    '/he', '/ar', '/ru', '/de', '/fr', '/es',
    // Old language routes (for backward compatibility)
    '/hebrew', '/arabic', '/russian', '/german', '/french', '/spanish'
  ].includes(pathname);
  
  const isBlogPage = pathname.startsWith('/blog') || 
                    // New language-code blog routes
                    pathname.startsWith('/he/blog') || 
                    pathname.startsWith('/ar/blog') || 
                    pathname.startsWith('/ru/blog') || 
                    pathname.startsWith('/de/blog') || 
                    pathname.startsWith('/fr/blog') || 
                    pathname.startsWith('/es/blog') ||
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
                                // Old language routes (for backward compatibility)
                                pathname.startsWith('/hebrew/') || 
                                pathname.startsWith('/arabic/') || 
                                pathname.startsWith('/russian/') || 
                                pathname.startsWith('/german/') || 
                                pathname.startsWith('/french/') || 
                                pathname.startsWith('/spanish/');
  
  // Use translations on language-specific pages, blog pages, and language-specific routes
  const getText = (key, englishText) => {
    return (isLanguagePage || isBlogPage || isLanguageSpecificPage) ? t(key, englishText) : englishText;
  };

  const usefulLinks = [
    { name: getText('footer.privacyPolicy', 'Privacy Policy'), path: '/privacy-policy' },
    { name: getText('footer.termsOfService', 'Terms of Service'), path: '/terms-of-service' },
    { name: getText('footer.cookiePolicy', 'Cookie Policy'), path: '/cookie-policy' },

  ];

  // Create contact links array with only Instagram and Email
  const contactLinks = [
    { icon: Instagram, url: socialMedia.instagram, name: 'Instagram', type: 'social' },
    { icon: Mail, url: contactInfo.email, name: 'Email', type: 'email' }
  ].filter(link => link.url && link.url.trim() !== '');

  return (
    
    <footer className="footer-area relative bg-white text-eerie-black overflow-hidden" dir={direction} lang={locale}>
      <div className="bg-white flex flex-col">
        {/* Grid Pattern - Left Side */}
        <div 
          className="hidden xl:block absolute left-0 top-0 bottom-0 w-32"
          style={{
            backgroundSize: '10px 10px',
            backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
          }}
        ></div>

        {/* Grid Pattern - Right Side */}
        <div 
          className="hidden xl:block absolute right-0 top-0 bottom-0 w-32"
          style={{
            backgroundSize: '10px 10px',
            backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
          }}
        ></div>
        <div className="relative isolate flex-1 flex flex-col">

          {/* Horizontal Line - Top */}
          <div className="hidden lg:block absolute top-20 left-0 right-0 h-px bg-gray-200/70"></div>

          {/* Horizontal Line - Bottom */}
          <div className="hidden sm:block absolute bottom-0 left-0 right-0 h-px bg-gray-200/70"></div>
          {/* Footer Content Section */}
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl">
              <div className="px-4 py-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                  <div className="flex flex-row items-center justify-center gap-4 sm:gap-6">
                  {/* Brand Name */}
                  <Link href="/" className="footer-item__logo inline-block flex items-center text-xl font-semibold text-eerie-black">
                    {getText('footer.brandName', 'Simnetiq')}
                  </Link>
                  
                  {/* Contact Icons - Instagram and Email */}
                  {contactLinks.length > 0 && (
                    <ul className={`contact-icons flex ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                      {contactLinks.map((contact, index) => {
                        const IconComponent = contact.icon;
                        const href = contact.type === 'email' ? `mailto:${contact.url}` : contact.url;
                        const target = contact.type === 'email' ? '_self' : '_blank';
                        
                        return (
                          <li key={index} className="contact-icons__item text-eerie-black">
                            <a 
                              href={href}
                              className="contact-icons__link w-6 h-6 bg-white rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-gray-200"
                              target={target}
                              rel="noopener noreferrer"
                              aria-label={contact.name}
                            >
                              <IconComponent className="w-4 h-4" />
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  </div>
                  {/* Useful Links - Horizontal */}
                  <div className="footer-item animate-fade-in">
                    <ul className="footer-menu flex flex-wrap justify-center gap-3 sm:gap-4">
                      {usefulLinks.map((link, index) => (
                        <li key={index} className="footer-menu__item">
                          <Link 
                            href={link.path} 
                            className="footer-menu__link text-gray-500 hover:text-eerie-black transition-colors duration-200 text-xs sm:text-sm font-semibold"
                          >
                            {link.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Full width gray line */}
          <div className="w-full h-px bg-gray-200/70"></div>
        </div>

        {/* Bottom Footer */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="text-center">
                <div className="bottom-footer-text text-gray-500 text-sm font-semibold">
                  &copy; 2025 <Link href="/" className="text-eerie-black hover:text-gray-300 transition-colors duration-200">{getText('footer.brandName', 'Simnetiq')}</Link>. 
                  {getText('footer.allRightsReserved', ' All rights reserved. ')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
