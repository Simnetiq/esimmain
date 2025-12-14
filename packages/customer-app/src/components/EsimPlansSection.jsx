'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { motion } from 'framer-motion';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { detectLanguageFromPath } from '@esim/shared/utils/languageUtils';

// Import components
import CountriesGrid from './CountriesGrid';
import PlanSelectionBottomSheet from './PlanSelectionBottomSheet';

// Import hooks
import { useCountries } from '@esim/shared/hooks/useCountries';
import { useCountryFilters } from '@esim/shared/hooks/useCountryFilters';

const EsimPlansSection = ({ selectedCountryFromHero }) => {
  const { t, locale } = useI18n();
  useAuth(); // Keep for future use
  const router = useRouter();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);
  
  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);
  
  // Detect current language from URL with fallback
  const currentLanguage = useMemo(() => {
    try {
      return detectLanguageFromPath(pathname) || locale || 'en';
    } catch {
      return locale || 'en';
    }
  }, [pathname, locale]);
  
  // This is always the main page section, not standalone
  const isPlansPage = false;
  
  // Show more state for expanding country list
  const [showAllCountries, setShowAllCountries] = useState(false);
  
  // Plan selection and checkout state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Use custom hooks with current language
  const { countries, isLoading: countriesLoading } = useCountries(currentLanguage);
  const { 
    selectedRegion, 
    searchTerm, 
    filteredCountries,
  } = useCountryFilters(countries);


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

  // Handle country selection - Memoized
  const handleCountrySelect = useCallback(async (country) => {
    // Always open bottom sheet with plans for all users
    setShowCheckoutModal(true);
    setLoadingPlans(true);
    await loadAvailablePlansForCountry(country.code);
  }, [loadAvailablePlansForCountry]);

  // Handle country selection from hero section
  useEffect(() => {
    if (selectedCountryFromHero && countries.length > 0) {
      // Find the country in the countries list
      const country = countries.find(c => c.code === selectedCountryFromHero.code);
      if (country) {
        handleCountrySelect(country);
      }
    }
  }, [selectedCountryFromHero, countries, handleCountrySelect]);

  // Calculate countries to display (2 rows = 8 countries on desktop, 4 on mobile) - Memoized
  const desktopInitialLimit = 8; // 2 rows × 4 columns
  
  const displayedCountries = useMemo(() => 
    showAllCountries 
      ? filteredCountries 
      : filteredCountries.slice(0, desktopInitialLimit),
    [showAllCountries, filteredCountries, desktopInitialLimit]
  );
    
  const hasMoreCountries = filteredCountries.length > desktopInitialLimit;

  // Memoize navigation handler
  const handleNavigateToPlans = useCallback(() => {
    const plansUrl = currentLanguage && currentLanguage !== 'en' ? `/${currentLanguage}/esim-plans` : '/esim-plans';
    router.push(plansUrl);
  }, [currentLanguage, router]);

  return (
    <div ref={sectionRef} className="w-full">
      {/* Countries Grid Section - Main page version */}
      <motion.div
        layout
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`mb-6 transform transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        <CountriesGrid
          countries={displayedCountries}
          isPlansPage={isPlansPage}
          searchTerm={searchTerm}
          onCountrySelect={handleCountrySelect}
          isLoading={countriesLoading}
          selectedRegion={selectedRegion}
          showAllOverride={showAllCountries}
        />
      </motion.div>

      {/* Show More / See All Plans Buttons */}
      {!countriesLoading && filteredCountries.length > 0 && (
        <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 mb-8 transform transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Show More Button - Only show if not showing all and has more countries */}
          {!showAllCountries && hasMoreCountries && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              onClick={() => setShowAllCountries(true)}
              className="btn-secondary flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 w-full max-w-md"
            >
              <span>{t('plans.showMore', 'Show More')}</span>
              <ChevronDown className="w-5 h-5" />
            </motion.button>
          )}
          
          {/* See All Plans Button - Always show */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            onClick={handleNavigateToPlans}
            className="btn-primary inline-flex items-center justify-center gap-2 w-full max-w-md py-3 rounded-lg"
          >
            <span>{t('plans.seeAllPlans', 'See All Plans')}</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>
      )}

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

export default EsimPlansSection;
