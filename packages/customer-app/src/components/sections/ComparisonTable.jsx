'use client';

import { useI18n } from '@esim/shared/contexts/I18nContext';
import Reveal from '../ui/Reveal';

// Inline SVG icons — no lucide-react imports
const XIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export default function ComparisonTable() {
  const { t } = useI18n();

  const rows = [
    {
      feature: t('comparison.rowActivation', 'Activation'),
      physical: t('comparison.physicalActivation', 'Wait for delivery (1–5 days)'),
      esim: t('comparison.esimActivation', 'Instant — scan QR code'),
    },
    {
      feature: t('comparison.rowAvailability', 'Availability'),
      physical: t('comparison.physicalAvailability', 'Buy at airport kiosk or store'),
      esim: t('comparison.esimAvailability', 'Purchase online, anywhere'),
    },
    {
      feature: t('comparison.rowSwitching', 'Switching plans'),
      physical: t('comparison.physicalSwitching', 'Swap card, lose your number'),
      esim: t('comparison.esimSwitching', 'Switch plans digitally, no hassle'),
    },
    {
      feature: t('comparison.rowKeepNumber', 'Keep your number'),
      physical: t('comparison.physicalKeepNumber', 'No — requires a new SIM'),
      esim: t('comparison.esimKeepNumber', 'Yes — eSIM runs alongside your SIM'),
    },
    {
      feature: t('comparison.rowMultiCountry', 'Multiple countries'),
      physical: t('comparison.physicalMultiCountry', 'Buy a new SIM each country'),
      esim: t('comparison.esimMultiCountry', 'One plan covers many regions'),
    },
    {
      feature: t('comparison.rowCost', 'Cost'),
      physical: t('comparison.physicalCost', 'Carrier roaming — up to $15/day'),
      esim: t('comparison.esimCost', 'From $1/day — transparent pricing'),
    },
  ];

  return (
    <section
      className="bg-bg-primary"
      aria-labelledby="comparison-heading"
    >
      <div className="max-w-7xl mx-auto px-4 py-16 lg:py-24">

        {/* Section header */}
        <div className="mb-12 text-center">
          <Reveal>
            <p className="text-xs font-semibold tracking-widest uppercase text-text-muted mb-3">
              {t('comparison.label', 'The smart choice')}
            </p>
            <h2
              id="comparison-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary"
            >
              {t('comparison.title', 'eSIM vs. Physical SIM')}
            </h2>
            <p className="text-text-muted mt-3 max-w-lg mx-auto text-base">
              {t('comparison.subtitle', 'See exactly why millions of travellers are switching to eSIM.')}
            </p>
          </Reveal>
        </div>

        {/* Comparison table */}
        <Reveal delay={100}>
          <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
            {/* Column headers */}
            <div className="grid grid-cols-3 border-b border-white/10">
              {/* Feature column header */}
              <div className="px-4 py-4 lg:px-6 lg:py-5">
                <span className="text-xs font-semibold tracking-widest uppercase text-text-muted">
                  {t('comparison.featureHeader', 'Feature')}
                </span>
              </div>

              {/* Physical SIM header */}
              <div className="px-4 py-4 lg:px-6 lg:py-5 border-s border-white/10">
                <span className="text-xs font-semibold tracking-widest uppercase text-text-muted">
                  {t('comparison.physicalHeader', 'Physical SIM')}
                </span>
              </div>

              {/* eSIM header — tufts-blue accent column */}
              <div
                className="px-4 py-4 lg:px-6 lg:py-5 border-s border-tufts-blue/30"
                style={{ background: 'rgba(73,117,212,0.04)' }}
              >
                <span className="text-xs font-semibold tracking-widest uppercase text-tufts-blue">
                  {t('comparison.esimHeader', 'Simnetiq eSIM')}
                </span>
              </div>
            </div>

            {/* Rows */}
            {rows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-3 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors duration-150"
              >
                {/* Feature label */}
                <div className="px-4 py-4 lg:px-6 lg:py-5 flex items-start">
                  <span className="text-sm font-medium text-text-muted">
                    {row.feature}
                  </span>
                </div>

                {/* Physical SIM cell */}
                <div className="px-4 py-4 lg:px-6 lg:py-5 border-s border-white/10 flex items-start gap-2 rtl-native-flex">
                  <XIcon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-muted leading-relaxed">
                    {row.physical}
                  </span>
                </div>

                {/* eSIM cell — highlighted column */}
                <div
                  className="px-4 py-4 lg:px-6 lg:py-5 border-s border-tufts-blue/30 flex items-start gap-2 rtl-native-flex"
                  style={{ background: 'rgba(73,117,212,0.04)' }}
                >
                  <CheckIcon className="w-4 h-4 text-accent-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-primary leading-relaxed">
                    {row.esim}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

      </div>
    </section>
  );
}
