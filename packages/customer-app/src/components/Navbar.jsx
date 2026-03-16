'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { detectLanguageFromPath, getLocalizedBlogListUrl, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';

/**
 * Simnetiq logo — inline SVG from simnetiqlogo.svg.
 * Rounded black card with "Sñ" text in light gray.
 * Dark mode: inverted — white card with dark text.
 */
const SimnetiqLogo = ({ className = 'w-7 h-7' }) => (
  <svg className={className} viewBox="0 0 665 831" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g>
      <path d="M137.5 133.5V689C289.804 689 527.5 689 527.5 689V267L405 133.5H137.5Z" className="fill-[#1F1F1F] dark:fill-white" />
      <path d="M137.5 133.5V689C289.804 689 527.5 689 527.5 689V267L405 133.5H137.5Z" className="stroke-[#1F1F1F] dark:stroke-white" strokeWidth="131" strokeLinejoin="round" />
    </g>
    <path d="M242.302 649.7C226.102 649.7 211.802 646.8 199.402 641C187.002 635.2 177.302 626.9 170.302 616.1C163.302 605.3 159.802 592.3 159.802 577.1V568.7H198.802V577.1C198.802 589.7 202.702 599.2 210.502 605.6C218.302 611.8 228.902 614.9 242.302 614.9C255.902 614.9 266.002 612.2 272.602 606.8C279.402 601.4 282.802 594.5 282.802 586.1C282.802 580.3 281.102 575.6 277.702 572C274.502 568.4 269.702 565.5 263.302 563.3C257.102 560.9 249.502 558.7 240.502 556.7L233.602 555.2C219.202 552 206.802 548 196.402 543.2C186.202 538.2 178.302 531.7 172.702 523.7C167.302 515.7 164.602 505.3 164.602 492.5C164.602 479.7 167.602 468.8 173.602 459.8C179.802 450.6 188.402 443.6 199.402 438.8C210.602 433.8 223.702 431.3 238.702 431.3C253.702 431.3 267.002 433.9 278.602 439.1C290.402 444.1 299.602 451.7 306.202 461.9C313.002 471.9 316.402 484.5 316.402 499.7V508.7H277.402V499.7C277.402 491.7 275.802 485.3 272.602 480.5C269.602 475.5 265.202 471.9 259.402 469.7C253.602 467.3 246.702 466.1 238.702 466.1C226.702 466.1 217.802 468.4 212.002 473C206.402 477.4 203.602 483.5 203.602 491.3C203.602 496.5 204.902 500.9 207.502 504.5C210.302 508.1 214.402 511.1 219.802 513.5C225.202 515.9 232.102 518 240.502 519.8L247.402 521.3C262.402 524.5 275.402 528.6 286.402 533.6C297.602 538.6 306.302 545.2 312.502 553.4C318.702 561.6 321.802 572.1 321.802 584.9C321.802 597.7 318.502 609 311.902 618.8C305.502 628.4 296.302 636 284.302 641.6C272.502 647 258.502 649.7 242.302 649.7ZM352.535 645.5V496.7H389.735V516.2H395.135C397.535 511 402.035 506.1 408.635 501.5C415.235 496.7 425.235 494.3 438.635 494.3C450.235 494.3 460.335 497 468.935 502.4C477.735 507.6 484.535 514.9 489.335 524.3C494.135 533.5 496.535 544.3 496.535 556.7V645.5H458.735V559.7C458.735 548.5 455.935 540.1 450.335 534.5C444.935 528.9 437.135 526.1 426.935 526.1C415.335 526.1 406.335 530 399.935 537.8C393.535 545.4 390.335 556.1 390.335 569.9V645.5H352.535ZM399.635 479.9L421.835 435.5H464.435L432.635 479.9H399.635Z" className="fill-[#EDEDED] dark:fill-[#1F1F1F]" />
  </svg>
);

const Navbar = () => {
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const { currentUser, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const lastScrollYRef = useRef(0);
  const navRef = useRef(null);

  // Language detection — with server-side translations, locale is correct from first render
  const pathnameLanguage = detectLanguageFromPath(pathname) || 'en';
  const [currentLanguage, setCurrentLanguage] = useState(locale || pathnameLanguage);

  useEffect(() => {
    if (locale) setCurrentLanguage(locale);
  }, [locale]);

  const direction = getLanguageDirection(currentLanguage);

  const getLocalizedUrl = useCallback((path) => {
    return currentLanguage === 'en' ? path : `/${currentLanguage}${path}`;
  }, [currentLanguage]);

  // Scroll hide/show
  useEffect(() => {
    let ticking = false;
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;
      if (Math.abs(delta) < 5) { ticking = false; return; }
      const shouldBeVisible = currentScrollY < 10 || delta < 0;
      setIsVisible(prev => prev === shouldBeVisible ? prev : shouldBeVisible);
      lastScrollYRef.current = currentScrollY;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) { requestAnimationFrame(controlNavbar); ticking = true; }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMounted(true); }, []);

  // Close dropdowns when navbar hides
  useEffect(() => {
    if (!isVisible) {
      window.dispatchEvent(new CustomEvent('closeNavbarDropdowns'));
    }
  }, [isVisible]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!isMenuOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setIsMenuOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isMenuOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setIsMenuOpen(false);
      toast.success(t('navbar.loggedOutSuccessfully', 'Logged out successfully'));
      router.push(getLocalizedUrl('/'));
    } catch {
      toast.error(t('navbar.failedToLogout', 'Failed to logout'));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getUserInitials = () => {
    if (!currentUser) return '?';
    if (currentUser.displayName) {
      const names = currentUser.displayName.split(' ');
      return names.length >= 2
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0][0].toUpperCase();
    }
    return currentUser.email ? currentUser.email[0].toUpperCase() : '?';
  };

  const closeMobile = useCallback(() => setIsMenuOpen(false), []);

  // Mobile menu overlay
  const mobileOverlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className={`fixed inset-0 z-[60] lg:hidden transition-opacity duration-200 ease-out ${
        isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      dir={direction}
      lang={currentLanguage}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={closeMobile} aria-hidden="true" />

      {/* Panel */}
      <div
        className={`relative mx-4 mt-4 rounded-2xl shadow-lg overflow-hidden transition-[transform,opacity] duration-200 ease-out ${
          isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
        }`}
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--card-border)',
        }}
      >
        {/* Top row — logo + close */}
        <div className="flex rtl-native-flex items-center justify-between h-14 px-4" style={{ borderBottom: '1px solid var(--divider)' }}>
          <Link href={getLocalizedUrl('/')} className="flex rtl-native-flex items-center gap-2" onClick={closeMobile} dir="ltr">
            <SimnetiqLogo className="w-6 h-6" />
            <span className="text-base font-semibold text-text-primary tracking-tight">simnetiq</span>
          </Link>
          <button
            onClick={closeMobile}
            className="p-2 -me-2 text-text-muted hover:text-text-primary transition-colors rounded-full"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <div className="px-2 py-2 space-y-0.5">
          <Link
            href={getLocalizedUrl('/esim-plans')}
            onClick={closeMobile}
            className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-text-primary hover:bg-[var(--hover-bg)] transition-colors"
          >
            {t('navbar.store', 'Store')}
          </Link>

          <Link
            href={getLocalizedUrl('/contact')}
            onClick={closeMobile}
            className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-text-primary hover:bg-[var(--hover-bg)] transition-colors"
          >
            {t('navbar.help', 'Help')}
          </Link>

          <Link
            href={getLocalizedBlogListUrl(currentLanguage)}
            onClick={closeMobile}
            className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-text-primary hover:bg-[var(--hover-bg)] transition-colors"
          >
            {t('navbar.blog', 'Blog')}
          </Link>

          {currentUser ? (
            <>
              <Link
                href={getLocalizedUrl('/dashboard')}
                onClick={closeMobile}
                className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-text-primary hover:bg-[var(--hover-bg)] transition-colors"
              >
                {t('navbar.myEsims', 'My eSIMs')}
              </Link>
              <Link
                href={getLocalizedUrl('/settings')}
                onClick={closeMobile}
                className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-text-primary hover:bg-[var(--hover-bg)] transition-colors"
              >
                {t('navbar.settings', 'Settings')}
              </Link>
            </>
          ) : (
            <Link
              href={getLocalizedUrl('/login')}
              onClick={closeMobile}
              className="flex items-center justify-center mx-2 mt-1 px-4 py-2 text-sm font-semibold rounded-full transition-colors"
              style={{ backgroundColor: 'var(--login-bg)', color: 'var(--login-text)' }}
            >
              {t('navbar.login', 'Login')}
            </Link>
          )}
        </div>

        {/* Language + theme row */}
        <div className="px-2 py-2" style={{ borderTop: '1px solid var(--divider)' }}>
          <LanguageSelector variant="mobile" onClose={closeMobile} />

          <div className="flex rtl-native-flex items-center justify-between px-3 py-2.5">
            <span className="text-sm font-medium text-text-muted">{t('navbar.theme', 'Theme')}</span>
            <ThemeToggle />
          </div>
        </div>

        {/* Logout for authenticated users */}
        {currentUser && (
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--divider)' }}>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full py-2.5 text-sm font-semibold text-red-400 border rounded-full hover:bg-red-500/10 transition-colors disabled:opacity-50"
              style={{ borderColor: 'rgba(248, 113, 113, 0.3)' }}
            >
              {isLoggingOut ? t('navbar.loggingOut', 'Logging out...') : t('navbar.logout', 'Log out')}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-transform duration-150 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
      dir={direction}
      lang={currentLanguage}
    >
      <nav
        ref={navRef}
        className="relative w-full backdrop-blur-md"
        style={{
          backgroundColor: 'var(--navbar-bg)',
          borderBottom: '1px solid var(--divider)',
        }}
        aria-label="Global"
      >
        <div data-nav-inner className="relative flex rtl-native-flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 mx-auto max-w-7xl">
          {/* Left: Logo — always LTR so icon+text order is preserved */}
          <Link
            href={getLocalizedUrl(currentUser ? '/dashboard' : '/')}
            className="flex rtl-native-flex items-center gap-2 shrink-0"
            dir="ltr"
          >
            <SimnetiqLogo className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="text-base sm:text-lg font-semibold text-text-primary tracking-tight">
              simnetiq
            </span>
          </Link>

          {/* Center: Desktop nav links — absolutely centered */}
          <div className="hidden lg:flex rtl-native-flex items-center gap-0.5 absolute inset-0 justify-center pointer-events-none">
            <div className="flex rtl-native-flex items-center gap-0.5 pointer-events-auto">
              <Link
                href={getLocalizedUrl('/esim-plans')}
                className="text-text-muted hover:text-text-primary transition-colors text-sm font-medium px-3 py-2"
              >
                {t('navbar.store', 'Store')}
              </Link>

              <Link
                href={getLocalizedUrl('/contact')}
                className="text-text-muted hover:text-text-primary transition-colors text-sm font-medium px-3 py-2"
              >
                {t('navbar.help', 'Help')}
              </Link>

              {currentUser ? (
                <Link
                  href={getLocalizedUrl('/dashboard')}
                  className="text-text-muted hover:text-text-primary transition-colors text-sm font-medium px-3 py-2"
                >
                  {t('navbar.myEsims', 'My eSIMs')}
                </Link>
              ) : (
                <Link
                  href={getLocalizedUrl('/login')}
                  className="ms-1 px-4 py-1.5 text-sm font-semibold rounded-full transition-colors"
                  style={{ backgroundColor: 'var(--login-bg)', color: 'var(--login-text)' }}
                >
                  {t('navbar.login', 'Login')}
                </Link>
              )}
            </div>
          </div>

          {/* Right: Desktop controls */}
          <div className="hidden lg:flex rtl-native-flex items-center gap-1.5 ms-auto">
            {currentUser && (
              <Link
                href={getLocalizedUrl('/settings')}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-tufts-blue text-white text-xs font-semibold hover:bg-tufts-blue/90 transition-colors"
                aria-label={t('navbar.userMenu', 'User menu')}
              >
                {getUserInitials()}
              </Link>
            )}
            <ThemeToggle />
            <LanguageSelector variant="desktop" />
          </div>

          {/* Mobile: hamburger */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 -me-2 text-text-primary hover:text-text-muted transition-colors"
              aria-label="Open menu"
              aria-expanded={isMenuOpen}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu portal */}
      {mounted && createPortal(mobileOverlay, document.body)}
    </header>
  );
};

export default Navbar;
