'use client';

import React, { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { PlatformDownloadCTA, ExploreStoreCTA } from '../cta';

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

// 16x20 dot grid with routes — pure SVG, zero TBT
const COLS = 16;
const ROWS = 20;
const PADDING = 8; // % padding from edges
const dotX = (col) => PADDING + (col / (COLS - 1)) * (100 - PADDING * 2);
const dotY = (row) => PADDING + (row / (ROWS - 1)) * (100 - PADDING * 2);

// Pre-computed routes connecting dots (col, row pairs) — travel paths
const ROUTES = [
  // Long diagonal sweep top-left to center
  [[1, 1], [2, 2], [3, 2], [4, 3], [5, 4], [6, 4]],
  // Gentle mid-left arc
  [[2, 8], [3, 8], [4, 9], [5, 9], [6, 10]],
  // Right descending staircase
  [[11, 2], [12, 3], [12, 4], [13, 5], [13, 6], [14, 7]],
  // Bottom-left L-shape
  [[1, 14], [2, 14], [3, 15], [4, 16], [5, 16], [6, 16]],
  // Short top-right connector
  [[12, 1], [13, 1], [14, 2]],
  // Bottom-right ascending
  [[10, 18], [11, 17], [12, 17], [13, 16], [14, 15]],
  // Left vertical drop
  [[1, 5], [1, 6], [2, 7], [2, 8], [1, 9]],
  // Center triangle
  [[7, 5], [8, 6], [9, 5], [7, 5]],
  // Wide bottom sweep
  [[3, 11], [4, 11], [5, 12], [6, 12], [6, 14], [7, 13], [8, 13], [9, 12], [8, 11]],
  // Small top-center
  [[6, 1], [7, 2], [8, 2], [9, 1]],
  // Right side short vertical
  [[14, 10], [14, 11], [13, 12], [13, 13]],
];

export default function HeroSection() {
  const pathname = usePathname();
  const { locale, t, isLoading: i18nLoading } = useI18n();

  // SSR-safe language: always use pathname-based detection to avoid
  // hydration mismatch from localStorage reads
  const ssrSafeLanguage = useMemo(() => detectLanguageFromPath(pathname) || 'en', [pathname]);

  // Always use pathname-based language for initial render to avoid hydration mismatch.
  // Once i18n finishes loading, switch to the context locale.
  const detectedLanguage = i18nLoading ? ssrSafeLanguage : (locale || ssrSafeLanguage);

  // Apply IBM Plex Sans Italic for "easiest way" only in EN and DE
  const useIbmPlexSansItalic = detectedLanguage === 'en' || detectedLanguage === 'de';
  const highlightClassName = useIbmPlexSansItalic
    ? 'inline italic text-tufts-blue font-ibm-plex-sans'
    : 'inline italic text-tufts-blue';

  // Trust indicators data
  const trustIndicators = [
    { Icon: GlobeIcon, label: t('hero.countries', '200+ Countries'), key: 'countries' },
    { Icon: ZapIcon, label: t('hero.instantActivation', 'Instant Setup'), key: 'activation' },
    { Icon: ShieldIcon, label: t('hero.securePayment', 'Secure Checkout'), key: 'secure' },
  ];

  const headlinePart1 = t('hero.headlinePart1', 'The ');
  const headlineHighlight = t('hero.headlineHighlight', 'simplest way');
  const headlinePart2 = t('hero.headlinePart2', 'to stay online abroad');
  const subtitleText = t('hero.subtitle', 'Get eSIM data plans for 200+ countries. Activate in minutes — no SIM card, no roaming fees.');

  return (
    <div className="hero-section relative min-h-screen flex flex-col bg-white" lang={detectedLanguage}>
      {/* SVG dot grid with routes — zero JS, zero TBT impact */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden="true" style={{ maskImage: 'radial-gradient(ellipse 60% 55% at 50% 50%, black 40%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 50%, black 40%, transparent 100%)' }}>
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          {/* Route lines */}
          {ROUTES.map((route, ri) => (
            <polyline
              key={`r${ri}`}
              points={route.map(([c, r]) => `${dotX(c)},${dotY(r)}`).join(' ')}
              fill="none"
              stroke="#1F1F1F"
              strokeWidth="0.05"
              opacity="0.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="hero-route"
              style={{ animationDelay: `${ri * -3}s` }}
            />
          ))}
          {/* Grid dots */}
          {Array.from({ length: COLS * ROWS }, (_, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            return (
              <circle
                key={i}
                cx={dotX(col)}
                cy={dotY(row)}
                r="0.1"
                fill="#1F1F1F"
                opacity="0.18"
              />
            );
          })}
          {/* Highlighted dots on routes */}
          {ROUTES.flat().map(([c, r], i) => (
            <circle
              key={`rd${i}`}
              cx={dotX(c)}
              cy={dotY(r)}
              r="0.1"
              fill="#1F1F1F"
              opacity="0.1"
            />
          ))}
        </svg>
      </div>

      <div className="relative flex-1 flex flex-col">
        <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-20 lg:py-24">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl text-center">

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-8xl font-bold tracking-tight text-eerie-black mb-6 lg:mb-8 leading-[1.1]">
                <span className="inline">{headlinePart1}</span>{' '}
                <span className={highlightClassName}>{headlineHighlight}</span>{' '}
                <span className="inline">{headlinePart2}</span>
              </h1>

              <p className="text-sm sm:text-lg lg:text-xl xl:text-2xl text-gray-600 mb-10 lg:mb-12 max-w-2xl lg:max-w-3xl mx-auto leading-relaxed">
                {subtitleText}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 lg:mb-12 w-full sm:w-auto rtl-native-flex">
                <ExploreStoreCTA
                  variant="dark"
                  size="md"
                  source="hero_primary_cta"
                  className="w-full sm:w-auto"
                />
                <PlatformDownloadCTA
                  variant="secondary"
                  size="md"
                  source="hero_secondary_cta"
                  className="w-full sm:w-auto"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-xs sm:text-sm text-gray-500 justify-center min-h-[24px] sm:min-h-[28px] rtl-native-flex">
                {trustIndicators.map(({ Icon, label, key }, index) => (
                  <React.Fragment key={key}>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 sm:text-eerie-black rtl-native-flex">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 sm:text-eerie-black" />
                      <span>{label}</span>
                    </div>
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
