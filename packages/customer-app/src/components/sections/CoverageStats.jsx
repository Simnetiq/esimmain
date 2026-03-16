'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import FlagImage from '@esim/shared/components/FlagImage';
import AnimatedCounter from '../ui/AnimatedCounter';
import Reveal from '../ui/Reveal';
import { ExploreStoreCTA } from '../cta';

const REGIONS = [
  {
    key: 'europe',
    slug: 'europe',
    nameKey: 'coverage.europe',
    nameFallback: 'Europe',
    flags: [
      { code: 'de', emoji: '🇩🇪', name: 'Germany' },
      { code: 'fr', emoji: '🇫🇷', name: 'France' },
      { code: 'it', emoji: '🇮🇹', name: 'Italy' },
      { code: 'es', emoji: '🇪🇸', name: 'Spain' },
      { code: 'gb', emoji: '🇬🇧', name: 'UK' },
    ],
  },
  {
    key: 'asia',
    slug: 'asia',
    nameKey: 'coverage.asia',
    nameFallback: 'Asia',
    flags: [
      { code: 'jp', emoji: '🇯🇵', name: 'Japan' },
      { code: 'kr', emoji: '🇰🇷', name: 'S. Korea' },
      { code: 'sg', emoji: '🇸🇬', name: 'Singapore' },
      { code: 'th', emoji: '🇹🇭', name: 'Thailand' },
      { code: 'in', emoji: '🇮🇳', name: 'India' },
    ],
  },
  {
    key: 'americas',
    slug: 'americas',
    nameKey: 'coverage.americas',
    nameFallback: 'Americas',
    flags: [
      { code: 'us', emoji: '🇺🇸', name: 'USA' },
      { code: 'ca', emoji: '🇨🇦', name: 'Canada' },
      { code: 'br', emoji: '🇧🇷', name: 'Brazil' },
      { code: 'mx', emoji: '🇲🇽', name: 'Mexico' },
      { code: 'ar', emoji: '🇦🇷', name: 'Argentina' },
    ],
  },
  {
    key: 'africa',
    slug: 'africa',
    nameKey: 'coverage.africa',
    nameFallback: 'Africa',
    flags: [
      { code: 'za', emoji: '🇿🇦', name: 'S. Africa' },
      { code: 'ke', emoji: '🇰🇪', name: 'Kenya' },
      { code: 'ng', emoji: '🇳🇬', name: 'Nigeria' },
      { code: 'eg', emoji: '🇪🇬', name: 'Egypt' },
      { code: 'ma', emoji: '🇲🇦', name: 'Morocco' },
    ],
  },
  {
    key: 'oceania',
    slug: 'oceania',
    nameKey: 'coverage.oceania',
    nameFallback: 'Oceania',
    flags: [
      { code: 'au', emoji: '🇦🇺', name: 'Australia' },
      { code: 'nz', emoji: '🇳🇿', name: 'New Zealand' },
      { code: 'fj', emoji: '🇫🇯', name: 'Fiji' },
      { code: 'pg', emoji: '🇵🇬', name: 'Papua NG' },
      { code: 'ws', emoji: '🇼🇸', name: 'Samoa' },
    ],
  },
  {
    key: 'middle-east',
    slug: 'middle-east',
    nameKey: 'coverage.middleEast',
    nameFallback: 'Middle East',
    flags: [
      { code: 'ae', emoji: '🇦🇪', name: 'UAE' },
      { code: 'sa', emoji: '🇸🇦', name: 'Saudi Arabia' },
      { code: 'il', emoji: '🇮🇱', name: 'Israel' },
      { code: 'jo', emoji: '🇯🇴', name: 'Jordan' },
      { code: 'qa', emoji: '🇶🇦', name: 'Qatar' },
    ],
  },
];

export default function CoverageStats() {
  const { t, locale } = useI18n();
  const pathname = usePathname();

  const localizedPath = (path) =>
    locale && locale !== 'en' ? `/${locale}${path}` : path;

  const stats = [
    {
      value: 200,
      suffix: '+',
      label: t('coverage.countries', 'Countries'),
    },
    {
      value: 400,
      suffix: '+',
      label: t('coverage.dataPlans', 'Data Plans'),
    },
    {
      value: 18,
      suffix: '',
      label: t('coverage.languages', 'Languages'),
    },
    {
      value: 2,
      suffix: ' min',
      label: t('coverage.avgActivation', 'Avg Activation'),
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 py-16 lg:py-24">
      {/* Stats counters */}
      <Reveal className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {stats.map((stat, i) => (
          <div key={i} className="text-center">
            <p className="text-5xl font-bold text-text-primary">
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
            </p>
            <p className="mt-2 text-text-muted text-sm">{stat.label}</p>
          </div>
        ))}
      </Reveal>

      {/* Region cards */}
      <Reveal delay={100} className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {REGIONS.map((region) => (
          <Link
            key={region.key}
            href={localizedPath(`/esim-plans?region=${region.slug}`)}
            className="glass-card flex flex-col justify-between gap-3 hover:border-[var(--tufts-blue)] transition-colors duration-200"
          >
            <div>
              <div className="flex items-center justify-between rtl-native-flex">
                <p className="font-semibold text-text-primary text-start">
                  {t(region.nameKey, region.nameFallback)}
                </p>
                <span
                  className="flex-shrink-0 inline-flex items-center justify-center rounded-full w-6 h-6 rtl-native-flex"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--card-border)' }}
                >
                  <svg className="w-3 h-3 rtl:-scale-x-100" style={{ color: 'var(--text-primary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17 17 7"/><path d="M7 7h10v10"/>
                  </svg>
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-3 rtl-native-flex">
                {region.flags.map((flag, fi) => (
                  <div key={fi} className="flex-shrink-0">
                    <FlagImage code={flag.code} emoji={flag.emoji} className="w-6 h-6 rounded-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </Reveal>

      {/* CTA below region grid */}
      <Reveal delay={200} className="flex justify-center mt-10">
        <ExploreStoreCTA
          variant="themed"
          size="md"
          source="coverage_cta"
        />
      </Reveal>
    </section>
  );
}
