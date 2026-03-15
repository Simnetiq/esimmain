'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import CountryCard from './CountryCard';

const CountriesGrid = ({
  countries,
  isPlansPage,
  searchTerm,
  onCountrySelect,
  isLoading,
  selectedRegion,
  showAllOverride = null, // When provided, parent controls the countries list directly
  initialLimit = 16, // Default limit of 16 countries
  isHomePage = false, // If true, "Show More" redirects to plans page instead of expanding
  onShowMoreClick = null, // Custom handler for "Show More" button (used for home page redirect)
  promotedCountryIds = [] // IDs of promoted countries to show badge
}) => {
  const pathname = usePathname();
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const [displayCount, setDisplayCount] = useState(initialLimit); // Show initialLimit countries initially
  const [isExpanding, setIsExpanding] = useState(false);
  const [mounted, setMounted] = useState(false);
  const gridRef = useRef(null);

  // Batch size for "Load More" - use initialLimit for consistency
  const BATCH_SIZE = initialLimit;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Language detection with fallback
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
  const isRTL = direction === 'rtl';

  // Reset display count when region changes
  useEffect(() => {
    setDisplayCount(initialLimit);
    setIsExpanding(false);
  }, [selectedRegion, initialLimit]);

  // When showAllOverride is provided, parent controls the list - just render what we receive
  const isParentControlled = showAllOverride !== null;

  // Calculate displayed countries based on displayCount
  const displayedCountries = isParentControlled
    ? countries
    : countries.slice(0, displayCount);

  // Check if there are more countries to load
  const hasMoreCountries = !isParentControlled && countries.length > displayCount;
  const remainingCount = countries.length - displayCount;

  // Handle "Load More" click
  const handleLoadMore = () => {
    setIsExpanding(true);
    requestAnimationFrame(() => {
      setDisplayCount(prev => prev + BATCH_SIZE);
      setTimeout(() => setIsExpanding(false), 500);
    });
  };

  if (isLoading && countries.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4" dir={direction} lang={detectedLanguage}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="relative overflow-hidden p-4 animate-pulse" style={{ backgroundColor: 'var(--subtle-bg)' }}>
            <span className="absolute top-2 right-3 text-[3.5rem] sm:text-[4.5rem] font-semibold leading-none select-none" style={{ color: 'var(--card-border)' }} aria-hidden="true">--</span>
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--card-border)' }} />
                <div className="flex-1">
                  <div className="h-4 rounded w-3/4 mb-1.5" style={{ backgroundColor: 'var(--card-border)' }} />
                  <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--card-border)' }} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--subtle-border)' }}>
                <div className="h-5 rounded w-16" style={{ backgroundColor: 'var(--card-border)' }} />
                <div className="w-7 h-7 rounded-full" style={{ backgroundColor: 'var(--card-border)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (countries.length === 0) {
    return (
      <div className="text-center py-12" dir={direction} lang={detectedLanguage}>
        <p className="text-text-muted text-sm lg:text-base text-center">
          {searchTerm
            ? t('plans.noCountriesFound', 'No countries found matching your search')
            : t('plans.noCountriesAvailable', 'No countries available yet')
          }
        </p>
      </div>
    );
  }

  return (
    <div ref={gridRef} dir={direction} lang={detectedLanguage}>
      {/* Grid Layout - responsive columns */}
      <div
        className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 ${isRTL ? 'direction-rtl' : ''}`}
      >
        {displayedCountries.map((country, index) => (
          <div
            key={country.id}
            className={`transform transition-all duration-500 ease-out ${
              isExpanding && index >= displayCount - BATCH_SIZE
                ? 'animate-slide-down'
                : ''
            }`}
            style={{
              animationDelay: isExpanding && index >= displayCount - BATCH_SIZE
                ? `${Math.floor((index - (displayCount - BATCH_SIZE)) / 4) * 100}ms`
                : '0ms'
            }}
          >
            <CountryCard
              country={country}
              onClick={() => onCountrySelect(country)}
              isPromoted={promotedCountryIds.includes(country.id)}
            />
          </div>
        ))}
      </div>

      {/* Load More / Show More Button - Only when there are more countries */}
      {hasMoreCountries && (
        <div className="text-center mt-8">
          {isHomePage && onShowMoreClick ? (
            // Home page: "Show More" redirects to plans page — pill-with-circle CTA
            <button
              onClick={onShowMoreClick}
              className="inline-flex items-center rounded-full font-semibold transition-all duration-200 hover:opacity-90 rtl-native-flex ps-5 pe-1 py-1 text-sm"
              style={{
                backgroundColor: 'var(--cta-secondary-bg)',
                color: 'var(--cta-secondary-text)',
                border: '1px solid var(--cta-secondary-border)',
              }}
            >
              <span>{t('plans.showMore', 'Show More')}</span>
              <span
                className="ms-3 flex-shrink-0 inline-flex items-center justify-center rounded-full w-8 h-8 rtl-native-flex"
                style={{ backgroundColor: 'var(--cta-secondary-circle-bg)' }}
              >
                <svg className="w-3.5 h-3.5 rtl:-scale-x-100" style={{ color: 'var(--cta-secondary-circle-text)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17 17 7"/><path d="M7 7h10v10"/>
                </svg>
              </span>
            </button>
          ) : (
            // Plans page: "Load More" expands the grid — pill-with-circle CTA
            <button
              onClick={handleLoadMore}
              className="inline-flex items-center rounded-full font-semibold transition-all duration-200 hover:opacity-90 rtl-native-flex ps-5 pe-1 py-1 text-sm"
              style={{
                backgroundColor: 'var(--cta-secondary-bg)',
                color: 'var(--cta-secondary-text)',
                border: '1px solid var(--cta-secondary-border)',
              }}
            >
              <span>{t('plans.loadMore', 'Load More')} ({remainingCount > BATCH_SIZE ? BATCH_SIZE : remainingCount} {t('plans.more', 'more')})</span>
              <span
                className="ms-3 flex-shrink-0 inline-flex items-center justify-center rounded-full w-8 h-8 rtl-native-flex"
                style={{ backgroundColor: 'var(--cta-secondary-circle-bg)' }}
              >
                <svg className="w-3.5 h-3.5" style={{ color: 'var(--cta-secondary-circle-text)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </span>
            </button>
          )}
        </div>
      )}

      {/* CSS for slide-down animation - rows slide down from top */}
      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default CountriesGrid;

