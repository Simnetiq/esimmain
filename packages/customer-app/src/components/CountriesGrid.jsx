'use client';

import React, { useState, useEffect, useRef } from 'react';

import { useI18n } from '@esim/shared/contexts/I18nContext';
import CountryCard from './CountryCard';

const CountriesGrid = ({
  countries,
  isPlansPage,
  searchTerm,
  onCountrySelect,
  isLoading,
  selectedRegion,
  showAllOverride = null // When provided, parent controls the countries list directly
}) => {
  const { t } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const gridRef = useRef(null);

  // Reset showAll when region changes
  useEffect(() => {
    setShowAll(false);
    setIsExpanding(false);
  }, [selectedRegion]);

  // Limits for internal slicing (only used when showAllOverride is null)
  const desktopLimit = 8;
  const mobileLimit = 4;

  // When showAllOverride is provided, parent controls the list - just render what we receive
  // When showAllOverride is null, we handle internal slicing
  const isParentControlled = showAllOverride !== null;

  // For parent-controlled mode, just use countries as-is
  // For internal mode, apply slicing based on showAll state
  const displayedCountriesDesktop = isParentControlled
    ? countries
    : (showAll ? countries : countries.slice(0, desktopLimit));

  const displayedCountriesMobile = isParentControlled
    ? countries
    : (showAll ? countries : countries.slice(0, mobileLimit));

  // Only show internal button when not parent-controlled
  const showShowAllButton = !isParentControlled && !showAll && countries.length > desktopLimit;

  // Handle expand animation
  const handleShowAll = () => {
    setIsExpanding(true);
    requestAnimationFrame(() => {
      setShowAll(true);
      setTimeout(() => setIsExpanding(false), 500);
    });
  };

  if (isLoading && countries.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm lg:text-base">
          {searchTerm
            ? t('plans.noCountriesFound', 'No countries found matching your search')
            : t('plans.noCountriesAvailable', 'No countries available yet')
          }
        </p>
      </div>
    );
  }

  return (
    <div ref={gridRef}>
      {/* Desktop Grid Layout - 4 columns */}
      <div
        className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {displayedCountriesDesktop.map((country, index) => (
          <div
            key={country.id}
            className={`transform transition-all duration-500 ease-out ${!isParentControlled && showAll && index >= desktopLimit
              ? 'animate-slide-down'
              : ''
              }`}
            style={{
              animationDelay: !isParentControlled && showAll && index >= desktopLimit
                ? `${Math.floor((index - desktopLimit) / 4) * 100}ms`
                : '0ms'
            }}
          >
            <CountryCard
              country={country}
              onClick={() => onCountrySelect(country)}
              isMobile={false}
            />
          </div>
        ))}
      </div>

      {/* Show All Button for Desktop - Only when internally controlled */}
      {showShowAllButton && (
        <div className="hidden sm:block text-center mt-8">
          <button
            onClick={handleShowAll}
            className="btn-secondary px-8 py-3 font-semibold rounded-lg transition-all duration-300 hover:scale-105"
          >
            {t('plans.showAll', 'Show All Countries')} ({countries.length})
          </button>
        </div>
      )}

      {/* Mobile List Layout - 2 columns */}
      <div
        className="sm:hidden grid grid-cols-2 gap-3"
      >
        {displayedCountriesMobile.map((country, index) => (
          <div
            key={country.id}
            className={`transform transition-all duration-500 ease-out ${!isParentControlled && showAll && index >= mobileLimit
              ? 'animate-slide-down'
              : ''
              }`}
            style={{
              animationDelay: !isParentControlled && showAll && index >= mobileLimit
                ? `${Math.floor((index - mobileLimit) / 2) * 100}ms`
                : '0ms'
            }}
          >
            <CountryCard
              country={country}
              onClick={() => onCountrySelect(country)}
              isMobile={true}
            />
          </div>
        ))}
      </div>

      {/* Show All Button for Mobile - Only when internally controlled */}
      {showShowAllButton && (
        <div className="sm:hidden text-center mt-6">
          <button
            onClick={handleShowAll}
            className="btn-secondary w-full px-6 py-3 font-semibold rounded-lg transition-all duration-300"
          >
            {t('plans.showAll', 'Show All Countries')} ({countries.length})
          </button>
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

