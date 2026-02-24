'use client';

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { PlatformDownloadCTA, ExploreStoreCTA } from '../cta';

// Lazy load Antigravity - only after LCP to not block initial render
const Antigravity = lazy(() => import('../animations/Antigravity'));

// Inline SVG icons to avoid lucide-react bundle overhead
const GlobeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
  </svg>
);

const ZapIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
  </svg>
);

const ShieldIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
  </svg>
);

// Deferred background component - loads after LCP
function DeferredBackground({ isMobile }) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Defer background animation until after LCP (use requestIdleCallback or setTimeout)
    // Note: requestIdleCallback is not supported on Safari/iOS, so we need to check window
    const hasIdleCallback = typeof window !== 'undefined' && 'requestIdleCallback' in window;

    let timer;
    if (hasIdleCallback) {
      timer = window.requestIdleCallback(() => setShouldRender(true), { timeout: 2000 });
    } else {
      timer = setTimeout(() => setShouldRender(true), 3000);
    }

    return () => {
      if (hasIdleCallback && typeof timer === 'number') {
        window.cancelIdleCallback(timer);
      } else {
        clearTimeout(timer);
      }
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <Suspense fallback={null}>
      <Antigravity
        color="#4975D4"
        autoAnimate={true}
        count={isMobile ? 100 : 200}
        magnetRadius={isMobile ? 5 : 7}
        ringRadius={isMobile ? 6 : 8}
        waveSpeed={0.3}
        waveAmplitude={1.2}
        particleSize={isMobile ? 0.7 : 1.0}
        lerpSpeed={0.04}
        particleVariance={1}
      />
    </Suspense>
  );
}

export default function HeroSection() {
  const pathname = usePathname();
  const { locale, t, isLoading: i18nLoading } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(true); // Default to mobile (no animations) for SSR

  useEffect(() => {
    setMounted(true);
    // Detect mobile devices - used to reduce animation complexity
    setIsMobile(window.innerWidth < 768);
  }, []);

  // SSR-safe language: always use pathname-based detection to avoid
  // hydration mismatch from localStorage reads
  const ssrSafeLanguage = useMemo(() => detectLanguageFromPath(pathname) || 'en', [pathname]);

  const detectedLanguage = useMemo(() => {
    try {
      if (i18nLoading) {
        // On client, prefer localStorage; on server, fall back to pathname
        if (typeof window !== 'undefined') {
          const savedLanguage = localStorage.getItem('Simnetiq-language');
          if (savedLanguage) return savedLanguage;
        }
        return ssrSafeLanguage;
      }
      return locale || 'en';
    } catch {
      return 'en';
    }
  }, [locale, ssrSafeLanguage, i18nLoading]);

  // Use pathname-based language for direction to prevent CLS on hydration.
  // The dir attribute must match between server and client first render.
  const direction = getLanguageDirection(ssrSafeLanguage);

  // Apply IBM Plex Sans Italic for "anywhere" only in EN and DE
  const useIbmPlexSansItalic = detectedLanguage === 'en' || detectedLanguage === 'de';
  const highlightClassName = useIbmPlexSansItalic
    ? 'inline italic text-tufts-blue font-ibm-plex-sans'
    : 'inline italic text-tufts-blue';

  // Trust indicators data - using inline SVG icons
  const trustIndicators = [
    { Icon: GlobeIcon, label: t('hero.countries', '200+ Countries'), key: 'countries' },
    { Icon: ZapIcon, label: t('hero.instantActivation', 'Instant Activation'), key: 'activation' },
    { Icon: ShieldIcon, label: t('hero.securePayment', 'Secure Payment'), key: 'secure' },
  ];

  // Get translated text - headline split into parts for styling
  // Use fallbacks immediately for LCP - don't wait for translations
  const headlinePart1 = t('hero.headlinePart1', 'The easiest way to get mobile data');
  const headlineHighlight = t('hero.headlineHighlight', 'anywhere');
  const headlinePart2 = t('hero.headlinePart2', 'in the world');
  const subtitleText = t('hero.subtitle', 'Activate your eSIM in minutes and stay connected in 200+ destinations worldwide.');

  return (
    <div className="hero-section relative min-h-screen flex flex-col bg-white" dir={direction} lang={detectedLanguage}>
      {/* Antigravity Background Animation - deferred to after LCP */}
      <div className="absolute inset-0 opacity-20" aria-hidden="true">
        {mounted && <DeferredBackground isMobile={isMobile} />}
      </div>

      <div className="relative flex-1 flex flex-col pointer-events-none">
        {/* Main Content - pointer-events-none to allow mouse to reach canvas */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-20 lg:py-24">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl text-center">

              {/* Headline - ALWAYS render immediately for LCP, animations are purely decorative */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-8xl font-bold tracking-tight text-eerie-black mb-6 lg:mb-8 leading-[1.1]">
                <span className="inline">{headlinePart1}</span>{' '}
                <span className={highlightClassName}>{headlineHighlight}</span>{' '}
                <span className="inline">{headlinePart2}</span>
              </h1>

              {/* Subtitle - render immediately */}
              <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-600 mb-10 lg:mb-12 max-w-2xl lg:max-w-3xl mx-auto leading-relaxed">
                {subtitleText}
              </p>

              {/* CTA Buttons - Explore Store is PRIMARY */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 lg:mb-12 pointer-events-auto">
                {/* Primary CTA - Explore eSIM Store */}
                <ExploreStoreCTA
                  variant="dark"
                  size="md"
                  source="hero_primary_cta"
                />

                {/* Secondary CTAs - Download App (iOS + Android on desktop, single on mobile) */}
                <PlatformDownloadCTA
                  variant="secondary"
                  size="md"
                  source="hero_secondary_cta"
                />
              </div>

              {/* Trust Indicators - stable min-h prevents bottom-line shift */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-xs sm:text-sm text-gray-500 justify-center min-h-[24px] sm:min-h-[28px]">
                {trustIndicators.map(({ Icon, label, key }, index) => (
                  <React.Fragment key={key}>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 sm:text-eerie-black">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 sm:text-eerie-black" />
                      <span>{label}</span>
                    </div>
                    {/* Vertical separator between items - hidden on mobile */}
                    {index < trustIndicators.length - 1 && (
                      <div className="hidden sm:block w-px h-4 bg-gray-300" />
                    )}
                  </React.Fragment>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
