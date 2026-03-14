'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { ExploreStoreCTA, PlatformDownloadCTA } from '../cta';

// Inline SVG icons — no lucide-react imports
const GlobeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

const ZapIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  </svg>
);

const StarIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
  </svg>
);

const ShieldCheckIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const TagIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
  </svg>
);

/**
 * NewHeroSection — dark theme full-viewport hero.
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

  const headlinePart1 = t('hero.darkHeadlinePart1', 'Stay connected');
  const headlineHighlight = t('hero.darkHeadlineHighlight', 'anywhere');
  const headlinePart2 = t('hero.darkHeadlinePart2', 'in the world');
  const subtitleText = t('hero.darkSubtitle', 'Activate your eSIM in minutes. No physical SIM needed — instant data in 200+ countries.');

  const trustBadges = [
    { Icon: GlobeIcon, label: t('hero.countries', '200+ Countries') },
    { Icon: ZapIcon, label: t('hero.instantActivation', 'Instant Activation') },
    { Icon: StarIcon, label: t('hero.fiveStarRated', '5-Star Rated') },
    { Icon: ShieldCheckIcon, label: t('hero.sevenDayRefund', '7-Day Refund') },
  ];

  return (
    <section
      className="relative min-h-screen flex flex-col bg-bg-primary overflow-hidden"
      aria-label="Hero"
      lang={detectedLanguage}
    >
      {/* CSS-only animated gradient mesh background — zero TBT */}
      <div
        className="absolute inset-0 pointer-events-none animate-gradient-mesh"
        aria-hidden="true"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 10%, rgba(73,117,212,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 80%, rgba(73,117,212,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 50% 50%, rgba(73,117,212,0.04) 0%, transparent 70%)
          `,
        }}
      />

      {/* Promo banner — shown only when promo prop is provided */}
      {promo && (
        <div
          className="relative z-10 w-full animate-promo-pulse"
          role="banner"
          aria-label="Promotional offer"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-highlight/10 border-b border-accent-highlight/20 rtl-native-flex">
            <TagIcon className="w-4 h-4 text-accent-highlight flex-shrink-0" />
            <p className="text-sm font-medium text-accent-highlight text-center">
              {t('hero.promoPrefix', 'Limited offer:')}
              {' '}
              <span className="font-bold">{promo.code}</span>
              {' '}
              —
              {' '}
              {promo.message || `${promo.discount} off`}
              {' '}
              {t('hero.promoSuffix', 'on your first eSIM')}
            </p>
          </div>
        </div>
      )}

      {/* Main hero content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-20 lg:py-28">
        <div className="w-full max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">

            {/* h1 — LCP element. Renders immediately; no state dependencies. */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-text-primary mb-6 leading-[1.1]">
              <span>{headlinePart1}</span>
              {' '}
              <span className="text-tufts-blue">{headlineHighlight}</span>
              {' '}
              <span>{headlinePart2}</span>
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-text-muted mb-10 max-w-2xl mx-auto leading-relaxed">
              {subtitleText}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 rtl-native-flex">
              <ExploreStoreCTA
                variant="darkPrimary"
                size="md"
                source="new_hero_primary_cta"
                className="w-full sm:w-auto"
              />
              <PlatformDownloadCTA
                variant="outline"
                size="md"
                source="new_hero_secondary_cta"
                className="w-full sm:w-auto"
              />
            </div>

            {/* Trust badge pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 rtl-native-flex" role="list" aria-label="Trust indicators">
              {trustBadges.map(({ Icon, label }) => (
                <div
                  key={label}
                  role="listitem"
                  className="flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm font-medium text-text-muted rtl-native-flex"
                  style={{ padding: '8px 16px' }}
                >
                  <Icon className="w-4 h-4 text-tufts-blue flex-shrink-0" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
