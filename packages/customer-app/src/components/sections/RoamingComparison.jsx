'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import Reveal from '../ui/Reveal';

/**
 * Roaming cost comparison data — REAL prices based on carrier research (March 2026).
 *
 * Sources:
 * - Telekom DE: telekom.de/unterwegs/tarife-und-optionen/roaming
 *   Travel Mobil Basic (Zone 2: USA, Turkey): €14.95/5GB
 *   Travel Mobil Basic World (Zone 3: Thailand, Japan, Brazil, Egypt): €29.95/5GB
 * - AT&T: att.com/international/day-pass — $12/day International Day Pass
 * - Verizon: verizon.com/plans/international — $12/day TravelPass
 * - Three UK: three.co.uk — Go Roam $6/day (Feel At Home), Go Roam World $8/day
 * - Rogers CA: rogers.com — Roam Like Home $10/day
 * - eSIM market pricing: airalo.com, esimdb.com (5GB/30-day plans)
 *
 * Scenario: 1-week trip, ~5GB data usage
 */

const DESTINATIONS = [
  {
    id: 'turkey',
    labelKey: 'roaming.dest.turkey',
    labelDefault: 'Turkey',
    flag: 'tr',
    carriers: [
      { id: 'att', labelKey: 'roaming.carrier.att', labelDefault: 'AT&T (US)', price: 84, noteKey: 'roaming.note.dayPass', noteDefault: 'Day Pass $12/day × 7', flagCode: 'us' },
      { id: 'rogers', labelKey: 'roaming.carrier.rogersCA', labelDefault: 'Rogers (Canada)', price: 70, noteKey: 'roaming.note.roamLikeHome', noteDefault: 'Roam Like Home $10/day × 7', flagCode: 'ca' },
      { id: 'three', labelKey: 'roaming.carrier.threeUK', labelDefault: 'Three (UK)', price: 42, noteKey: 'roaming.note.goRoam', noteDefault: 'Go Roam $6/day × 7', flagCode: 'gb' },
      { id: 'telekom', labelKey: 'roaming.carrier.telekomDE', labelDefault: 'Telekom (DE)', price: 16, noteKey: 'roaming.note.travelMobil', noteDefault: 'Travel Mobil Basic 5GB', flagCode: 'de' },
      { id: 'simnetiq', labelKey: 'roaming.carrier.simnetiq', labelDefault: 'Simnetiq eSIM', price: 10, noteKey: 'roaming.note.esim5gb', noteDefault: '5GB plan' },
    ],
  },
  {
    id: 'thailand',
    labelKey: 'roaming.dest.thailand',
    labelDefault: 'Thailand',
    flag: 'th',
    carriers: [
      { id: 'att', labelKey: 'roaming.carrier.att', labelDefault: 'AT&T (US)', price: 84, noteKey: 'roaming.note.dayPass', noteDefault: 'Day Pass $12/day × 7', flagCode: 'us' },
      { id: 'rogers', labelKey: 'roaming.carrier.rogersCA', labelDefault: 'Rogers (Canada)', price: 70, noteKey: 'roaming.note.roamLikeHome', noteDefault: 'Roam Like Home $10/day × 7', flagCode: 'ca' },
      { id: 'three', labelKey: 'roaming.carrier.threeUK', labelDefault: 'Three (UK)', price: 56, noteKey: 'roaming.note.goRoamWorld', noteDefault: 'Go Roam World $8/day × 7', flagCode: 'gb' },
      { id: 'telekom', labelKey: 'roaming.carrier.telekomDE', labelDefault: 'Telekom (DE)', price: 33, noteKey: 'roaming.note.travelMobilWorld', noteDefault: 'Travel Mobil World 5GB', flagCode: 'de' },
      { id: 'simnetiq', labelKey: 'roaming.carrier.simnetiq', labelDefault: 'Simnetiq eSIM', price: 8, noteKey: 'roaming.note.esim5gb', noteDefault: '5GB plan' },
    ],
  },
  {
    id: 'japan',
    labelKey: 'roaming.dest.japan',
    labelDefault: 'Japan',
    flag: 'jp',
    carriers: [
      { id: 'att', labelKey: 'roaming.carrier.att', labelDefault: 'AT&T (US)', price: 84, noteKey: 'roaming.note.dayPass', noteDefault: 'Day Pass $12/day × 7', flagCode: 'us' },
      { id: 'rogers', labelKey: 'roaming.carrier.rogersCA', labelDefault: 'Rogers (Canada)', price: 70, noteKey: 'roaming.note.roamLikeHome', noteDefault: 'Roam Like Home $10/day × 7', flagCode: 'ca' },
      { id: 'three', labelKey: 'roaming.carrier.threeUK', labelDefault: 'Three (UK)', price: 56, noteKey: 'roaming.note.goRoamWorld', noteDefault: 'Go Roam World $8/day × 7', flagCode: 'gb' },
      { id: 'telekom', labelKey: 'roaming.carrier.telekomDE', labelDefault: 'Telekom (DE)', price: 33, noteKey: 'roaming.note.travelMobilWorld', noteDefault: 'Travel Mobil World 5GB', flagCode: 'de' },
      { id: 'simnetiq', labelKey: 'roaming.carrier.simnetiq', labelDefault: 'Simnetiq eSIM', price: 11, noteKey: 'roaming.note.esim5gb', noteDefault: '5GB plan' },
    ],
  },
  {
    id: 'brazil',
    labelKey: 'roaming.dest.brazil',
    labelDefault: 'Brazil',
    flag: 'br',
    carriers: [
      { id: 'att', labelKey: 'roaming.carrier.att', labelDefault: 'AT&T (US)', price: 84, noteKey: 'roaming.note.dayPass', noteDefault: 'Day Pass $12/day × 7', flagCode: 'us' },
      { id: 'rogers', labelKey: 'roaming.carrier.rogersCA', labelDefault: 'Rogers (Canada)', price: 70, noteKey: 'roaming.note.roamLikeHome', noteDefault: 'Roam Like Home $10/day × 7', flagCode: 'ca' },
      { id: 'three', labelKey: 'roaming.carrier.threeUK', labelDefault: 'Three (UK)', price: 56, noteKey: 'roaming.note.goRoamWorld', noteDefault: 'Go Roam World $8/day × 7', flagCode: 'gb' },
      { id: 'telekom', labelKey: 'roaming.carrier.telekomDE', labelDefault: 'Telekom (DE)', price: 33, noteKey: 'roaming.note.travelMobilWorld', noteDefault: 'Travel Mobil World 5GB', flagCode: 'de' },
      { id: 'simnetiq', labelKey: 'roaming.carrier.simnetiq', labelDefault: 'Simnetiq eSIM', price: 14, noteKey: 'roaming.note.esim5gb', noteDefault: '5GB plan' },
    ],
  },
  {
    id: 'egypt',
    labelKey: 'roaming.dest.egypt',
    labelDefault: 'Egypt',
    flag: 'eg',
    carriers: [
      { id: 'att', labelKey: 'roaming.carrier.att', labelDefault: 'AT&T (US)', price: 84, noteKey: 'roaming.note.dayPass', noteDefault: 'Day Pass $12/day × 7', flagCode: 'us' },
      { id: 'rogers', labelKey: 'roaming.carrier.rogersCA', labelDefault: 'Rogers (Canada)', price: 70, noteKey: 'roaming.note.roamLikeHome', noteDefault: 'Roam Like Home $10/day × 7', flagCode: 'ca' },
      { id: 'three', labelKey: 'roaming.carrier.threeUK', labelDefault: 'Three (UK)', price: 56, noteKey: 'roaming.note.goRoamWorld', noteDefault: 'Go Roam World $8/day × 7', flagCode: 'gb' },
      { id: 'telekom', labelKey: 'roaming.carrier.telekomDE', labelDefault: 'Telekom (DE)', price: 33, noteKey: 'roaming.note.travelMobilWorld', noteDefault: 'Travel Mobil World 5GB', flagCode: 'de' },
      { id: 'simnetiq', labelKey: 'roaming.carrier.simnetiq', labelDefault: 'Simnetiq eSIM', price: 5, noteKey: 'roaming.note.esim5gb', noteDefault: '5GB plan' },
    ],
  },
  {
    id: 'usa',
    labelKey: 'roaming.dest.usa',
    labelDefault: 'USA',
    flag: 'us',
    carriers: [
      { id: 'three', labelKey: 'roaming.carrier.threeUK', labelDefault: 'Three (UK)', price: 42, noteKey: 'roaming.note.goRoam', noteDefault: 'Go Roam $6/day × 7', flagCode: 'gb' },
      { id: 'telekom', labelKey: 'roaming.carrier.telekomDE', labelDefault: 'Telekom (DE)', price: 16, noteKey: 'roaming.note.travelMobil', noteDefault: 'Travel Mobil Basic 5GB', flagCode: 'de' },
      { id: 'rogers', labelKey: 'roaming.carrier.rogersCA', labelDefault: 'Rogers (Canada)', price: 70, noteKey: 'roaming.note.roamLikeHome', noteDefault: 'Roam Like Home $10/day × 7', flagCode: 'ca' },
      { id: 'simnetiq', labelKey: 'roaming.carrier.simnetiq', labelDefault: 'Simnetiq eSIM', price: 11.5, noteKey: 'roaming.note.esim5gb', noteDefault: '5GB plan' },
    ],
  },
  {
    id: 'spain',
    labelKey: 'roaming.dest.spain',
    labelDefault: 'Spain',
    flag: 'es',
    carriers: [
      { id: 'att', labelKey: 'roaming.carrier.att', labelDefault: 'AT&T (US)', price: 84, noteKey: 'roaming.note.dayPass', noteDefault: 'Day Pass $12/day × 7', flagCode: 'us' },
      { id: 'three', labelKey: 'roaming.carrier.threeUK', labelDefault: 'Three (UK)', price: 0, noteKey: 'roaming.note.goRoamFree', noteDefault: 'Go Roam included (EU)', flagCode: 'gb' },
      { id: 'rogers', labelKey: 'roaming.carrier.rogersCA', labelDefault: 'Rogers (Canada)', price: 70, noteKey: 'roaming.note.roamLikeHome', noteDefault: 'Roam Like Home $10/day × 7', flagCode: 'ca' },
      { id: 'simnetiq', labelKey: 'roaming.carrier.simnetiq', labelDefault: 'Simnetiq eSIM', price: 10, noteKey: 'roaming.note.esim5gb', noteDefault: '5GB plan' },
    ],
  },
];

function DestinationTab({ dest, isActive, onClick, t }) {
  return (
    <button
      onClick={onClick}
      role="tab"
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap
        ${isActive
          ? 'bg-tufts-blue text-white shadow-sm'
          : 'text-text-muted hover:text-text-primary'
        }
      `}
      style={!isActive ? { backgroundColor: 'var(--hover-bg)' } : undefined}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
    >
      <img src={'/flags/' + dest.flag + '.svg'} alt="" className="w-5 h-5 rounded-full object-cover" />
      {t(dest.labelKey, dest.labelDefault)}
    </button>
  );
}

function CarrierBar({ carrier, maxPrice, isVisible, index, t }) {
  const isSimnetiq = carrier.id === 'simnetiq';
  const widthPct = Math.max((carrier.price / maxPrice) * 100, 3); // min 3% so small bars are visible

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-baseline mb-1.5 gap-2 sm:gap-4 rtl-native-flex">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-hidden">
          {carrier.flagCode && (
            <img src={`/flags/${carrier.flagCode}.svg`} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
          )}
          <span className={`text-xs sm:text-sm font-medium truncate ${isSimnetiq ? 'text-tufts-blue font-semibold' : 'text-text-primary'}`}>
            {t(carrier.labelKey, carrier.labelDefault)}
          </span>
          <span className="text-xs text-text-muted hidden sm:inline truncate min-w-0">
            {t(carrier.noteKey, carrier.noteDefault)}
          </span>
        </div>
        <span className="text-xs sm:text-sm font-bold tabular-nums shrink-0 text-text-primary">
          ${carrier.price}
        </span>
      </div>
      <div className="w-full h-3.5 bg-[var(--subtle-bg)] overflow-hidden">
        <div
          className="h-full transition-all duration-700 ease-out bg-tufts-blue"
          style={{
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-[var(--accent-success)]" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-success) 10%, transparent)' }}>
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
