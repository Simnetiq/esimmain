'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import Reveal from '../ui/Reveal';

/**
 * Roaming cost comparison data — REAL prices (March 2026).
 *
 * Scenario: 5-day trip, 10 GB data needed. All prices in USD.
 *
 * Conversions: £1 = $1.27, €1 = $1.08
 *
 * Sources:
 * - AT&T / Verizon: $12/day International Day Pass. 5 GB/day HS then 3G.
 *     5 days = $60. 10 GB covered (5 GB/day × 5 = 25 GB cap).
 * - Rogers CA: $10/day Roam Like Home. Uses plan data.
 *     5 days = $50. 10 GB covered.
 * - Three UK: Go Roam (EU/US) uses UK allowance (12 GB pool).
 *     EU: Free. US: £6/day × 5 = £30 ≈ $38. World: varies by dest.
 *     Turkey: NOT covered by Three UK roaming.
 * - Telekom DE: Zone 2 (US/TR/ES): €14.95 ≈ $16 for 5 GB only.
 *     Zone 3 (TH/JP/BR/EG): €29.95 ≈ $32 for 5 GB only. 10 GB NOT covered.
 * - Simnetiq eSIM: cheapest 10 GB plan from Supabase (real prices).
 */

const DESTINATIONS = [
  {
    id: 'turkey',
    labelKey: 'roaming.dest.turkey',
    labelDefault: 'Turkey',
    flag: 'tr',
    carriers: [
      { id: 'att', labelKey: 'roaming.carrier.att', labelDefault: 'AT&T / Verizon', price: 60, data: '10 GB', noteKey: 'roaming.note.dayPass5', noteDefault: '$12/day × 5', flagCode: 'us' },
      { id: 'rogers', labelKey: 'roaming.carrier.rogersCA', labelDefault: 'Rogers (CA)', price: 50, data: '10 GB', noteKey: 'roaming.note.roamLikeHome5', noteDefault: '$10/day × 5', flagCode: 'ca' },
      { id: 'telekom', labelKey: 'roaming.carrier.telekomDE', labelDefault: 'Telekom (DE)', price: 16, data: '5 GB', noteKey: 'roaming.note.travelMobil5gb', noteDefault: '€14.95 · 5 GB cap', flagCode: 'de' },
      { id: 'simnetiq', labelKey: 'roaming.carrier.simnetiq', labelDefault: 'Simnetiq eSIM', price: 15, data: '10 GB', noteKey: 'roaming.note.esim10gb', noteDefault: '10 GB plan' },
    ],
  },
  {
    id: 'thailand',
    labelKey: 'roaming.dest.thailand',
    labelDefault: 'Thailand',
    flag: 'th',
    carriers: [
      { id: 'att', labelKey: 'roaming.carrier.att', labelDefault: 'AT&T / Verizon', price: 60, data: '10 GB', noteKey: 'roaming.note.dayPass5', noteDefault: '$12/day × 5', flagCode: 'us' },
      { id: 'rogers', labelKey: 'roaming.carrier.rogersCA', labelDefault: 'Rogers (CA)', price: 50, data: '10 GB', noteKey: 'roaming.note.roamLikeHome5', noteDefault: '$10/day × 5', flagCode: 'ca' },
      { id: 'three', labelKey: 'roaming.carrier.threeUK', labelDefault: 'Three (UK)', price: 38, data: '12 GB', noteKey: 'roaming.note.goRoamWorld5', noteDefault: '£30 · 12 GB pool', flagCode: 'gb' },
      { id: 'telekom', labelKey: 'roaming.carrier.telekomDE', labelDefault: 'Telekom (DE)', price: 32, data: '5 GB', noteKey: 'roaming.note.travelMobilWorld5gb', noteDefault: '€29.95 · 5 GB cap', flagCode: 'de' },
      { id: 'simnetiq', labelKey: 'roaming.carrier.simnetiq', labelDefault: 'Simnetiq eSIM', price: 11, data: '10 GB', noteKey: 'roaming.note.esim10gb', noteDefault: '10 GB plan' },
    ],
  },
  {
    id: 'japan',
    labelKey: 'roaming.dest.japan',
    labelDefault: 'Japan',
    flag: 'jp',
    carriers: [
      { id: 'att', labelKey: 'roaming.carrier.att', labelDefault: 'AT&T / Verizon', price: 60, data: '10 GB', noteKey: 'roaming.note.dayPass5', noteDefault: '$12/day × 5', flagCode: 'us' },
      { id: 'rogers', labelKey: 'roaming.carrier.rogersCA', labelDefault: 'Rogers (CA)', price: 50, data: '10 GB', noteKey: 'roaming.note.roamLikeHome5', noteDefault: '$10/day × 5', flagCode: 'ca' },
      { id: 'three', labelKey: 'roaming.carrier.threeUK', labelDefault: 'Three (UK)', price: 44, data: '12 GB', noteKey: 'roaming.note.goRoamWorld5', noteDefault: '£35 · 12 GB pool', flagCode: 'gb' },
      { id: 'telekom', labelKey: 'roaming.carrier.telekomDE', labelDefault: 'Telekom (DE)', price: 32, data: '5 GB', noteKey: 'roaming.note.travelMobilWorld5gb', noteDefault: '€29.95 · 5 GB cap', flagCode: 'de' },
      { id: 'simnetiq', labelKey: 'roaming.carrier.simnetiq', labelDefault: 'Simnetiq eSIM', price: 18, data: '10 GB', noteKey: 'roaming.note.esim10gb', noteDefault: '10 GB plan' },
    ],
  },
  {
    id: 'brazil',
    labelKey: 'roaming.dest.brazil',
    labelDefault: 'Brazil',
    flag: 'br',
    carriers: [
      { id: 'att', labelKey: 'roaming.carrier.att', labelDefault: 'AT&T / Verizon', price: 60, data: '10 GB', noteKey: 'roaming.note.dayPass5', noteDefault: '$12/day × 5', flagCode: 'us' },
      { id: 'rogers', labelKey: 'roaming.carrier.rogersCA', labelDefault: 'Rogers (CA)', price: 50, data: '10 GB', noteKey: 'roaming.note.roamLikeHome5', noteDefault: '$10/day × 5', flagCode: 'ca' },
      { id: 'three', labelKey: 'roaming.carrier.threeUK', labelDefault: 'Three (UK)', price: 32, data: '12 GB', noteKey: 'roaming.note.goRoamWorld5', noteDefault: '£25 · 12 GB pool', flagCode: 'gb' },
      { id: 'telekom', labelKey: 'roaming.carrier.telekomDE', labelDefault: 'Telekom (DE)', price: 32, data: '5 GB', noteKey: 'roaming.note.travelMobilWorld5gb', noteDefault: '€29.95 · 5 GB cap', flagCode: 'de' },
      { id: 'simnetiq', labelKey: 'roaming.carrier.simnetiq', labelDefault: 'Simnetiq eSIM', price: 25, data: '10 GB', noteKey: 'roaming.note.esim10gb', noteDefault: '10 GB plan' },
    ],
  },
  {
    id: 'egypt',
    labelKey: 'roaming.dest.egypt',
    labelDefault: 'Egypt',
    flag: 'eg',
    carriers: [
      { id: 'att', labelKey: 'roaming.carrier.att', labelDefault: 'AT&T / Verizon', price: 60, data: '10 GB', noteKey: 'roaming.note.dayPass5', noteDefault: '$12/day × 5', flagCode: 'us' },
      { id: 'rogers', labelKey: 'roaming.carrier.rogersCA', labelDefault: 'Rogers (CA)', price: 50, data: '10 GB', noteKey: 'roaming.note.roamLikeHome5', noteDefault: '$10/day × 5', flagCode: 'ca' },
      { id: 'three', labelKey: 'roaming.carrier.threeUK', labelDefault: 'Three (UK)', price: 44, data: '12 GB', noteKey: 'roaming.note.goRoamWorld5', noteDefault: '£35 · 12 GB pool', flagCode: 'gb' },
      { id: 'telekom', labelKey: 'roaming.carrier.telekomDE', labelDefault: 'Telekom (DE)', price: 32, data: '5 GB', noteKey: 'roaming.note.travelMobilWorld5gb', noteDefault: '€29.95 · 5 GB cap', flagCode: 'de' },
      { id: 'simnetiq', labelKey: 'roaming.carrier.simnetiq', labelDefault: 'Simnetiq eSIM', price: 29.5, data: 'Unlimited', noteKey: 'roaming.note.esimUnlimited5d', noteDefault: 'Unlimited 5-day' },
    ],
  },
  {
    id: 'usa',
    labelKey: 'roaming.dest.usa',
    labelDefault: 'USA',
    flag: 'us',
    carriers: [
      { id: 'rogers', labelKey: 'roaming.carrier.rogersCA', labelDefault: 'Rogers (CA)', price: 50, data: '10 GB', noteKey: 'roaming.note.roamLikeHome5', noteDefault: '$10/day × 5', flagCode: 'ca' },
      { id: 'three', labelKey: 'roaming.carrier.threeUK', labelDefault: 'Three (UK)', price: 38, data: '12 GB', noteKey: 'roaming.note.goRoam5', noteDefault: '£30 · 12 GB pool', flagCode: 'gb' },
      { id: 'simnetiq', labelKey: 'roaming.carrier.simnetiq', labelDefault: 'Simnetiq eSIM', price: 19, data: 'Unlimited', noteKey: 'roaming.note.esimUnlimited5d', noteDefault: 'Unlimited 5-day' },
      { id: 'telekom', labelKey: 'roaming.carrier.telekomDE', labelDefault: 'Telekom (DE)', price: 16, data: '5 GB', noteKey: 'roaming.note.travelMobil5gb', noteDefault: '€14.95 · 5 GB cap', flagCode: 'de' },
    ],
  },
  {
    id: 'spain',
    labelKey: 'roaming.dest.spain',
    labelDefault: 'Spain',
    flag: 'es',
    carriers: [
      { id: 'att', labelKey: 'roaming.carrier.att', labelDefault: 'AT&T / Verizon', price: 60, data: '10 GB', noteKey: 'roaming.note.dayPass5', noteDefault: '$12/day × 5', flagCode: 'us' },
      { id: 'rogers', labelKey: 'roaming.carrier.rogersCA', labelDefault: 'Rogers (CA)', price: 50, data: '10 GB', noteKey: 'roaming.note.roamLikeHome5', noteDefault: '$10/day × 5', flagCode: 'ca' },
      { id: 'telekom', labelKey: 'roaming.carrier.telekomDE', labelDefault: 'Telekom (DE)', price: 16, data: '5 GB', noteKey: 'roaming.note.travelMobil5gb', noteDefault: '€14.95 · 5 GB cap', flagCode: 'de' },
      { id: 'simnetiq', labelKey: 'roaming.carrier.simnetiq', labelDefault: 'Simnetiq eSIM', price: 15.5, data: '10 GB', noteKey: 'roaming.note.esim10gb', noteDefault: '10 GB plan' },
      { id: 'three', labelKey: 'roaming.carrier.threeUK', labelDefault: 'Three (UK)', price: 0, data: '12 GB', noteKey: 'roaming.note.goRoamFreeEU', noteDefault: 'Free (EU) · 12 GB pool', flagCode: 'gb' },
    ],
  },
];

function DestinationTab({ dest, isActive, onClick, t }) {
  return (
    <button
      onClick={onClick}
      role="tab"
      className={`
        flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0
        ${isActive
          ? 'bg-tufts-blue text-white shadow-sm'
          : 'text-text-muted hover:text-text-primary'
        }
      `}
      style={!isActive ? { backgroundColor: 'var(--hover-bg)' } : undefined}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
    >
      <img src={'/flags/' + dest.flag + '.svg'} alt="" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover flex-shrink-0" />
      <span className="truncate">{t(dest.labelKey, dest.labelDefault)}</span>
    </button>
  );
}

function CarrierBar({ carrier, maxPrice, isVisible, index, t }) {
  const isSimnetiq = carrier.id === 'simnetiq';
  const widthPct = Math.max((carrier.price / maxPrice) * 100, 3); // min 3% so small bars are visible

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-baseline mb-1.5 gap-2 sm:gap-4 rtl-native-flex">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-hidden rtl-native-flex">
          {isSimnetiq ? (
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 665 831" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g>
                <path d="M137.5 133.5V689C289.804 689 527.5 689 527.5 689V267L405 133.5H137.5Z" className="fill-text-primary" />
                <path d="M137.5 133.5V689C289.804 689 527.5 689 527.5 689V267L405 133.5H137.5Z" className="stroke-text-primary" strokeWidth="131" strokeLinejoin="round" />
              </g>
              <path d="M242.302 649.7C226.102 649.7 211.802 646.8 199.402 641C187.002 635.2 177.302 626.9 170.302 616.1C163.302 605.3 159.802 592.3 159.802 577.1V568.7H198.802V577.1C198.802 589.7 202.702 599.2 210.502 605.6C218.302 611.8 228.902 614.9 242.302 614.9C255.902 614.9 266.002 612.2 272.602 606.8C279.402 601.4 282.802 594.5 282.802 586.1C282.802 580.3 281.102 575.6 277.702 572C274.502 568.4 269.702 565.5 263.302 563.3C257.102 560.9 249.502 558.7 240.502 556.7L233.602 555.2C219.202 552 206.802 548 196.402 543.2C186.202 538.2 178.302 531.7 172.702 523.7C167.302 515.7 164.602 505.3 164.602 492.5C164.602 479.7 167.602 468.8 173.602 459.8C179.802 450.6 188.402 443.6 199.402 438.8C210.602 433.8 223.702 431.3 238.702 431.3C253.702 431.3 267.002 433.9 278.602 439.1C290.402 444.1 299.602 451.7 306.202 461.9C313.002 471.9 316.402 484.5 316.402 499.7V508.7H277.402V499.7C277.402 491.7 275.802 485.3 272.602 480.5C269.602 475.5 265.202 471.9 259.402 469.7C253.602 467.3 246.702 466.1 238.702 466.1C226.702 466.1 217.802 468.4 212.002 473C206.402 477.4 203.602 483.5 203.602 491.3C203.602 496.5 204.902 500.9 207.502 504.5C210.302 508.1 214.402 511.1 219.802 513.5C225.202 515.9 232.102 518 240.502 519.8L247.402 521.3C262.402 524.5 275.402 528.6 286.402 533.6C297.602 538.6 306.302 545.2 312.502 553.4C318.702 561.6 321.802 572.1 321.802 584.9C321.802 597.7 318.502 609 311.902 618.8C305.502 628.4 296.302 636 284.302 641.6C272.502 647 258.502 649.7 242.302 649.7ZM352.535 645.5V496.7H389.735V516.2H395.135C397.535 511 402.035 506.1 408.635 501.5C415.235 496.7 425.235 494.3 438.635 494.3C450.235 494.3 460.335 497 468.935 502.4C477.735 507.6 484.535 514.9 489.335 524.3C494.135 533.5 496.535 544.3 496.535 556.7V645.5H458.735V559.7C458.735 548.5 455.935 540.1 450.335 534.5C444.935 528.9 437.135 526.1 426.935 526.1C415.335 526.1 406.335 530 399.935 537.8C393.535 545.4 390.335 556.1 390.335 569.9V645.5H352.535ZM399.635 479.9L421.835 435.5H464.435L432.635 479.9H399.635Z" fill="white" />
            </svg>
          ) : carrier.flagCode ? (
            <img src={`/flags/${carrier.flagCode}.svg`} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
          ) : null}
          <span className={`text-xs sm:text-sm font-medium truncate ${isSimnetiq ? 'text-tufts-blue font-semibold' : 'text-text-primary'}`}>
            {t(carrier.labelKey, carrier.labelDefault)}
          </span>
          {carrier.data && (
            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-bold ${
              isSimnetiq
                ? 'bg-tufts-blue/15 text-tufts-blue'
                : carrier.data === '5 GB'
                  ? 'bg-red-500/10 text-red-500'
                  : 'bg-[var(--hover-bg)] text-text-muted'
            }`}>
              {carrier.data}
            </span>
          )}
          <span className="text-xs text-text-muted hidden sm:inline truncate min-w-0">
            {t(carrier.noteKey, carrier.noteDefault)}
          </span>
        </div>
        <span className={`tabular-nums shrink-0 ${isSimnetiq ? 'text-base sm:text-lg font-extrabold text-tufts-blue' : 'text-sm sm:text-base font-bold text-text-primary'}`}>
          ${carrier.price}
        </span>
      </div>
      <div className="w-full h-3.5 rounded-full bg-[var(--subtle-bg)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${isSimnetiq ? 'bg-tufts-blue' : ''}`}
          style={{
            ...(!isSimnetiq ? { backgroundColor: 'var(--text-muted)' } : {}),
            width: isVisible ? `${widthPct}%` : '0%',
            transitionDelay: `${index * 100}ms`,
          }}
          role="meter"
          aria-label={`${t(carrier.labelKey, carrier.labelDefault)}: $${carrier.price}`}
          aria-valuenow={carrier.price}
          aria-valuemin={0}
          aria-valuemax={maxPrice}
        />
      </div>
    </div>
  );
}

export default function RoamingComparison() {
  const { t } = useI18n();
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeDestIdx, setActiveDestIdx] = useState(0);

  const activeDest = DESTINATIONS[activeDestIdx];
  const maxPrice = Math.max(...activeDest.carriers.map(c => c.price));
  const simnetiqPrice = activeDest.carriers.find(c => c.id === 'simnetiq')?.price || 5;
  const highestCarrierPrice = activeDest.carriers.filter(c => c.id !== 'simnetiq').reduce((max, c) => Math.max(max, c.price), 0);
  const savingsPercent = Math.round(((highestCarrierPrice - simnetiqPrice) / highestCarrierPrice) * 100);

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

  return (
    <section
      className="relative"
      aria-labelledby="roaming-heading"
      ref={sectionRef}
    >
      <div className="max-w-7xl mx-auto px-4 pt-16 lg:pt-24 pb-4 lg:pb-8">

        {/* Section header */}
        <div className="mb-10 text-start">
          <Reveal>
            <p className="text-xs font-semibold tracking-widest uppercase text-text-muted mb-3">
              {t('roaming.label', 'Real carrier prices')}
            </p>
            <h2
              id="roaming-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary max-w-xl"
            >
              {t('roaming.title', 'Stop overpaying for roaming')}
            </h2>
            <p className="text-text-muted mt-3 max-w-lg text-base">
              {t('roaming.subtitle', 'Real prices from major carriers vs. Simnetiq. Based on a 1-week trip with 5GB of data.')}
            </p>
          </Reveal>
        </div>

        {/* Destination tabs */}
        <Reveal>
          <div className="flex gap-1 overflow-x-auto pb-1 mb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist" aria-label={t('roaming.selectDest', 'Select destination')}>
            {DESTINATIONS.map((dest, idx) => (
              <DestinationTab
                key={dest.id}
                dest={dest}
                isActive={idx === activeDestIdx}
                onClick={() => setActiveDestIdx(idx)}
                t={t}
              />
            ))}
          </div>
        </Reveal>

        {/* Comparison chart */}
        <div className="glass-card mb-6" style={{ borderRadius: 0 }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
            <p className="text-xs font-semibold tracking-widest uppercase text-text-muted">
              {t('roaming.chartTitle', '1-week trip · 5GB data')}
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-tufts-blue" style={{ backgroundColor: 'rgba(73, 117, 212, 0.1)', border: '1px solid rgba(73, 117, 212, 0.2)' }}>
                {t('roaming.saveLabel', 'Save up to')} {savingsPercent}%
              </span>
            </div>
          </div>

          {activeDest.carriers.map((carrier, index) => (
            <CarrierBar
              key={`${activeDest.id}-${carrier.id}`}
              carrier={carrier}
              maxPrice={maxPrice}
              isVisible={isVisible}
              index={index}
              t={t}
            />
          ))}

          <div className="mt-5 pt-4 border-t border-[var(--divider)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-text-muted opacity-70">
              {t('roaming.disclaimer', 'Carrier rates based on official published prices (Mar 2026). eSIM prices reflect typical market rates.')}
            </p>
            <p className="text-xs text-text-muted opacity-70">
              {t('roaming.sources', 'telekom.de · att.com · three.co.uk · rogers.com · airalo.com')}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
