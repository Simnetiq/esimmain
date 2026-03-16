'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { appStoreLinks } from '@esim/shared/utils/appStoreLinks';
import { ExploreStoreCTA } from '../cta';
import FlagImage from '@esim/shared/components/FlagImage';
import dynamic from 'next/dynamic';
// Skeleton placeholder — reserves exact height to prevent CLS when HeroSearch loads
const HeroSearchSkeleton = () => (
  <div className="w-full sm:max-w-md mb-6 h-[50px] rounded-full animate-pulse flex items-center gap-3 px-4" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--card-border)' }}>
    <div className="w-5 h-5 rounded-full" style={{ backgroundColor: 'var(--hover-bg)' }} />
    <div className="h-3 rounded-full flex-1 max-w-[200px]" style={{ backgroundColor: 'var(--hover-bg)' }} />
  </div>
);
const HeroSearch = dynamic(() => import('../HeroSearch'), { ssr: false, loading: () => <HeroSearchSkeleton /> });

// Popular country chips — static, no state dependency
const POPULAR_COUNTRIES = [
  { code: 'jp', name: 'Japan', slug: 'japan' },
  { code: 'de', name: 'Germany', slug: 'germany' },
  { code: 'us', name: 'USA', slug: 'united-states' },
  { code: 'th', name: 'Thailand', slug: 'thailand' },
  { code: 'it', name: 'Italy', slug: 'italy' },
];

// Inline SVG icons — no lucide-react imports
const TagIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const GlobeSmallIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

/**
 * NewHeroSection — premium hero with 60/40 asymmetric grid, Raleway headline.
 * h1 is the LCP element: renders immediately, no state-dependent rendering.
 *
 * @param {{ promo: { code: string; discount: string; message?: string } | null }} props
 */
export default function NewHeroSection({ promo = null }) {
  const pathname = usePathname();
  const { locale, t, isLoading: i18nLoading } = useI18n();

  // SSR-safe language: pathname-based to avoid hydration mismatch
  const ssrSafeLanguage = useMemo(() => detectLanguageFromPath(pathname) || 'en', [pathname]);
  const detectedLanguage = i18nLoading ? ssrSafeLanguage : (locale || ssrSafeLanguage);

  const isRtl = detectedLanguage === 'he' || detectedLanguage === 'ar';
  // Always use ssrSafeLanguage for URLs to avoid hydration mismatch
  const esimPlansUrl = ssrSafeLanguage && ssrSafeLanguage !== 'en' ? `/${ssrSafeLanguage}/esim-plans` : '/esim-plans';

  const headlinePart1 = t('hero.darkHeadlinePart1', 'Stay connected');
  const headlineHighlight = t('hero.darkHeadlineHighlight', 'anywhere');
  const headlinePart2 = t('hero.darkHeadlinePart2', 'in the world');
  const subtitleText = t('hero.darkSubtitle', 'Instant eSIM activation for 200+ countries. No SIM cards, no roaming fees, no hassle.');

  const trustBadges = [
    t('hero.countries', '200+ Countries'),
    t('hero.instantActivation', 'Instant Setup'),
    t('hero.fiveStarRated', '5-Star Rated'),
  ];

  // Refs for scroll parallax
  const darkPhoneRef = useRef(null);
  const lightPhoneRef = useRef(null);
  const heroRef = useRef(null);
  const rafId = useRef(0);

  // Platform detection — show both on SSR, hide irrelevant on client
  const [platform, setPlatform] = useState('both'); // 'ios' | 'android' | 'both'
  useEffect(() => {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) setPlatform('ios');
    else if (/Android/i.test(ua)) setPlatform('android');
  }, []);

  // Scroll parallax for phone mockups (desktop only)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const handleScroll = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        if (!heroRef.current) return;
        const rect = heroRef.current.getBoundingClientRect();
        const sectionHeight = rect.height || 1;
        const scrolled = -rect.top;
        const progress = Math.max(0, Math.min(1, scrolled / sectionHeight));

        if (lightPhoneRef.current) {
          const drift = progress * sectionHeight * 0.15;
          const scale = 1 + progress * 0.1;
          lightPhoneRef.current.style.transform = `translateY(${drift}px) scale(${scale}) rotate(3deg)`;
        }
        if (darkPhoneRef.current) {
          const drift = progress * sectionHeight * 0.08;
          const scale = 1 - progress * 0.08;
          darkPhoneRef.current.style.transform = `translateY(${drift}px) scale(${scale}) rotate(-4deg)`;
        }
      });
    };

    const toggle = () => {
      if (mql.matches) {
        window.addEventListener('scroll', handleScroll, { passive: true });
      } else {
        window.removeEventListener('scroll', handleScroll);
      }
    };

    toggle();
    mql.addEventListener('change', toggle);
    return () => {
      mql.removeEventListener('change', toggle);
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  const countryUrl = (slug) =>
    ssrSafeLanguage && ssrSafeLanguage !== 'en' ? `/${ssrSafeLanguage}/esim-plans?country=${slug}` : `/esim-plans?country=${slug}`;

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex flex-col bg-bg-primary overflow-hidden"
      aria-label="Hero"
      lang={detectedLanguage}
      suppressHydrationWarning
    >
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        aria-hidden="true"
        style={{
          backgroundImage: `radial-gradient(var(--tufts-blue, #4975D4) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Gradient fade at bottom so grid doesn't end abruptly */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg-primary to-transparent pointer-events-none" aria-hidden="true" />

      {/* Promo banner — shown only when promo prop is provided */}
      {promo && (
        <div
          className="relative z-10 w-full animate-promo-pulse"
          role="status"
          aria-label="Promotional offer"
        >
          <div
            className="flex items-center justify-center gap-2 px-4 py-2.5 rtl-native-flex"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            <TagIcon className="w-4 h-4 text-accent-highlight flex-shrink-0" />
            <p className="text-sm font-medium text-accent-highlight text-center">
              {t('hero.promoPrefix', 'Use code')}
              {' '}
              <span className="font-bold">{promo.code}</span>
              {' '}
              —
              {' '}
              {promo.message || `${promo.discount} off`}
              {' '}
              {t('hero.promoSuffix', 'for {{discount}}% off your first eSIM')}
            </p>
          </div>
        </div>
      )}

      {/* Main hero content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-4 py-20 lg:py-28">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start lg:pt-8">

            {/* Left column: content */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-start">

              {/* Tagline badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium text-tufts-blue mb-6 rtl-native-flex"
                style={{
                  backgroundColor: 'rgba(73, 117, 212, 0.1)',
                  border: '1px solid rgba(73, 117, 212, 0.2)',
                }}
              >
                <GlobeSmallIcon className="w-4 h-4 flex-shrink-0" />
                <span>{t('hero.tagline', 'Global eSIM Platform')}</span>
              </div>

              {/* Promo pill below tagline */}
              {promo && (
                <div
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium text-accent-highlight mb-6 rtl-native-flex"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                  }}
                >
                  <TagIcon className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <span className="font-bold">{promo.code}</span>
                    {' — '}
                    {promo.message || `${promo.discount} off`}
                  </span>
                </div>
              )}

              {/* h1 — LCP element. Renders immediately; no state dependencies. */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-text-primary leading-[1.1] mb-6">
                <span className="block">{headlinePart1}</span>
                <span className={`block text-tufts-blue${!isRtl ? ' italic' : ''}`}>{headlineHighlight}</span>
                <span className="block text-text-muted">{headlinePart2}</span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-text-muted mb-6 max-w-xl leading-relaxed">
                {subtitleText}
              </p>

              {/* Destination search with autocomplete */}
              <HeroSearch esimPlansUrl={esimPlansUrl} />

              {/* Popular country chips */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-6 rtl-native-flex">
                <span className="text-xs text-text-muted">{t('hero.popular', 'Popular')}:</span>
                {POPULAR_COUNTRIES.map((country) => (
                  <Link
                    key={country.code}
                    href={countryUrl(country.slug)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-text-muted transition-colors duration-150 hover:text-text-primary rtl-native-flex"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--card-border)',
                    }}
                  >
                    <FlagImage code={country.code} className="w-4 h-4 rounded-full object-cover" />
                    <span>{country.name}</span>
                  </Link>
                ))}
              </div>

              {/* CTAs — all 3 in one row, same pill-with-circle design, same size */}
              <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3 mb-6 w-full sm:w-auto rtl-native-flex-sm">
                {/* Explore Plans */}
                <ExploreStoreCTA
                  variant="themed"
                  size="sm"
                  source="hero_primary_cta"
                  className="w-full sm:w-auto"
                />
                {/* iOS — hidden on Android via CSS to avoid layout shift */}
                <a
                  href={appStoreLinks.ios}
                  target="_blank"
                  rel="noopener noreferrer"
                  suppressHydrationWarning
                  className={`inline-flex items-center rounded-full font-semibold transition-all duration-200 hover:opacity-90 rtl-native-flex ps-5 pe-1 py-1 text-sm w-full sm:w-auto shadow-sm ${platform === 'android' ? 'hidden' : ''}`}
                  style={{
                    backgroundColor: 'var(--cta-secondary-bg)',
                    color: 'var(--cta-secondary-text)',
                    border: '1px solid var(--cta-secondary-border)',
                  }}
                >
                  <span className="flex-1 text-center">{t('hero.appStore', 'App Store')}</span>
                  <span
                    className="ms-2.5 flex-shrink-0 inline-flex items-center justify-center rounded-full w-8 h-8 rtl-native-flex"
                    style={{ backgroundColor: 'var(--cta-secondary-circle-bg)' }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="21" y1="17" x2="18" y2="17"/><line x1="20" y1="21" x2="14.29" y2="10.72"/><line x1="12" y1="6.6" x2="10" y2="3"/><line x1="14" y1="3" x2="4" y2="21"/><line x1="13" y1="17" x2="3" y2="17"/>
                    </svg>
                  </span>
                </a>
                {/* Android — hidden on iOS via CSS to avoid layout shift */}
                <a
                  href={appStoreLinks.android}
                  target="_blank"
                  rel="noopener noreferrer"
                  suppressHydrationWarning
                  className={`inline-flex items-center rounded-full font-semibold transition-all duration-200 hover:opacity-90 rtl-native-flex ps-5 pe-1 py-1 text-sm w-full sm:w-auto shadow-sm ${platform === 'ios' ? 'hidden' : ''}`}
                  style={{
                    backgroundColor: 'var(--cta-secondary-bg)',
                    color: 'var(--cta-secondary-text)',
                    border: '1px solid var(--cta-secondary-border)',
                  }}
                >
                  <span className="flex-1 text-center">{t('hero.googlePlay', 'Google Play')}</span>
                  <span
                    className="ms-2.5 flex-shrink-0 inline-flex items-center justify-center rounded-full w-8 h-8 rtl-native-flex"
                    style={{ backgroundColor: 'var(--cta-secondary-circle-bg)' }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M2 3.65629C2 2.15127 3.59967 1.18549 4.93149 1.88645L20.7844 10.2301C22.2091 10.9799 22.2091 13.0199 20.7844 13.7698L4.9315 22.1134C3.59968 22.8144 2 21.8486 2 20.3436V3.65629ZM19.8529 11.9999L16.2682 10.1132L14.2243 11.9999L16.2682 13.8866L19.8529 11.9999ZM14.3903 14.875L12.75 13.3608L6.75782 18.8921L14.3903 14.875ZM12.75 10.639L14.3903 9.12488L6.75782 5.10777L12.75 10.639ZM4 5.28391L11.2757 11.9999L4 18.7159V5.28391Z"/>
                    </svg>
                  </span>
                </a>
              </div>

              {/* Trust badges — plain checkmark list */}
              <div
                className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs text-text-muted rtl-native-flex"
                role="list"
                aria-label="Trust indicators"
              >
                {trustBadges.map((label) => (
                  <div key={label} role="listitem" className="flex items-center gap-1.5 rtl-native-flex">
                    <CheckIcon className="w-4 h-4 text-tufts-blue flex-shrink-0" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: multi-layered phone mockup */}
            <div className="hidden lg:flex items-center justify-center relative" aria-hidden="true">

              {/* Container — phones overflow this boundary for 3D depth */}
              <div className="relative w-full max-w-xl mx-auto" style={{ height: '620px' }}>

                {/* Stacked travel photos — layered, bigger */}
                <div className="absolute rounded-2xl overflow-hidden border border-white/[0.06]" style={{ width: '80%', height: '65%', left: '0%', top: '5%', transform: 'rotate(-3deg)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                  <img src="/images/hero-phuket.avif" alt="" className="w-full h-full object-cover" loading="eager" fetchPriority="low" />
                </div>
                <div className="absolute rounded-2xl overflow-hidden border border-white/[0.06]" style={{ width: '80%', height: '65%', right: '0%', top: '12%', transform: 'rotate(2deg)', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
                  <img src="/images/hero-phones.avif" alt="" className="w-full h-full object-cover" loading="eager" fetchPriority="low" />
                </div>
                <div className="absolute rounded-2xl overflow-hidden border border-white/[0.06]" style={{ width: '75%', height: '60%', right: '-5%', top: '20%', transform: 'rotate(5deg)', boxShadow: '0 16px 48px rgba(0,0,0,0.3)' }}>
                  <img src="/images/hero-paris.avif" alt="" className="w-full h-full object-cover" loading="eager" fetchPriority="low" />
                </div>

                {/* Dark phone — behind, tilted left */}
                <div ref={darkPhoneRef} className="absolute z-10 drop-shadow-2xl will-change-transform" style={{ width: '220px', left: '18%', bottom: '0', transform: 'rotate(-4deg)' }}>
                  <img src="/images/phone-dark.png" alt="" className="w-full h-auto" loading="eager" fetchPriority="low" />
                </div>

                {/* Light phone — in front, slightly right */}
                <div ref={lightPhoneRef} className="absolute z-20 drop-shadow-2xl will-change-transform" style={{ width: '230px', right: '15%', bottom: '-8px', transform: 'rotate(3deg)' }}>
                  <img src="/images/phone-light.png" alt="" className="w-full h-auto" loading="eager" fetchPriority="low" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
