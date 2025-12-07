'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import LanguageSelector from './LanguageSelector';
import { detectLanguageFromPath, getLocalizedBlogListUrl, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';

const Navbar = ({ hideLanguageSelector = false }) => {
  const { t, locale } = useI18n();
  const { currentUser, logout } = useAuth();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Detect current language from multiple sources
  const getCurrentLanguage = () => {
    // First try I18n context (includes Firebase preference for logged-in users)
    if (locale) return locale;
    
    // Check localStorage
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('Simnetiq-language');
      if (savedLanguage) return savedLanguage;
    }
    
    // Fallback to URL detection
    return detectLanguageFromPath(pathname);
  };

  const currentLanguage = getCurrentLanguage();
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  // Generate localized URLs
  const getLocalizedUrl = (path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  };

  const handleDownloadApp = () => {
    // Track with Facebook Pixel
    trackCustomFacebookEvent('DownloadAppClick', {
      source: 'mobile_menu',
      content_type: 'download_button'
    });
  };
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Handle scroll behavior with throttling for performance
  useEffect(() => {
    let ticking = false;
    let lastKnownScrollY = lastScrollY;

    const controlNavbar = () => {
      const currentScrollY = window.scrollY;
      
      // Show navbar when at top or scrolling up
      if (currentScrollY < 10 || currentScrollY < lastKnownScrollY) {
        setIsVisible(true);
      } else {
        // Hide navbar when scrolling down
        setIsVisible(false);
      }
      
      lastKnownScrollY = currentScrollY;
      setLastScrollY(currentScrollY);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(controlNavbar);
        ticking = true;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }
  }, [lastScrollY]);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsMenuOpen(false);
    } catch {
      toast.error('Failed to logout');
    }
  };

  return (
    <header 
      className={`navbar-header fixed bg-white/30 mx-auto backdrop-blur-xl w-full max-w-9xl justify-center border-b border-gray-200/70 top-0 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`} 
      style={{ zIndex: 9999 }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <nav aria-label="Global" className="mx-auto flex max-w-7xl items-center justify-between p-2 px-4">
        <div className={`flex lg:flex-1 items-center ${isRTL ? 'justify-end' : 'justify-start'}`}>
          <Link href={getLocalizedUrl("/")} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="sr-only">Simnetiq</span>
            <Image 
              src="/images/logoblack.png" 
              alt="Simnetiq Logo" 
              width={28} 
              height={28}
              style={{ width: 'auto', height: 'auto' }}
            />
            <span className="text-base sm:text-lg font-light text-eerie-black">simnetiq</span>
          </Link>
        </div>
        
        <div className={`flex lg:hidden items-center ${isRTL ? 'justify-start gap-x-2' : 'justify-end space-x-2'}`}>
          {!hideLanguageSelector && <LanguageSelector />}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-eerie-black"
          >
            <span className="sr-only">{t('navbar.openMenu', 'Open main menu')}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-6">
              <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        
        <div className="hidden lg:flex lg:gap-x-8">
          <Link href={getLocalizedUrl("/esim-plans")} className="text-sm font-semibold text-eerie-black hover:text-tufts-blue transition-colors">
            {t('navbar.plans', 'Plans')}
          </Link>
          <Link href={getLocalizedUrl('/contact')} className="text-sm font-semibold text-eerie-black hover:text-tufts-blue transition-colors">
            {t('navbar.contactUs', 'Contact Us')}
          </Link>
          <Link href={getLocalizedBlogListUrl(currentLanguage)} className="text-sm font-semibold text-eerie-black hover:text-tufts-blue transition-colors">
            {t('navbar.blog', 'Blog')}
          </Link>
          {currentUser ? (
            <>
              <Link href={getLocalizedUrl("/dashboard")} className="text-sm font-semibold text-eerie-black hover:text-tufts-blue transition-colors">
                {t('navbar.dashboard', 'Dashboard')}
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-semibold text-eerie-black hover:text-tufts-blue transition-colors"
              >
                {t('navbar.logout', 'Logout')}
              </button>
            </>
          ) : (
            <Link href={getLocalizedUrl('/login')} className="text-sm font-semibold text-eerie-black hover:text-tufts-blue transition-colors">
              {t('navbar.login', 'Login')}
            </Link>
          )}
        </div>
        
        {/* Right side with language selector */}
        <div className={`hidden lg:flex lg:flex-1 ${isRTL ? 'lg:justify-start' : 'lg:justify-end'}`}>
          {!hideLanguageSelector && <LanguageSelector />}
        </div>
      </nav>

      {/* Mobile menu using Portal */}
      {isMenuOpen && mounted && createPortal(
        <div className="lg:hidden" style={{ zIndex: 99999, position: 'fixed', inset: 0 }} dir={isRTL ? 'rtl' : 'ltr'}>
          <div 
            className="fixed inset-0 w-full h-full overflow-y-auto bg-white/80 backdrop-blur-xl" 
            style={{ zIndex: 99999 }}
          >
            {/* Header with logo and close button */}
            <div className="flex items-center justify-between p-6">
              <Link href={getLocalizedUrl("/")} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} onClick={() => setIsMenuOpen(false)}>
                <span className="sr-only">Simnetiq</span>
                <Image 
                  src="/images/logoblack.png" 
                  alt="Simnetiq Logo" 
                  width={24}
                  height={24}
                  className="w-6 h-6"
                  style={{ width: 'auto', height: 'auto' }}
                />
                <span className="text-base font-bold text-eerie-black">Simnetiq</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="-m-2.5 rounded-md p-2.5 text-eerie-black hover:bg-gray-100 transition-colors"
              >
                <span className="sr-only">{t('navbar.closeMenu', 'Close menu')}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="size-6">
                  <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            
            {/* Centered menu items */}
            <div className="flex flex-col justify-center min-h-[60vh]">
              <div className="space-y-2">
                {/* Main Navigation Group */}
                <button
                  onClick={() => {
                    handleDownloadApp();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center justify-center text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4 w-full bg-transparent border-none cursor-pointer"
                >
                  {t('navbar.downloadApp', 'Download App')} 
                </button>
                
                <Link
                  href={getLocalizedUrl("/esim-plans")}
                  className="flex items-center justify-center text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('navbar.plans', 'Plans')}
                </Link>
                
                <Link
                  href={getLocalizedUrl('/contact')}
                  className="flex items-center justify-center text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('navbar.contactUs', 'Contact Us')}
                </Link>
                
                <Link
                  href={getLocalizedBlogListUrl(currentLanguage)}
                  className="flex items-center justify-center text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('navbar.blog', 'Blog')}
                </Link>
                
                {currentUser ? (
                  <>
                    <Link
                      href={getLocalizedUrl("/dashboard")}
                      className="flex items-center justify-center text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('navbar.dashboard', 'Dashboard')}
                    </Link>
                    
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center justify-center w-full text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4"
                    >
                      {t('navbar.logout', 'Logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href={getLocalizedUrl('/login')}
                      className="flex items-center justify-center text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('navbar.login', 'Login')}
                    </Link>
                    
                    <Link
                      href={getLocalizedUrl('/register')}
                      className="flex items-center justify-center text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('navbar.register', 'Register')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};

export default Navbar;