'use client';

import React, { useState, useEffect } from 'react';

import { useI18n } from '@esim/shared/contexts/I18nContext';
import CountryCard from './CountryCard';

const CountriesGrid = ({ 
  countries, 
  isPlansPage, 
  searchTerm,
  onCountrySelect,
  isLoading,
  selectedRegion,
  showAllOverride = null // New prop to override show all state from parent
}) => {
  const { t } = useI18n();

  const [showAll, setShowAll] = useState(false);

  // Reset showAll when region changes
  useEffect(() => {
    setShowAll(false);
  }, [selectedRegion]);

  // Determine how many countries to show
  // Desktop: 4 rows × 4 columns = 16 countries
  // Mobile: 4 rows × 2 columns = 8 countries
  const desktopLimit = 16;
  const mobileLimit = 8;
  
  // Use showAllOverride if provided (from parent), otherwise use internal state
  const effectiveShowAll = showAllOverride !== null ? showAllOverride : showAll;
  
  const shouldLimitCountries = !searchTerm && (selectedRegion === 'all' || !isPlansPage);
  const displayedCountriesDesktop = (shouldLimitCountries && !effectiveShowAll) ? countries.slice(0, desktopLimit) : countries;
  const displayedCountriesMobile = (shouldLimitCountries && !effectiveShowAll) ? countries.slice(0, mobileLimit) : countries;
  
  // Only show the internal button if showAllOverride is not provided (i.e., on plans page)
  const showShowAllButton = showAllOverride === null && shouldLimitCountries && !showAll && countries.length > desktopLimit;

  if (isLoading && countries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 lg:h-12 lg:w-12 shadow-lg mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('plans.loadingPlans', 'Loading countries...')}</p>
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
    <>
      {/* Desktop Grid Layout - 4 columns */}
      <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {displayedCountriesDesktop.map((country) => (
          <CountryCard
            key={country.id}
            country={country}
            onClick={() => onCountrySelect(country)}
            isMobile={false}
          />
        ))}
      </div>
      
      {/* Show All Button for Desktop */}
      {showShowAllButton && (
        <div className="hidden sm:block text-center mt-10">
          <button
            onClick={() => setShowAll(true)}
            className="btn-primary px-8 py-3 text-white font-semibold rounded-lg hover:bg-tufts-blue transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {t('plans.showAll', 'Show All Countries')}
          </button>
        </div>
      )}
      
      {/* Mobile List Layout - 2 columns with proper spacing */}
      <div className="sm:hidden grid grid-cols-2 gap-4">
        {displayedCountriesMobile.map((country) => (
          <CountryCard
            key={country.id}
            country={country}
            onClick={() => onCountrySelect(country)}
            isMobile={true}
          />
        ))}
      </div>
      
      {/* Show All Button for Mobile */}
      {showShowAllButton && (
        <div className="sm:hidden text-center mt-6">
          <button
            onClick={() => setShowAll(true)}
            className="btn-primary w-full px-6 py-3 text-white font-semibold rounded-lg hover:bg-tufts-blue transition-all duration-200 shadow-lg"
          >
            {t('plans.showAll', 'Show All Countries')}
          </button>
        </div>
      )}
    </>
  );
};

export default CountriesGrid;

