'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { ExploreStoreCTA, PlatformDownloadCTA } from '../cta';

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
 * NewHeroSection — dark theme full-viewport hero, 2-column Doppler-inspired layout.
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

  const headlinePart1 = t('hero.darkHeadlinePart1', 'Stay connected');
  const headlineHighlight = t('hero.darkHeadlineHighlight', 'anywhere');
  const headlinePart2 = t('hero.darkHeadlinePart2', 'in the world');
  const subtitleText = t('hero.darkSubtitle', 'Activate your eSIM in minutes. No physical SIM needed — instant data in 200+ countries.');

  const trustBadges = [
    t('hero.countries', '200+ Countries'),
    t('hero.instantActivation', 'Instant Activation'),
    t('hero.fiveStarRated', '5-Star Rated'),
    t('hero.sevenDayRefund', '7-Day Refund'),
  ];

  return (
    <section
      className="relative min-h-screen flex flex-col bg-bg-primary overflow-hidden"
      aria-label="Hero"
      lang={detectedLanguage}
    >
      {/* Blurred orb backgrounds — static, zero TBT */}
      <div className="absolute -top-10 -start-20 w-[28rem] h-[28rem] bg-tufts-blue/20 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute -bottom-40 -end-20 w-[32rem] h-[32rem] bg-tufts-blue/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

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
      <div className="relative z-10 flex-1 flex flex-col justify-center px-4 py-20 lg:py-28">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left column: content */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-start">

              {/* Tagline badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-tufts-blue/10 text-tufts-blue border border-tufts-blue/20 mb-5 rtl-native-flex">
                <GlobeSmallIcon className="w-4 h-4 flex-shrink-0" />
                <span>{t('hero.tagline', 'Global eSIM Platform')}</span>
              </div>

              {/* Promo pill below tagline (inline variant, if not already shown as top banner) */}
              {promo && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-accent-highlight/10 text-accent-highlight border border-accent-highlight/20 mb-5 rtl-native-flex">
                  <TagIcon className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <span className="font-bold">{promo.code}</span>
                    {' — '}
                    {promo.message || `${promo.discount} off`}
                  </span>
                </div>
              )}

              {/* h1 — LCP element. Renders immediately; no state dependencies. */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-text-primary leading-tight mb-6">
                <span className="block">{headlinePart1}</span>
                <span className={`block text-tufts-blue${!isRtl ? ' italic' : ''}`}>{headlineHighlight}</span>
                <span className="block bg-gradient-to-t from-text-muted to-text-primary bg-clip-text text-transparent">{headlinePart2}</span>
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-text-muted mb-8 max-w-md sm:max-w-xl leading-relaxed">
                {subtitleText}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10 w-full rtl-native-flex">
                <ExploreStoreCTA
                  variant="themed"
                  size="md"
                  source="new_hero_primary_cta"
                  className="w-full sm:w-auto"
                />
                <PlatformDownloadCTA
                  variant="themed"
                  size="md"
                  source="new_hero_secondary_cta"
                  className="w-full sm:w-auto"
                />
              </div>

              {/* Trust badges — Doppler-style plain checkmark list */}
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

            {/* Right column: decorative eSIM visual card */}
            <div className="hidden lg:block relative" aria-hidden="true">
              <div className="relative w-full aspect-square max-w-lg mx-auto rounded-3xl overflow-hidden border border-white/[0.06] bg-gradient-to-br from-tufts-blue/5 via-bg-secondary to-tufts-blue/10">
                {/* Subtle grid pattern overlay */}
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }}
                />

                {/* Large watermark */}
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8rem] font-bold text-white/[0.03] select-none pointer-events-none tracking-widest">
                  eSIM
                </span>

                {/* Decorative circles */}
                <div className="absolute top-1/4 right-1/4 w-32 h-32 rounded-full border border-tufts-blue/10" />
                <div className="absolute bottom-1/3 left-1/3 w-48 h-48 rounded-full border border-tufts-blue/5" />

                {/* Floating stat pills */}
                <div className="absolute top-8 left-8 glass-card px-4 py-2 text-sm font-medium text-text-primary">
                  <span className="text-tufts-blue font-bold">200+</span> Countries
                </div>
                <div className="absolute top-1/2 right-6 -translate-y-1/2 glass-card px-4 py-2 text-sm font-medium text-text-primary">
                  Instant <span className="text-accent-success">Activation</span>
                </div>
                <div className="absolute bottom-8 left-12 glass-card px-4 py-2 text-sm font-medium text-text-primary">
                  From <span className="text-accent-highlight font-bold">$3</span>/GB
                </div>
              </div>

              {/* Subtle glow behind the card */}
              <div className="absolute inset-0 -z-10 rounded-3xl bg-tufts-blue/10 blur-2xl scale-90" />
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
