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
import ThemeToggle from './ThemeToggle';
import { detectLanguageFromPath, getLocalizedBlogListUrl, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import PlatformDownloadCTA from './cta/PlatformDownloadCTA';
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
  const lastScrollYRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  // Handle scroll behavior with throttling for performance
  useEffect(() => {
    let ticking = false;

    const controlNavbar = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;

      // Dead zone: ignore tiny scroll movements (< 5px)
      if (Math.abs(delta) < 5) {
        ticking = false;
        return;
      }

      const shouldBeVisible = currentScrollY < 10 || delta < 0;

      // Only update state if it actually changed
      setIsVisible(prev => {
        if (prev === shouldBeVisible) return prev;
        return shouldBeVisible;
      });

      lastScrollYRef.current = currentScrollY;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(controlNavbar);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
      className={`navbar-header fixed bg-[#0a0a0a]/80 backdrop-blur-sm w-full inset-x-0 justify-center top-0 transition-transform duration-150 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
      style={{ zIndex: 9999 }}
      dir={direction}
      lang={currentLanguage}
    >
      <nav aria-label="Global" className="mx-auto flex max-w-7xl items-center justify-between p-2 px-4">
        <div className="flex lg:flex-1 items-center justify-start">
          <Link href={getLocalizedUrl(currentUser ? "/dashboard" : "/")} className="flex items-center gap-2">
            <span className="sr-only">Simnetiq</span>
            <Image
              src="/images/logoblack.png"
              alt="Simnetiq Logo"
              width={28}
              height={28}
              priority
              fetchPriority="high"
            />
            <span className="text-base sm:text-lg font-light text-text-primary">simnetiq</span>
          </Link>
        </div>

        <div className="flex lg:hidden items-center justify-end gap-x-2">
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
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-text-primary"
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
              className="flex items-center gap-1 text-sm font-semibold text-text-primary hover:text-tufts-blue transition-colors"
            >
              {t('navbar.store', 'Store')}
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isStoreDropdownOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {/* Store Dropdown Menu */}
            {isStoreDropdownOpen && (
              <div className="absolute top-full start-0 mt-2 w-48 bg-bg-secondary border border-white/10 shadow-xl shadow-black/30 z-50">
                <ul className="p-2 text-sm font-medium text-text-muted">
                  {regions
                    .filter(r => r.id !== 'popular' && r.id !== 'all')
                    .map((region) => (
                      <li key={region.id}>
                        <Link
                          href={getLocalizedUrl(`/esim-plans?region=${region.id}`)}
                          className="inline-flex items-center w-full p-2 hover:bg-white/5 hover:text-text-primary rounded transition-colors"
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
            <Link href={getLocalizedUrl("/dashboard")} className="text-sm font-semibold text-text-primary hover:text-tufts-blue transition-colors">
              {t('navbar.myEsims', 'My eSIMs')}
            </Link>
          )}

          {/* Help/Contact link */}
          <Link
            href={getLocalizedUrl('/contact')}
            className="text-sm font-semibold text-text-primary hover:text-tufts-blue transition-colors"
          >
            {t('navbar.help', 'Help')}
          </Link>

          {/* Blog link */}
          <Link
            href={getLocalizedBlogListUrl(currentLanguage)}
            className="text-sm font-semibold text-text-primary hover:text-tufts-blue transition-colors"
          >
            {t('navbar.blog', 'Blog')}
          </Link>

          {/* About link — hide for authenticated users */}
          {!currentUser && (
            <Link
              href={getLocalizedUrl('/about')}
              className="text-sm font-semibold text-text-primary hover:text-tufts-blue transition-colors"
            >
              {t('navbar.about', 'About')}
            </Link>
          )}
        </div>

        {/* Right side with language selector, login, and user avatar */}
        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:gap-x-3 lg:justify-end">
          {/* Login button for non-authenticated users - inverted for dark theme */}
          {!currentUser && (
            <Link
              href={getLocalizedUrl('/login')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-[#0a0a0a] bg-white rounded-full hover:bg-white/90 transition-colors"
            >
              {t('navbar.login', 'Login')}
            </Link>
          )}

          <ThemeToggle />
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
                <div className="absolute top-full mt-2 w-48 bg-bg-secondary border border-white/10 shadow-xl shadow-black/30 z-50 end-0">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-sm font-medium text-text-primary truncate text-start">
                      {currentUser.displayName || t('navbar.user', 'User')}
                    </p>
                    <p className="text-xs text-text-muted truncate text-start">
                      {currentUser.email}
                    </p>
                  </div>

                  <ul className="p-2 text-sm font-medium text-text-muted">
                    <li>
                      <Link
                        href={getLocalizedUrl('/settings')}
                        className={`inline-flex items-center gap-2 w-full p-2 hover:bg-white/5 hover:text-text-primary rounded transition-colors`}
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        <SettingsIcon className="w-4 h-4" />
                        {t('navbar.settings', 'Settings')}
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={getLocalizedUrl('/contact')}
                        className={`inline-flex items-center gap-2 w-full p-2 hover:bg-white/5 hover:text-text-primary rounded transition-colors`}
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        <Headphones className="w-4 h-4" />
                        {t('navbar.support', 'Support')}
                      </Link>
                    </li>
                    <li className="border-t border-white/10 mt-1 pt-1">
                      <span className="block px-2 py-1 text-xs text-text-muted/70 uppercase tracking-wider">
                        {t('navbar.getTheApp', 'Get the App')}
                      </span>
                    </li>
                    <li>
                      <a
                        href="https://apps.apple.com/gb/app/simnetiq-global-esim/id6755963262"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 w-full p-2 hover:bg-white/5 hover:text-text-primary rounded transition-colors`}
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
                        className={`inline-flex items-center gap-2 w-full p-2 hover:bg-white/5 hover:text-text-primary rounded transition-colors`}
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          handleDownloadApp();
                        }}
                      >
                        <Smartphone className="w-4 h-4" />
                        {t('navbar.androidApp', 'Android App')}
                      </a>
                    </li>
                    <li className="border-t border-white/10 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className={`inline-flex items-center gap-2 w-full p-2 hover:bg-red-500/10 text-red-400 hover:text-red-400 rounded transition-colors disabled:opacity-50`}
                      >
                        <LogOut className="w-4 h-4 rtl:-scale-x-100" />
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
            className="fixed inset-0 w-full h-full overflow-y-auto bg-[#0a0a0a]/90 backdrop-blur-md"
            style={{ zIndex: 99999 }}
          >
            {/* Header with logo and close button */}
            <div className="flex items-center justify-between p-6">
              <Link href={getLocalizedUrl(currentUser ? "/dashboard" : "/")} className="flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                <span className="sr-only">Simnetiq</span>
                <Image
                  src="/images/logoblack.png"
                  alt="Simnetiq Logo"
                  width={24}
                  height={24}
                />
                <span className="text-base font-bold text-text-primary">Simnetiq</span>
              </Link>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="-m-2.5 rounded-md p-2.5 text-text-primary hover:bg-white/5 transition-colors"
                >
                  <span className="sr-only">{t('navbar.closeMenu', 'Close menu')}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="size-6">
                    <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Centered menu items */}
            <div className="flex flex-col justify-center min-h-[60vh]">
              <div className="space-y-2">
                {/* Authenticated menu */}
                {currentUser ? (
                  <>
                    {/* Name only — bigger, centered */}
                    <p className="text-xl font-bold text-text-primary text-center py-4">
                      {currentUser.displayName || t('navbar.user', 'User')}
                    </p>

                    <div className="border-t border-white/10 my-2 mx-8" />

                    {/* Edit Profile */}
                    <Link
                      href={getLocalizedUrl('/settings')}
                      className="flex items-center justify-center text-base sm:text-lg font-semibold text-text-primary hover:text-tufts-blue hover:bg-white/5 rounded-md transition-all duration-200 py-3 px-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('navbar.editProfile', 'Edit Profile')}
                    </Link>

                    {/* My eSIMs */}
                    <Link
                      href={getLocalizedUrl('/dashboard')}
                      className="flex items-center justify-center text-base sm:text-lg font-semibold text-text-primary hover:text-tufts-blue hover:bg-white/5 rounded-md transition-all duration-200 py-3 px-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('navbar.myEsims', 'My eSIMs')}
                    </Link>

                    {/* Store */}
                    <Link
                      href={getLocalizedUrl('/esim-plans')}
                      className="flex items-center justify-center text-base sm:text-lg font-semibold text-text-primary hover:text-tufts-blue hover:bg-white/5 rounded-md transition-all duration-200 py-3 px-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('navbar.store', 'Store')}
                    </Link>

                    <div className="border-t border-white/10 my-2 mx-8" />

                    {/* Download App — device-aware */}
                    <div className="flex justify-center py-3 px-4">
                      <PlatformDownloadCTA variant="secondary" size="sm" source="mobile_menu" />
                    </div>

                    <div className="border-t border-white/10 my-2 mx-8" />

                    {/* Support */}
                    <Link
                      href={getLocalizedUrl('/contact')}
                      className="flex items-center justify-center gap-2 text-base sm:text-lg font-semibold text-text-primary hover:text-tufts-blue hover:bg-white/5 rounded-md transition-all duration-200 py-3 px-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Headphones className="w-5 h-5" />
                      {t('navbar.support', 'Support')}
                    </Link>

                    {/* Log Out — rounded outlined button */}
                    <div className="flex justify-center pt-4 pb-2 px-8">
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full py-3 text-base font-semibold text-red-400 border border-red-400/30 rounded-full hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        {isLoggingOut ? t('navbar.loggingOut', 'Logging out...') : t('navbar.logout', 'Log out')}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Non-authenticated menu — unchanged */}
                    <Link
                      href={getLocalizedUrl("/esim-plans")}
                      className="flex items-center justify-center text-base sm:text-lg font-semibold text-text-primary hover:text-tufts-blue hover:bg-white/5 rounded-md transition-all duration-200 py-3 px-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('navbar.store', 'Store')}
                    </Link>

                    <div className="border-t border-white/10 my-4 mx-8" />

                    <Link
                      href={getLocalizedBlogListUrl(currentLanguage)}
                      className="flex items-center justify-center text-base sm:text-lg font-semibold text-text-muted hover:text-tufts-blue hover:bg-white/5 rounded-md transition-all duration-200 py-3 px-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('navbar.blog', 'Blog')}
                    </Link>

                    <Link
                      href={getLocalizedUrl('/contact')}
                      className="flex items-center justify-center text-base sm:text-lg font-semibold text-text-muted hover:text-tufts-blue hover:bg-white/5 rounded-md transition-all duration-200 py-3 px-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('navbar.contactUs', 'Contact Us')}
                    </Link>

                    <Link
                      href={getLocalizedUrl('/about')}
                      className="flex items-center justify-center text-base sm:text-lg font-semibold text-text-muted hover:text-tufts-blue hover:bg-white/5 rounded-md transition-all duration-200 py-3 px-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('navbar.about', 'About')}
                    </Link>

                    <div className="border-t border-white/10 my-4 mx-8" />

                    <div className="flex justify-center py-3 px-4">
                      <PlatformDownloadCTA variant="secondary" size="sm" source="mobile_menu" />
                    </div>

                    <div className="border-t border-white/10 my-4 mx-8" />

                    <Link
                      href={getLocalizedUrl('/login')}
                      className="flex items-center justify-center text-base sm:text-lg font-semibold text-text-primary hover:text-tufts-blue hover:bg-white/5 rounded-md transition-all duration-200 py-3 px-4"
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
