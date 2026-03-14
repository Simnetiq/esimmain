'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import AnimatedCounter from '../ui/AnimatedCounter';
import Reveal from '../ui/Reveal';

const REGIONS = [
  {
    key: 'europe',
    slug: 'europe',
    nameKey: 'coverage.regionEurope',
    nameFallback: 'Europe',
    flags: ['🇩🇪', '🇫🇷', '🇮🇹', '🇪🇸', '🇬🇧'],
  },
  {
    key: 'asia',
    slug: 'asia',
    nameKey: 'coverage.regionAsia',
    nameFallback: 'Asia',
    flags: ['🇯🇵', '🇰🇷', '🇸🇬', '🇹🇭', '🇮🇳'],
  },
  {
    key: 'americas',
    slug: 'americas',
    nameKey: 'coverage.regionAmericas',
    nameFallback: 'Americas',
    flags: ['🇺🇸', '🇨🇦', '🇧🇷', '🇲🇽', '🇦🇷'],
  },
  {
    key: 'africa',
    slug: 'africa',
    nameKey: 'coverage.regionAfrica',
    nameFallback: 'Africa',
    flags: ['🇿🇦', '🇰🇪', '🇳🇬', '🇪🇬', '🇲🇦'],
  },
  {
    key: 'oceania',
    slug: 'oceania',
    nameKey: 'coverage.regionOceania',
    nameFallback: 'Oceania',
    flags: ['🇦🇺', '🇳🇿', '🇫🇯', '🇵🇬', '🇼🇸'],
  },
  {
    key: 'middle-east',
    slug: 'middle-east',
    nameKey: 'coverage.regionMiddleEast',
    nameFallback: 'Middle East',
    flags: ['🇦🇪', '🇸🇦', '🇮🇱', '🇯🇴', '🇶🇦'],
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
      label: t('coverage.countries', '200+ Countries'),
    },
    {
      value: 400,
      suffix: '+',
      label: t('coverage.dataPlans', '400+ Data Plans'),
    },
    {
      value: 18,
      suffix: '',
      label: t('coverage.languages', 'Languages'),
    },
    {
      value: 2,
      suffix: ' min',
      label: t('coverage.avgActivation', 'Avg. Activation'),
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
            className="glass-card flex flex-col gap-3 hover:bg-white/10 transition-colors duration-200"
          >
            <p className="font-semibold text-text-primary text-start">
              {t(region.nameKey, region.nameFallback)}
            </p>
            <div className="flex gap-1 flex-wrap rtl-native-flex">
              {region.flags.map((flag, fi) => (
                <span key={fi} className="text-xl leading-none">
                  {flag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </Reveal>
    </section>
  );
}
