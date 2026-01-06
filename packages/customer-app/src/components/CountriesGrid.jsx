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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" dir={direction} lang={detectedLanguage}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-16 sm:w-20 aspect-[4/3] bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-1/3 mt-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (countries.length === 0) {
    return (
      <div className="text-center py-12" dir={direction} lang={detectedLanguage}>
        <p className={`text-gray-500 text-sm lg:text-base ${isRTL ? 'text-right' : 'text-center'}`}>
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
            // Home page: "Show More" redirects to plans page
            <button
              onClick={onShowMoreClick}
              className="btn-secondary px-8 py-3 font-semibold rounded-full transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
            >
              {t('plans.showMore', 'Show More')}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          ) : (
            // Plans page: "Load More" expands the grid
            <button
              onClick={handleLoadMore}
              className="btn-secondary px-8 py-3 font-semibold rounded-full transition-all duration-300 hover:scale-105"
            >
              {t('plans.loadMore', 'Load More')} ({remainingCount > BATCH_SIZE ? BATCH_SIZE : remainingCount} {t('plans.more', 'more')})
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

