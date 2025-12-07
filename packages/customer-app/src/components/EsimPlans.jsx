'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';

// Import new components
import RegionTabs from './RegionTabs';
import CountriesGrid from './CountriesGrid';
import PlanSelectionBottomSheet from './PlanSelectionBottomSheet';

// Import hooks
import { useCountries } from '@esim/shared/hooks/useCountries';
import { useCountryFilters } from '@esim/shared/hooks/useCountryFilters';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';

const EsimPlans = () => {
  const { t, locale, isLoading: i18nLoading } = useI18n();
  useAuth(); // Keep for future use
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current language - prioritize locale from context, then URL path
  const currentLanguage = useMemo(() => {
    try {
      // Wait for I18n to initialize before using locale
      if (i18nLoading) {
        // While loading, use localStorage or pathname detection
        if (typeof window !== 'undefined') {
          const savedLanguage = localStorage.getItem('Simnetiq-language');
          if (savedLanguage) return savedLanguage;
        }
        return detectLanguageFromPath(pathname) || 'en';
      }
      // Once loaded, prioritize locale from I18nContext
      return locale || 'en';
    } catch {
      return 'en';
    }
  }, [pathname, locale, i18nLoading]);
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';
  // This is always the standalone plans page
  const isPlansPage = true;

  // Plan selection and checkout state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Use custom hooks with current language
  const { countries, isLoading: countriesLoading } = useCountries(currentLanguage);
  const { 
    selectedRegion, 
    setSelectedRegion, 
    searchTerm, 
    setSearchTerm, 
    filteredCountries,
  } = useCountryFilters(countries);

  // Sync search term with URL params
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);


  // Load available plans for a specific country - Memoized
  const loadAvailablePlansForCountry = useCallback(async (countryCode) => {
    try {
      const plansQuery = query(
        collection(db, 'dataplans'),
        where('country_codes', 'array-contains', countryCode)
      );
      const querySnapshot = await getDocs(plansQuery);
      
      const plans = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter out disabled plans
      const enabledPlans = plans.filter(plan => plan.enabled !== false);
      
      setAvailablePlans(enabledPlans);
    } catch {
      setAvailablePlans([]);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  // Load available plans for a region (for regional packages) - Memoized
  const loadAvailablePlansForRegion = useCallback(async (regionSlug) => {
    try {
      const plansQuery = query(
        collection(db, 'dataplans'),
        where('is_regional', '==', true),
        where('country_code', '==', regionSlug)
      );
      const querySnapshot = await getDocs(plansQuery);
      
      const plans = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter out disabled plans
      const enabledPlans = plans.filter(plan => plan.enabled !== false);
      
      setAvailablePlans(enabledPlans);
    } catch {
      setAvailablePlans([]);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  // Handle country selection (works for both regular and regional countries) - Memoized
  const handleCountrySelect = useCallback(async (country) => {
    // Always open bottom sheet with plans for all users
    setShowCheckoutModal(true);
    setLoadingPlans(true);
    
    // Check if it's a regional package
    if (country.is_regional) {
      await loadAvailablePlansForRegion(country.code);
    } else {
      await loadAvailablePlansForCountry(country.code);
    }
  }, [loadAvailablePlansForCountry, loadAvailablePlansForRegion]);


  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header Section */}
      <div className="w-full">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12 lg:mt-20">
          <p className="font-mono text-sm sm:text-base font-medium tracking-widest uppercase text-gray-500 rtl:font-bold rtl:tracking-tight">
            {t('plans.title', 'eSIM Plans')}
          </p>
          <h2 className="my-3 sm:my-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black">
            {t('plans.subtitle', 'Choose your perfect eSIM plan')}
          </h2>
        </div>
      </div>
      <div className="w-full h-px bg-gray-100 mt-4 sm:mt-6"></div>

      {/* Search Section */}
      <div className="w-full">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="relative">
            <input
              type="text"
              placeholder={t('plans.searchPlaceholder', 'Search eSIM plans...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`input-field w-full py-2.5 sm:py-3 resize-none ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
              style={{ 
                textAlign: isRTL ? 'right' : 'left',
                direction: isRTL ? 'rtl' : 'ltr'
              }}
            />
          </div>
        </div>
      </div>

      {/* Region Tabs Section - Only show when not searching */}
      {isPlansPage && !searchTerm && (
        <>
          <div className="w-full">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
              <RegionTabs 
                selectedRegion={selectedRegion}
                onRegionChange={setSelectedRegion}
              />
            </div>
          </div>
          <div className="w-full h-px bg-gray-100"></div>
        </>
      )}

      {/* Countries Grid Section - Shows both regional and individual countries */}
      <div className="w-full">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <CountriesGrid
            countries={filteredCountries}
            isPlansPage={isPlansPage}
            searchTerm={searchTerm}
            onCountrySelect={handleCountrySelect}
            isLoading={countriesLoading}
            selectedRegion={selectedRegion}
          />
        </div>
      </div>

      {/* Plan Selection Bottom Sheet */}
      <PlanSelectionBottomSheet
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        availablePlans={availablePlans}
        loadingPlans={loadingPlans}
        filteredCountries={filteredCountries}
      />
    </div>
  );
};

export default EsimPlans;

