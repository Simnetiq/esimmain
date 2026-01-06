'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { PlatformDownloadCTA, ExploreStoreCTA } from '../cta';

// Dynamically import SplitText to avoid SSR issues with GSAP
const SplitText = dynamic(() => import('../animations/SplitText'), {
  ssr: false,
  loading: () => null
});

// Dynamically import Antigravity to avoid SSR issues with Three.js
const Antigravity = dynamic(() => import('../animations/Antigravity'), {
  ssr: false,
  loading: () => null
});

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

// Grid pattern style (matching FeaturesSection)
const gridPatternStyle = {
  backgroundSize: '10px 10px',
  backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
};

// Skeleton component for consistent loading state
function HeroSkeleton({ direction, detectedLanguage }) {
  return (
    <div
      className="hero-section relative min-h-screen flex flex-col bg-white"
      dir={direction}
      lang={detectedLanguage}
    >
      {/* Antigravity Background Animation - interactive with mouse */}
      <div className="absolute inset-0 opacity-20" aria-hidden="true">
        <Antigravity
          color="#4975D4"
          autoAnimate={true}
          count={150}
          magnetRadius={6}
          ringRadius={7}
          waveSpeed={0.3}
          waveAmplitude={1.2}
          particleSize={1.0}
          lerpSpeed={0.04}
          particleVariance={1}
        />
      </div>

      <div className="relative flex-1 flex flex-col pointer-events-none">
        {/* Grid Pattern - Left Side */}
        <div className="hidden xl:block absolute left-0 top-0 bottom-0 w-32" style={gridPatternStyle} />
        {/* Grid Pattern - Right Side */}
        <div className="hidden xl:block absolute right-0 top-0 bottom-0 w-32" style={gridPatternStyle} />

        <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-20 lg:py-24">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl text-center">

              {/* Headline skeleton */}
              <div className="space-y-4 mb-8">
                <div className="h-10 sm:h-14 lg:h-16 w-full max-w-3xl bg-gray-200/60 rounded-xl mx-auto animate-pulse" />
                <div className="h-10 sm:h-14 lg:h-16 w-3/4 max-w-2xl bg-gray-200/50 rounded-xl mx-auto animate-pulse" />
              </div>

              {/* Subtitle skeleton */}
              <div className="space-y-3 mb-12 max-w-2xl mx-auto">
                <div className="h-5 w-full bg-gray-100/70 rounded-lg animate-pulse" />
                <div className="h-5 w-5/6 bg-gray-100/60 rounded-lg mx-auto animate-pulse" />
                <div className="h-5 w-2/3 bg-gray-100/50 rounded-lg mx-auto animate-pulse" />
              </div>

              {/* CTA buttons skeleton */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <div className="h-14 w-56 bg-tufts-blue/20 rounded-full animate-pulse" />
                <div className="h-14 w-56 bg-gray-800/15 rounded-full animate-pulse" />
                <div className="h-14 w-56 bg-white/80 rounded-full border border-gray-200 animate-pulse" />
              </div>

              {/* Trust indicators skeleton */}
              <div className="flex flex-wrap items-center gap-6 sm:gap-10 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-200/60 rounded animate-pulse" />
                  <div className="h-4 w-28 bg-gray-100/70 rounded animate-pulse" />
                </div>
                <div className="hidden sm:block w-px h-4 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-200/60 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-gray-100/70 rounded animate-pulse" />
                </div>
                <div className="hidden sm:block w-px h-4 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-200/60 rounded animate-pulse" />
                  <div className="h-4 w-28 bg-gray-100/70 rounded animate-pulse" />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const pathname = usePathname();
  const { locale, t, translations, isLoading: i18nLoading } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [titleReady, setTitleReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Detect mobile devices - disable animation on smaller screens
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    // No need to listen for resize - initial check is enough for animation decision
  }, []);

  const detectedLanguage = useMemo(() => {
    try {
      if (i18nLoading) {
        if (typeof window !== 'undefined') {
          const savedLanguage = localStorage.getItem('Simnetiq-language');
          if (savedLanguage) return savedLanguage;
        }
        return detectLanguageFromPath(pathname) || 'en';
      }
      return locale || 'en';
    } catch {
      return 'en';
    }
  }, [locale, pathname, i18nLoading]);

  const direction = mounted ? getLanguageDirection(detectedLanguage) : 'ltr';

  // Apply IBM Plex Sans Italic for "anywhere" only in EN and DE
  const useIbmPlexSansItalic = detectedLanguage === 'en' || detectedLanguage === 'de';
  const highlightClassName = useIbmPlexSansItalic
    ? 'inline italic text-tufts-blue font-ibm-plex-sans'
    : 'inline italic text-tufts-blue';

  // Check if translations are loaded
  const hasTranslations = translations && Object.keys(translations).length > 0 && translations.hero;

  // Trust indicators data - using inline SVG icons
  const trustIndicators = [
    { Icon: GlobeIcon, label: t('hero.countries', '200+ Countries'), key: 'countries' },
    { Icon: ZapIcon, label: t('hero.instantActivation', 'Instant Activation'), key: 'activation' },
    { Icon: ShieldIcon, label: t('hero.securePayment', 'Secure Payment'), key: 'secure' },
  ];

  // Get translated text - headline split into parts for styling
  const headlinePart1 = t('hero.headlinePart1', 'The easiest way to get mobile data');
  const headlineHighlight = t('hero.headlineHighlight', 'anywhere');
  const headlinePart2 = t('hero.headlinePart2', 'in the world');
  const subtitleText = t('hero.subtitle', 'Activate your eSIM in minutes and stay connected in 200+ destinations worldwide.');

  // Show skeleton until translations are loaded
  if (!hasTranslations) {
    return <HeroSkeleton direction={direction} detectedLanguage={detectedLanguage} />;
  }

  return (
    <div className="hero-section relative min-h-screen flex flex-col bg-white" dir={direction} lang={detectedLanguage}>
      {/* Antigravity Background Animation - interactive with mouse */}
      <div className="absolute inset-0 opacity-20" aria-hidden="true">
        <Antigravity
          color="#4975D4"
          autoAnimate={true}
          count={isMobile ? 150 : 250}
          magnetRadius={isMobile ? 6 : 8}
          ringRadius={isMobile ? 7 : 9}
          waveSpeed={0.3}
          waveAmplitude={1.2}
          particleSize={isMobile ? 0.8 : 1.2}
          lerpSpeed={0.04}
          particleVariance={1}
        />
      </div>

      <div className="relative flex-1 flex flex-col pointer-events-none">
        {/* Grid Pattern - Left Side */}
        <div className="hidden xl:block absolute left-0 top-0 bottom-0 w-32" style={gridPatternStyle} />

        {/* Grid Pattern - Right Side */}
        <div className="hidden xl:block absolute right-0 top-0 bottom-0 w-32" style={gridPatternStyle} />

        {/* Main Content - pointer-events-none to allow mouse to reach canvas */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-20 lg:py-24">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl text-center">

              {/* Headline with highlighted word */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-8xl font-bold tracking-tight text-eerie-black mb-6 lg:mb-8 leading-[1.1]">
                {isMobile ? (
                  // Mobile: No animation, instant render
                  <>
                    <span className="inline">{headlinePart1}</span>{' '}
                    <span className={highlightClassName}>{headlineHighlight}</span>{' '}
                    <span className="inline">{headlinePart2}</span>
                  </>
                ) : (
                  // Desktop: Animated with SplitText
                  <>
                    <SplitText
                      text={headlinePart1}
                      tag="span"
                      className="inline"
                      splitType="words"
                      delay={80}
                      duration={0.8}
                      ease="power3.out"
                      from={{ opacity: 0, y: 50 }}
                      to={{ opacity: 1, y: 0 }}
                      threshold={0.1}
                      rootMargin="0px"
                      onReady={() => setTitleReady(true)}
                    />{' '}
                    <SplitText
                      text={headlineHighlight}
                      tag="span"
                      className={highlightClassName}
                      splitType="chars"
                      delay={40}
                      duration={0.6}
                      ease="power3.out"
                      from={{ opacity: 0, y: 30, rotateX: -90 }}
                      to={{ opacity: 1, y: 0, rotateX: 0 }}
                      threshold={0.1}
                      rootMargin="0px"
                    />{' '}
                    <SplitText
                      text={headlinePart2}
                      tag="span"
                      className="inline"
                      splitType="words"
                      delay={80}
                      duration={0.8}
                      ease="power3.out"
                      from={{ opacity: 0, y: 50 }}
                      to={{ opacity: 1, y: 0 }}
                      threshold={0.1}
                      rootMargin="0px"
                    />
                  </>
                )}
              </h1>

              {/* Subtitle */}
              <p
                className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-600 mb-10 lg:mb-12 max-w-2xl lg:max-w-3xl mx-auto leading-relaxed"
                style={{ visibility: (isMobile || titleReady) ? 'visible' : 'hidden' }}
              >
                {subtitleText}
              </p>

              {/* CTA Buttons - Explore Store is now PRIMARY */}
              <div
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 lg:mb-12 pointer-events-auto"
                style={{ visibility: (isMobile || titleReady) ? 'visible' : 'hidden' }}
              >
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

              {/* Trust Indicators */}
              <div
                className="flex flex-wrap items-center gap-6 sm:gap-10 text-sm text-gray-500 justify-center"
                style={{ visibility: (isMobile || titleReady) ? 'visible' : 'hidden' }}
              >
                {trustIndicators.map(({ Icon, label, key }, index) => (
                  <React.Fragment key={key}>
                    <div className="flex items-center gap-2 text-eerie-black">
                      <Icon className="w-5 h-5 text-eerie-black" />
                      <span className="text-eerie-black">{label}</span>
                    </div>
                    {/* Vertical separator between items */}
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
