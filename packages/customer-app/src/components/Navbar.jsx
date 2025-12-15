'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useRegions } from '@esim/shared/hooks/useRegions';
import LanguageSelector from './LanguageSelector';
import { detectLanguageFromPath, getLocalizedBlogListUrl, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import { ChevronDown, Settings, LogOut, HeadphonesIcon, Smartphone } from 'lucide-react';

const Navbar = ({ hideLanguageSelector = false }) => {
  const { t, locale } = useI18n();
  const { currentUser, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const moreDropdownRef = useRef(null);
  const storeDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);
  
  // Get regions for store dropdown
  const { regions } = useRegions(locale);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
        setIsMoreDropdownOpen(false);
      }
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target)) {
        setIsStoreDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };

    // Listen for custom close event from layout
    const handleCloseDropdowns = () => {
      setIsMoreDropdownOpen(false);
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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Close all dropdowns when navbar hides (scrolling down)
  useEffect(() => {
    if (!isVisible) {
      setIsMoreDropdownOpen(false);
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
        
        <div className={`flex lg:hidden items-center ${isRTL ? 'justify-start gap-x-2' : 'justify-end gap-x-2'}`}>
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
                  <li>
                    <Link 
                      href={getLocalizedUrl('/esim-plans')} 
                      className="inline-flex items-center w-full p-2 hover:bg-gray-100 hover:text-eerie-black rounded transition-colors font-semibold"
                      onClick={() => setIsStoreDropdownOpen(false)}
                    >
                      {t('navbar.allPlans', 'All Plans')}
                    </Link>
                  </li>
                  <li className="border-t border-gray-100 mt-1 pt-1">
                    <span className="block px-2 py-1 text-xs text-gray-400 uppercase tracking-wider">
                      {t('navbar.regions', 'Regions')}
                    </span>
                  </li>
                  {regions.filter(r => r.id !== 'popular' && r.id !== 'all').map((region) => (
                    <li key={region.id}>
                      <Link 
                        href={getLocalizedUrl(`/esim-plans?region=${region.id}`)} 
                        className="inline-flex items-center gap-2 w-full p-2 hover:bg-gray-100 hover:text-eerie-black rounded transition-colors"
                        onClick={() => setIsStoreDropdownOpen(false)}
                      >
                        <span>{region.icon}</span>
                        <span>{region.displayName}</span>
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
          
          {/* More Dropdown */}
          <div className="relative" ref={moreDropdownRef}>
            <button
              onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
              className="flex items-center gap-1 text-sm font-semibold text-eerie-black hover:text-tufts-blue transition-colors"
            >
              {t('navbar.more', 'More')}
              <ChevronDown 
                className={`w-4 h-4 transition-transform ${isMoreDropdownOpen ? 'rotate-180' : ''}`} 
                aria-hidden="true" 
              />
            </button>
            
            {/* More Dropdown Menu */}
            {isMoreDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-44 bg-white border border-gray-200  shadow-xl shadow-gray-100/30 z-50">
                <ul className="p-2 text-sm font-medium text-gray-700">
                  <li>
                    <Link 
                      href={getLocalizedBlogListUrl(currentLanguage)} 
                      className="inline-flex items-center w-full p-2 hover:bg-gray-100 hover:text-eerie-black rounded transition-colors"
                      onClick={() => setIsMoreDropdownOpen(false)}
                    >
                      {t('navbar.blog', 'Blog')}
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href={getLocalizedUrl('/contact')} 
                      className="inline-flex items-center w-full p-2 hover:bg-gray-100 hover:text-eerie-black rounded transition-colors"
                      onClick={() => setIsMoreDropdownOpen(false)}
                    >
                      {t('navbar.contactUs', 'Contact Us')}
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </div>
          
          {/* Login link for non-authenticated users */}
          {!currentUser && (
            <Link href={getLocalizedUrl('/login')} className="text-sm font-semibold text-eerie-black hover:text-tufts-blue transition-colors">
              {t('navbar.login', 'Login')}
            </Link>
          )}
        </div>
        
        {/* Right side with language selector, download app, and user avatar */}
        <div className={`hidden lg:flex lg:flex-1 lg:items-center lg:gap-x-3 ${isRTL ? 'lg:justify-start' : 'lg:justify-end'}`}>
          {/* Download App link - only for non-authenticated users */}
          {!currentUser && (
            <a
              href="https://apps.apple.com/gb/app/simnetiq-global-esim/id6755963262"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleDownloadApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-eerie-black rounded-full hover:bg-gray-800 transition-colors"
            >
              <Smartphone className="w-4 h-4" />
              {t('navbar.getApp', 'Get App')}
            </a>
          )}
          
          {!hideLanguageSelector && <LanguageSelector />}
          
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
                        className={`inline-flex items-center gap-2 w-full p-2 hover:bg-gray-100 hover:text-eerie-black rounded transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        {t('navbar.settings', 'Settings')}
                      </Link>
                    </li>
                    <li>
                      <Link 
                        href={getLocalizedUrl('/contact')} 
                        className={`inline-flex items-center gap-2 w-full p-2 hover:bg-gray-100 hover:text-eerie-black rounded transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        <HeadphonesIcon className="w-4 h-4" />
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
                        className={`inline-flex items-center gap-2 w-full p-2 hover:bg-gray-100 hover:text-eerie-black rounded transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
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
                      <span 
                        className={`inline-flex items-center gap-2 w-full p-2 text-gray-400 cursor-not-allowed ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Smartphone className="w-4 h-4" />
                        {t('navbar.androidApp', 'Android')} <span className="text-xs">({t('navbar.comingSoon', 'Soon')})</span>
                      </span>
                    </li>
                    <li className="border-t border-gray-100 mt-1 pt-1">
                      <button 
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className={`inline-flex items-center gap-2 w-full p-2 hover:bg-red-50 text-red-600 hover:text-red-700 rounded transition-colors disabled:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}
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
        <div 
          className="lg:hidden" 
          style={{ zIndex: 99999, position: 'fixed', inset: 0 }} 
          dir={isRTL ? 'rtl' : 'ltr'}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
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
                {/* User info - only show when logged in */}
                {currentUser && (
                  <div className="flex flex-col items-center justify-center py-4 px-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-tufts-blue text-white text-xl font-semibold flex items-center justify-center mb-2">
                      {getUserInitials()}
                    </div>
                    <p className="text-base font-medium text-eerie-black">
                      {currentUser.displayName || t('navbar.user', 'User')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {currentUser.email}
                    </p>
                  </div>
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
                
                {/* Download App */}
                <a
                  href="https://apps.apple.com/gb/app/simnetiq-global-esim/id6755963262"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-2 text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4 ${isRTL ? 'flex-row-reverse' : ''}`}
                  onClick={() => {
                    handleDownloadApp();
                    setIsMenuOpen(false);
                  }}
                >
                  <Smartphone className="w-5 h-5" />
                  {t('navbar.getApp', 'Get App')}
                </a>
                
                {/* Auth/Settings section */}
                {currentUser ? (
                  <>
                    <Link
                      href={getLocalizedUrl('/settings')}
                      className={`flex items-center justify-center gap-2 text-base sm:text-lg font-semibold text-eerie-black hover:text-tufts-blue hover:bg-white rounded-md transition-all duration-200 py-3 px-4 ${isRTL ? 'flex-row-reverse' : ''}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings className="w-5 h-5" />
                      {t('navbar.settings', 'Settings')}
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className={`flex items-center justify-center gap-2 w-full text-base sm:text-lg font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-all duration-200 py-3 px-4 disabled:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}
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