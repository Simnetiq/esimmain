'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useRegionsSupabase as useRegions } from '@esim/shared/hooks/useRegionsSupabase';
import LanguageSelector from './LanguageSelector';
import CurrencyToggle from './CurrencyToggle';
import { detectLanguageFromPath, getLocalizedBlogListUrl, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import { getPlatformAppStoreLink } from '@esim/shared/utils/appStoreLinks';
// Inline SVG icons to avoid lucide-react bundle overhead on every page
const ChevronDown = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const SettingsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const LogOut = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
  </svg>
);

const Headphones = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>
  </svg>
);

const Smartphone = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>
  </svg>
);

const Navbar = ({ hideLanguageSelector = false }) => {
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const { currentUser, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const storeDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  // Get regions for store dropdown
  const { regions } = useRegions(locale);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target)) {
        setIsStoreDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };

    // Listen for custom close event from layout
    const handleCloseDropdowns = () => {
      setIsStoreDropdownOpen(false);
      setIsUserDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('closeNavbarDropdowns', handleCloseDropdowns);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('closeNavbarDropdowns', handleCloseDropdowns);
    };
  }, []);

  // Language detection: always use pathname on server & initial hydration to avoid mismatch.
  // localStorage is only read after mount to update the language.
  const pathnameLanguage = detectLanguageFromPath(pathname) || 'en';
  const ssrSafeLanguage = i18nLoading ? pathnameLanguage : (locale || 'en');

  const [currentLanguage, setCurrentLanguage] = useState(ssrSafeLanguage);

  // After mount, sync with localStorage if i18n is still loading
  useEffect(() => {
    if (i18nLoading) {
      const savedLanguage = localStorage.getItem('Simnetiq-language');
      if (savedLanguage && savedLanguage !== currentLanguage) {
        setCurrentLanguage(savedLanguage);
      }
    }
  }, [i18nLoading]);

  // Keep in sync with i18n context once it finishes loading
  useEffect(() => {
    if (!i18nLoading && locale) {
      setCurrentLanguage(locale);
    }
  }, [i18nLoading, locale]);

  const direction = getLanguageDirection(currentLanguage);
  const isRTL = direction === 'rtl';

  // Generate localized URLs based on currentLanguage (SSR-safe on initial render)
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

  // Close all dropdowns when navbar hides (scrolling down)
  useEffect(() => {
    if (!isVisible) {
      setIsStoreDropdownOpen(false);
      setIsUserDropdownOpen(false);
      // Dispatch custom event for LanguageSelector to close
      window.dispatchEvent(new CustomEvent('closeNavbarDropdowns'));
    }
  }, [isVisible]);

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setIsUserDropdownOpen(false);
      setIsMenuOpen(false);
      toast.success(t('navbar.loggedOutSuccessfully', 'Logged out successfully'));
      router.push(getLocalizedUrl('/'));
    } catch {
      toast.error(t('navbar.failedToLogout', 'Failed to logout'));
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!currentUser) return '?';
    if (currentUser.displayName) {
      const names = currentUser.displayName.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    if (currentUser.email) {
      return currentUser.email[0].toUpperCase();
    }
    return '?';
  };

  return (
    <header
      className={`navbar-header fixed bg-white/30 backdrop-blur-xl w-full left-0 right-0 justify-center border-b border-gray-200/70 top-0 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
      style={{ zIndex: 9999 }}
      dir={direction}
      lang={currentLanguage}
    >
      <nav aria-label="Global" className="mx-auto flex max-w-7xl items-center justify-between p-2 px-4">  
        <div className={`flex lg:flex-1 items-center ${isRTL ? 'justify-end' : 'justify-start'}`}> 
          <Link href={getLocalizedUrl("/")} className={`flex items-center gap-2 `}>
            <span className="sr-only">Simnetiq</span>
            <Image
              src="/images/logoblack.png"
              alt="Simnetiq Logo"
              width={28}
              height={28}
              priority
              fetchPriority="high"
            />
            <span className="text-base sm:text-lg font-light text-eerie-black">simnetiq</span>
          </Link>
        </div>
        
        <div className={`flex lg:hidden items-center ${isRTL ? 'justify-start gap-x-2' : 'justify-end gap-x-2'}`}>
          {process.env.NEXT_PUBLIC_ENABLE_CURRENCY_TOGGLE === 'true' && <CurrencyToggle />}
          {!hideLanguageSelector && <LanguageSelector />}
          {/* User Avatar for mobile - only show when logged in */}
          {currentUser && (
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-tufts-blue text-white text-xs font-semibold"
              aria-label={t('navbar.userMenu', 'User menu')}
            >
              {getUserInitials()}
            </button>
          )}
          {!currentUser && (
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
          )}
        </div>
        
        <div className="hidden lg:flex lg:items-center lg:gap-x-8">
          {/* Store Dropdown with Regions */}
          <div className="relative" ref={storeDropdownRef}>
            <button
              onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
              className="flex items-center gap-1 text-sm font-semibold text-eerie-black hover:text-tufts-blue transition-colors"
            >
              {t('navbar.store', 'Store')}
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isStoreDropdownOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            
            {/* Store Dropdown Menu */}
            {isStoreDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200  shadow-xl shadow-gray-100/30 z-50">
                <ul className="p-2 text-sm font-medium text-gray-700">
                  {regions
                    .filter(r => r.id !== 'popular' && r.id !== 'all')
                    .map((region) => (
                      <li key={region.id}>
                        <Link
                          href={getLocalizedUrl(`/esim-plans?region=${region.id}`)}
                          className="inline-flex items-center w-full p-2 hover:bg-gray-100 hover:text-eerie-black rounded transition-colors"
                          onClick={() => setIsStoreDropdownOpen(false)}
                        >
                          {region.displayName}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* My eSIMs (Dashboard) - only show when logged in */}
          {currentUser && (
            <Link href={getLocalizedUrl("/dashboard")} className="text-sm font-semibold text-eerie-black hover:text-tufts-blue transition-colors">
              {t('navbar.myEsims', 'My eSIMs')}
            </Link>
          )}
          
          {/* Help/Contact link */}
          <Link
            href={getLocalizedUrl('/contact')}
            className="text-sm font-semibold text-eerie-black hover:text-tufts-blue transition-colors"
          >
            {t('navbar.help', 'Help')}
          </Link>

          {/* Blog link */}
          <Link
            href={getLocalizedBlogListUrl(currentLanguage)}
            className="text-sm font-semibold text-eerie-black hover:text-tufts-blue transition-colors"
          >
            {t('navbar.blog', 'Blog')}
          </Link>
        </div>
        
        {/* Right side with language selector, login, and user avatar */}
        <div className={`hidden lg:flex lg:flex-1 lg:items-center lg:gap-x-3 ${isRTL ? 'lg:justify-start' : 'lg:justify-end'}`}>
          {/* Login button for non-authenticated users - styled with black bg */}
          {!currentUser && (
            <Link
              href={getLocalizedUrl('/login')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-eerie-black rounded-full hover:bg-gray-800 transition-colors"
            >
              {t('navbar.login', 'Login')}
            </Link>
          )}

          {!hideLanguageSelector && <LanguageSelector />}
          {process.env.NEXT_PUBLIC_ENABLE_CURRENCY_TOGGLE === 'true' && <CurrencyToggle />}

          {/* User Avatar Dropdown - only show when logged in */}
          {currentUser && (
            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-tufts-blue text-white text-sm font-semibold hover:bg-tufts-blue/90 transition-colors focus:outline-none focus:ring-2 focus:ring-tufts-blue focus:ring-offset-2"
                aria-label={t('navbar.userMenu', 'User menu')}
              >
                {getUserInitials()}
              </button>
              
              {/* User Dropdown Menu */}
              {isUserDropdownOpen && (
                <div className={`absolute top-full mt-2 w-48 bg-white border border-gray-200  shadow-xl shadow-gray-100/30 z-50 ${isRTL ? 'left-0' : 'right-0'}`}>
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className={`text-sm font-medium text-eerie-black truncate ${isRTL ? 'text-right' : 'text-left'}`}>
                      {currentUser.displayName || t('navbar.user', 'User')}
                    </p>
                    <p className={`text-xs text-gray-500 truncate ${isRTL ? 'text-right' : 'text-left'}`}>
                      {currentUser.email}
                    </p>
                  </div>
                  
                  <ul className="p-2 text-sm font-medium text-gray-700">
                    <li>
                      <Link 
                        href={getLocalizedUrl('/settings')} 
                        className={`inline-flex items-center gap-2 w-full p-2 hover:bg-gray-100 hover:text-eerie-black rounded transition-colors `}
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        <SettingsIcon className="w-4 h-4" />
                        {t('navbar.settings', 'Settings')}
                      </Link>
                    </li>
                    <li>
                      <Link 
                        href={getLocalizedUrl('/contact')} 
                        className={`inline-flex items-center gap-2 w-full p-2 hover:bg-gray-100 hover:text-eerie-black rounded transition-colors `}
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        <Headphones className="w-4 h-4" />
                        {t('navbar.support', 'Support')}
                      </Link>
                    </li>
                    <li className="border-t border-gray-100 mt-1 pt-1">
                      <span className="block px-2 py-1 text-xs text-gray-400 uppercase tracking-wider">
                        {t('navbar.getTheApp', 'Get the App')}
                      </span>
                    </li>
                    <li>
                      <a 
                        href="https://apps.apple.com/gb/app/simnetiq-global-esim/id6755963262" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 w-full p-2 hover:bg-gray-100 hover:text-eerie-black rounded transition-colors `}
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          handleDownloadApp();
                        }}
                      >
                        <Smartphone className="w-4 h-4" />
                        {t('navbar.iosApp', 'iOS App')}
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://play.google.com/store/apps/details?id=com.simnetiq.storeAndroid&hl=en"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 w-full p-2 hover:bg-gray-100 hover:text-eerie-black rounded transition-colors `}
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          handleDownloadApp();
                        }}
                      >
                        <Smartphone className="w-4 h-4" />
                        {t('navbar.androidApp', 'Android App')}
                      </a>
                    </li>
                    <li className="border-t border-gray-100 mt-1 pt-1">
                      <button 
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className={`inline-flex items-center gap-2 w-full p-2 hover:bg-red-50 text-red-600 hover:text-red-700 rounded transition-colors disabled:opacity-50 `}
                      >
                        <LogOut className="w-4 h-4" />
                        {isLoggingOut ? t('navbar.loggingOut', 'Logging out...') : t('navbar.logout', 'Log out')}
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Mobile menu using Portal */}
      {isMenuOpen && mounted && createPortal(
        <div className="lg:hidden" style={{ zIndex: 99999, position: 'fixed', inset: 0 }} dir={direction} lang={currentLanguage}>
          <div 
            className="fixed inset-0 w-full h-full overflow-y-auto bg-white/80 backdrop-blur-xl" 
            style={{ zIndex: 99999 }}
          >
            {/* Header with logo and close button */}
            <div className="flex items-center justify-between p-6"> 
              <Link href={getLocalizedUrl("/")} className={`flex items-center gap-2 `} onClick={() => setIsMenuOpen(false)}>
                <span className="sr-only">Simnetiq</span>
                <Image
                  src="/images/logoblack.png"
                  alt="Simnetiq Logo"
                  width={24}
                  height={24}
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
                {/* User info - only show when logged in */}
                {currentUser && (
                  <>
                    <div className={`flex items-center justify-center gap-4 py-4 px-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-14 h-14 rounded-full bg-tufts-blue text-white text-lg font-semibold flex items-center justify-center flex-shrink-0">
                        {getUserInitials()}
                      </div>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <p className="text-base font-medium text-eerie-black">
                          {currentUser.displayName || t('navbar.user', 'User')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {currentUser.email}
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 my-4 mx-8" />
                  </>
                )}
                
                {/* Store */}
                <Link
                  href={getLocalizedUrl("/esim-plans")}
                  className="flex items-center justify-center text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('navbar.store', 'Store')}
                </Link>
                
                {/* My eSIMs - only show when logged in */}
                {currentUser && (
                  <Link
                    href={getLocalizedUrl("/dashboard")}
                    className="flex items-center justify-center text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('navbar.myEsims', 'My eSIMs')}
                  </Link>
                )}
                
                {/* Divider */}
                <div className="border-t border-gray-200 my-4 mx-8" />
                
                {/* More section items */}
                <Link
                  href={getLocalizedBlogListUrl(currentLanguage)}
                  className="flex items-center justify-center text-base sm:text-lg font-semibold text-gray-600 hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('navbar.blog', 'Blog')}
                </Link>
                
                <Link
                  href={getLocalizedUrl('/contact')}
                  className="flex items-center justify-center text-base sm:text-lg font-semibold text-gray-600 hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('navbar.contactUs', 'Contact Us')}
                </Link>
                
                {/* Divider */}
                <div className="border-t border-gray-200 my-4 mx-8" />
                
                {/* Download App - with specific links for authenticated users */}
                {currentUser ? (
                  <>
                    <span className="flex items-center justify-center text-xs text-gray-400 uppercase tracking-wider py-2">
                      {t('navbar.getTheApp', 'Get the App')}
                    </span>
                    <a
                      href="https://apps.apple.com/gb/app/simnetiq-global-esim/id6755963262"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-2 text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4 `}
                      onClick={() => {
                        handleDownloadApp();
                        setIsMenuOpen(false);
                      }}
                    >
                      <Smartphone className="w-5 h-5" />
                      {t('navbar.iosApp', 'iOS App')}
                    </a>
                    <a
                      href="https://play.google.com/store/apps/details?id=com.simnetiq.storeAndroid&hl=en"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-2 text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4 `}
                      onClick={() => {
                        handleDownloadApp();
                        setIsMenuOpen(false);
                      }}
                    >
                      <Smartphone className="w-5 h-5" />
                      {t('navbar.androidApp', 'Android App')}
                    </a>
                  </>
                ) : (
                  <a
                    href={getPlatformAppStoreLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      handleDownloadApp();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center justify-center text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4"
                  >
                    {t('navbar.downloadApp', 'Download App')}
                  </a>
                )}
                
                {/* Divider before auth section */}
                <div className="border-t border-gray-200 my-4 mx-8" />
                
                {/* Auth/Settings section */}
                {currentUser ? (
                  <>
                    <Link
                      href={getLocalizedUrl('/settings')}
                      className={`flex items-center justify-center gap-2 text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4 `}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <SettingsIcon className="w-5 h-5" />
                      {t('navbar.settings', 'Settings')}
                    </Link>
                    
                    <Link
                      href={getLocalizedUrl('/contact')}
                      className={`flex items-center justify-center gap-2 text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4 `}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Headphones className="w-5 h-5" />
                      {t('navbar.support', 'Support')}
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className={`flex items-center justify-center gap-2 w-full text-base sm:text-lg font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-all duration-200 py-3 px-4 disabled:opacity-50 `}
                    >
                      <LogOut className="w-5 h-5" />
                      {isLoggingOut ? t('navbar.loggingOut', 'Logging out...') : t('navbar.logout', 'Log out')}
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