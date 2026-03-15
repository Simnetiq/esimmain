'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getNativeLanguageName, getLocalizedBlogUrl, getLocalizedBlogListUrl } from '@esim/shared/utils/languageUtils';

/**
 * Language → country code mapping for flag SVGs.
 * Flag files live at /flags/{countryCode}.svg
 */
const localeConfig = {
  en: { label: 'EN', countryCode: 'us', name: 'English' },
  es: { label: 'ES', countryCode: 'es', name: 'Español' },
  ru: { label: 'RU', countryCode: 'ru', name: 'Русский' },
  de: { label: 'DE', countryCode: 'de', name: 'Deutsch' },
  fr: { label: 'FR', countryCode: 'fr', name: 'Français' },
  he: { label: 'עב', countryCode: 'il', name: 'עברית' },
  ar: { label: 'عر', countryCode: 'sa', name: 'العربية' },
  pt: { label: 'PT', countryCode: 'br', name: 'Português' },
  ja: { label: '日', countryCode: 'jp', name: '日本語' },
  zh: { label: '中', countryCode: 'cn', name: '中文' },
  pl: { label: 'PL', countryCode: 'pl', name: 'Polski' },
  uk: { label: 'УК', countryCode: 'ua', name: 'Українська' },
  hi: { label: 'हि', countryCode: 'in', name: 'हिन्दी' },
};

const supportedLocales = Object.keys(localeConfig);

function getFlagUrl(countryCode) {
  return `/flags/${countryCode}.svg`;
}

/**
 * LanguageSelector — Doppler-inspired language switcher with flag icons.
 *
 * @param {{ variant: 'desktop' | 'mobile', onClose?: () => void }} props
 * - `desktop`: pill button in navbar that opens a portal dropdown panel
 * - `mobile`: accordion inside mobile menu
 */
const LanguageSelector = ({ variant = 'desktop', onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, changeLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const navRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  // Listen for navbar hide event
  useEffect(() => {
    const handler = () => setIsOpen(false);
    window.addEventListener('closeNavbarDropdowns', handler);
    return () => window.removeEventListener('closeNavbarDropdowns', handler);
  }, []);

  const currentLang = localeConfig[locale] || localeConfig.en;

  // Calculate panel position — align to the max-w-7xl inner container, not full-width nav
  const recalcPos = useCallback(() => {
    const nav = btnRef.current?.closest('nav');
    if (!nav) return;
    // Find the inner max-w-7xl div (the content container)
    const inner = nav.querySelector('[data-nav-inner]') || nav.firstElementChild;
    const rect = inner ? inner.getBoundingClientRect() : nav.getBoundingClientRect();
    const isRtl = document.documentElement.dir === 'rtl';
    setPanelPos({
      top: nav.getBoundingClientRect().bottom + 8,
      ...(isRtl
        ? { left: rect.left }
        : { right: window.innerWidth - rect.right }),
    });
  }, []);

  const toggleOpen = useCallback(() => {
    recalcPos();
    setIsOpen(prev => !prev);
  }, [recalcPos]);

  const close = useCallback(() => setIsOpen(false), []);

  // Keep panel aligned on resize/scroll
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('resize', recalcPos);
    window.addEventListener('scroll', recalcPos, { passive: true });
    return () => {
      window.removeEventListener('resize', recalcPos);
      window.removeEventListener('scroll', recalcPos);
    };
  }, [isOpen, recalcPos]);

  // Click outside & Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      const target = e.target;
      if (!btnRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        close();
      }
    };
    const handleKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, close]);

  // Path localization logic (preserves current page when switching language)
  const getLocalizedPath = useCallback((langCode) => {
    // Blog URLs
    if (pathname.includes('/blog')) {
      const langBlogPost = pathname.match(/^\/(he|ar|ru|de|fr|es|pt|ja|zh|pl|uk|hi)\/blog\/(.+)$/);
      if (langBlogPost) return getLocalizedBlogUrl(langBlogPost[2], langCode);
      const blogPost = pathname.match(/^\/blog\/(.+)$/);
      if (blogPost) return getLocalizedBlogUrl(blogPost[1], langCode);
      if (pathname.match(/^\/(he|ar|ru|de|fr|es|pt|ja|zh|pl|uk|hi)\/blog\/?$/) || pathname === '/blog' || pathname === '/blog/') {
        return getLocalizedBlogListUrl(langCode);
      }
    }

    // Strip existing language prefix
    let cleanPath = pathname;
    const prefixes = ['/he', '/ar', '/ru', '/de', '/fr', '/es', '/pt', '/ja', '/zh', '/pl', '/uk', '/hi',
      '/hebrew', '/arabic', '/russian', '/german', '/french', '/spanish'];
    for (const pfx of prefixes) {
      if (cleanPath === pfx || cleanPath.startsWith(pfx + '/')) {
        cleanPath = cleanPath.substring(pfx.length) || '/';
        break;
      }
    }
    if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;

    return langCode === 'en' ? cleanPath : `/${langCode}${cleanPath}`;
  }, [pathname]);

  const switchLanguage = useCallback(async (langCode) => {
    setIsOpen(false);
    if (changeLanguage) await changeLanguage(langCode);
    else if (typeof window !== 'undefined') localStorage.setItem('Simnetiq-language', langCode);
    await new Promise(r => setTimeout(r, 50));
    router.push(getLocalizedPath(langCode));
    if (onClose) onClose();
  }, [changeLanguage, router, getLocalizedPath, onClose]);

  // ─── MOBILE VARIANT: accordion inside mobile menu ───
  if (variant === 'mobile') {
    return (
      <>
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium text-text-primary hover:bg-[var(--hover-bg)] transition-colors"
          aria-expanded={isOpen}
        >
          <span className="flex items-center gap-2">
            <img src={getFlagUrl(currentLang.countryCode)} alt="" className="w-5 h-5 rounded-full object-cover" />
            {currentLang.name}
          </span>
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expandable language grid */}
        <div
          className={`grid transition-[grid-template-rows] duration-[180ms] ease-out ${
            isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div className="grid grid-cols-2 gap-1 mt-1 px-1 pb-1 max-h-[50vh] overflow-y-auto">
              {supportedLocales.map((loc) => {
                const config = localeConfig[loc];
                const isActive = locale === loc;
                return (
                  <button
                    key={loc}
                    onClick={() => switchLanguage(loc)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150 min-w-0 ${
                      isActive
                        ? 'text-tufts-blue ring-1'
                        : 'text-text-muted hover:text-text-primary hover:bg-[var(--hover-bg)]'
                    }`}
                    style={isActive ? {
                      backgroundColor: 'rgba(73, 117, 212, 0.12)',
                      ringColor: 'rgba(73, 117, 212, 0.2)',
                    } : undefined}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <img src={getFlagUrl(config.countryCode)} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                    <span className="font-medium truncate">{config.name}</span>
                    {isActive && (
                      <svg className="w-3.5 h-3.5 ms-auto shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── DESKTOP VARIANT: pill button + portaled dropdown ───
  return (
    <>
      <button
        ref={btnRef}
        onClick={toggleOpen}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
          isOpen
            ? 'bg-bg-secondary text-text-primary'
            : 'text-text-primary hover:bg-[var(--hover-bg)]'
        }`}
        style={isOpen ? { backgroundColor: 'var(--bg-secondary)' } : undefined}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <img src={getFlagUrl(currentLang.countryCode)} alt="" className="w-5 h-5 rounded-full object-cover" />
        <span>{currentLang.label}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Portal dropdown */}
      {mounted && createPortal(
        <div
          ref={panelRef}
          style={panelPos ? { top: panelPos.top, right: panelPos.right, left: panelPos.left } : undefined}
          className={`fixed z-[60] w-[min(calc(100vw-2rem),42rem)] transition-all duration-200 origin-top-right ${
            isOpen && panelPos
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div
            role="menu"
            aria-label="Select language"
            aria-hidden={!isOpen}
            className="backdrop-blur-xl shadow-lg rounded-2xl p-2.5"
            style={{
              backgroundColor: 'var(--navbar-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: '0 20px 25px -5px var(--shadow-color)',
            }}
          >
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
              {supportedLocales.map((loc) => {
                const config = localeConfig[loc];
                const isActive = locale === loc;
                return (
                  <button
                    key={loc}
                    role="menuitem"
                    tabIndex={isOpen ? 0 : -1}
                    onClick={() => switchLanguage(loc)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150 min-w-0 ${
                      isActive
                        ? 'text-tufts-blue'
                        : 'text-text-muted hover:text-text-primary hover:bg-[var(--hover-bg)]'
                    }`}
                    style={isActive ? {
                      backgroundColor: 'rgba(73, 117, 212, 0.12)',
                      outline: '1px solid rgba(73, 117, 212, 0.2)',
                    } : undefined}
                    aria-current={isActive ? 'true' : undefined}
                    aria-label={`Switch to ${config.name}`}
                  >
                    <img src={getFlagUrl(config.countryCode)} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                    <span className="font-medium truncate">{config.name}</span>
                    {isActive && (
                      <svg className="w-3.5 h-3.5 ms-auto shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default LanguageSelector;
