'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import Reveal from '../ui/Reveal';

// Carrier roaming estimates based on general market research. Verify specific rates before naming carriers.

const BARS = [
  { labelKey: 'roaming.carrierTurkey', labelDefault: 'Carrier roaming (Turkey)', price: '$70/week', widthPct: 100, colorClass: 'bg-red-500/70' },
  { labelKey: 'roaming.carrierEurope', labelDefault: 'Carrier roaming (Europe)', price: '$56/week', widthPct: 80, colorClass: 'bg-orange-500/70' },
  { labelKey: 'roaming.carrierAsia', labelDefault: 'Carrier roaming (Asia)', price: '$84/week', widthPct: 120, colorClass: 'bg-red-500/70' },
  { labelKey: 'roaming.simnetiq', labelDefault: 'Simnetiq eSIM', price: '~$5/week', widthPct: 7, colorClass: 'bg-accent-success' },
];

// Normalize bars so the highest bar = 100% of the visual container
const MAX_PCT = Math.max(...BARS.map((b) => b.widthPct));
const normalizedBars = BARS.map((b) => ({ ...b, visualPct: (b.widthPct / MAX_PCT) * 100 }));

function BarRow({ bar, isVisible, index }) {
  const { t } = useI18n();
  const isSimnetiq = bar.labelKey === 'roaming.simnetiq';

  return (
    <Reveal delay={index * 100}>
      <div className="mb-5 last:mb-0">
        <div className="flex justify-between items-center mb-1.5 rtl-native-flex">
          <span className={`text-sm font-medium ${isSimnetiq ? 'text-accent-success' : 'text-text-muted'}`}>
            {t(bar.labelKey, bar.labelDefault)}
          </span>
          <span className={`text-sm font-bold tabular-nums ${isSimnetiq ? 'text-accent-success' : 'text-red-400'}`}>
            {bar.price}
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${bar.colorClass}`}
            style={{
              width: isVisible ? `${bar.visualPct}%` : '0%',
              transitionDelay: `${index * 120}ms`,
            }}
            role="meter"
            aria-label={`${t(bar.labelKey, bar.labelDefault)}: ${bar.price}`}
            aria-valuenow={bar.widthPct}
            aria-valuemin={0}
            aria-valuemax={MAX_PCT}
          />
        </div>
      </div>
    </Reveal>
  );
}

export default function RoamingComparison() {
  const { t } = useI18n();
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const statBoxes = [
    {
      value: t('roaming.saveUpToValue', '93%'),
      label: t('roaming.saveUpTo', 'Average savings vs. carrier roaming'),
      delay: 0,
    },
    {
      value: t('roaming.fromPriceValue', '$1'),
      label: t('roaming.fromPrice', 'Plans starting from per day'),
      delay: 100,
    },
    {
      value: t('roaming.noBillsValue', '$0'),
      label: t('roaming.noBills', 'Surprise bills or hidden fees'),
      delay: 200,
    },
    {
      value: t('roaming.cancelAnytimeValue', '∞'),
      label: t('roaming.cancelAnytime', 'No contracts — use as needed'),
      delay: 300,
    },
  ];

  return (
    <section
      className="bg-bg-primary"
      aria-labelledby="roaming-heading"
      ref={sectionRef}
    >
      <div className="max-w-7xl mx-auto px-4 py-16 lg:py-24">

        {/* Section header */}
        <div className="mb-12 text-start">
          <Reveal>
            <p className="text-xs font-semibold tracking-widest uppercase text-text-muted mb-3">
              {t('roaming.label', 'The cost reality')}
            </p>
            <h2
              id="roaming-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary max-w-xl"
            >
              {t('roaming.title', 'Stop overpaying for roaming')}
            </h2>
            <p className="text-text-muted mt-3 max-w-lg text-base">
              {t('roaming.subtitle', 'Carrier roaming fees are shocking. Simnetiq gives you real data at traveller-friendly prices.')}
            </p>
          </Reveal>
        </div>

        {/* Bar chart */}
        <div className="glass-card mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-text-muted mb-6">
            {t('roaming.chartTitle', 'Weekly data cost comparison')}
          </p>
          {normalizedBars.map((bar, index) => (
            <BarRow key={bar.labelKey} bar={bar} isVisible={isVisible} index={index} />
          ))}
          <p className="text-xs text-text-muted mt-4 opacity-60">
            {t('roaming.disclaimer', '* Carrier estimates based on general market research. Actual rates vary by provider.')}
          </p>
        </div>

        {/* Stat boxes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="list">
          {statBoxes.map(({ value, label, delay }) => (
            <Reveal key={label} delay={delay}>
              <div role="listitem" className="glass-card text-center">
                <p className="text-3xl lg:text-4xl font-bold text-tufts-blue mb-1">
                  {value}
                </p>
                <p className="text-sm text-text-muted leading-snug">
                  {label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
}
