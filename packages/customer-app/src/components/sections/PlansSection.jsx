'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { usePathname, useRouter } from 'next/navigation';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { parsePrice } from '@esim/shared/utils/priceUtils';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import { useCountries } from '@esim/shared/hooks/useCountries';

// Components
import PlanSelectionBottomSheet from '../PlanSelectionBottomSheet';
import {
  GlobalPlanCard,
  RegionSection,
  GlobeIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  REGION_SLUGS,
  countCountriesFromPlans
} from './plans';

export default function PlansSection({ selectedCountry }) {
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  // State
  const [globalPlans, setGlobalPlans] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalCountriesCount, setGlobalCountriesCount] = useState(0);
  const [regionData, setRegionData] = useState({});
  const [regionLoading, setRegionLoading] = useState({});
  const [showMoreRegions, setShowMoreRegions] = useState(false);

  // Bottom sheet state
  const [showPlanSheet, setShowPlanSheet] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [loadingSheetPlans, setLoadingSheetPlans] = useState(false);

  const getCurrentLanguage = useCallback(() => {
    if (locale) return locale;
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('Simnetiq-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname);
  }, [locale, pathname]);

  const currentLanguage = useMemo(() => getCurrentLanguage(), [getCurrentLanguage]);
  const isRTL = useMemo(() => getLanguageDirection(currentLanguage) === 'rtl', [currentLanguage]);

  const { countries, isLoading: countriesLoading } = useCountries(currentLanguage);

  // Fetch Discover Global plans
  useEffect(() => {
    const fetchGlobalPlans = async () => {
      try {
        setGlobalLoading(true);

        const globalQuery = query(
          collection(db, 'dataplans'),
          where('country_title', '==', 'Discover Global')
        );
        const snapshot = await getDocs(globalQuery);
        let plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filter enabled, non-topup
        plans = plans.filter(p =>
          p.enabled !== false &&
          p.is_topup !== true &&
          p.type !== 'topup'
        );

        // Count countries from first plan's operator_coverages
        if (plans.length > 0) {
          const count = countCountriesFromPlans([plans[0]]);
          setGlobalCountriesCount(count);
        }

        if (plans.length > 0) {
          const regularPlans = plans.filter(p => !(p.data || '').toLowerCase().includes('unlimited') && !p.is_unlimited);
          const unlimitedPlans = plans.filter(p => (p.data || '').toLowerCase().includes('unlimited') || p.is_unlimited);

          regularPlans.sort((a, b) => (parsePrice(a.price) || 999) - (parsePrice(b.price) || 999));
          unlimitedPlans.sort((a, b) => (parsePrice(a.price) || 999) - (parsePrice(b.price) || 999));

          // Get 3 cheapest regular + 3 cheapest unlimited (to include the one user asked for)
          // User requested "one more plan, the unlimited one", so increasing limit
          const selected = [...regularPlans.slice(0, 3), ...unlimitedPlans.slice(0, 3)].slice(0, 6);
          setGlobalPlans(selected);
        }
      } catch (error) {
        console.error('Error fetching global plans:', error);
      } finally {
        setGlobalLoading(false);
      }
    };

    fetchGlobalPlans();
  }, []);

  // Fetch regional plans
  const fetchRegionPlans = useCallback(async (region) => {
    setRegionLoading(prev => ({ ...prev, [region]: true }));

    try {
      // Fetch region config to get popular countries
      let popularCountries = [];
      try {
        const regionDocRef = doc(db, 'regions', region);
        const regionDocSnap = await getDoc(regionDocRef);
        if (regionDocSnap.exists()) {
          popularCountries = regionDocSnap.data().popularCountries || [];
        }
      } catch (err) {
        console.error('Error fetching region config:', err);
      }

      const slugs = REGION_SLUGS[region] || [region];
      let allPlans = [];

      for (const slug of slugs) {
        const regionQuery = query(
          collection(db, 'dataplans'),
          where('country_slug', '==', slug)
        );
        const snapshot = await getDocs(regionQuery);
        const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allPlans = [...allPlans, ...plans];
      }

      allPlans = allPlans.filter(p =>
        p.enabled !== false &&
        p.is_topup !== true &&
        p.type !== 'topup'
      );

      const countriesCount = countCountriesFromPlans(allPlans);

      setRegionData(prev => ({
        ...prev,
        [region]: { plans: allPlans, countriesCount, popularCountries }
      }));
    } catch (error) {
      console.error(`Error fetching ${region} plans:`, error);
      setRegionData(prev => ({
        ...prev,
        [region]: { plans: [], countriesCount: 0, popularCountries: [] }
      }));
    } finally {
      setRegionLoading(prev => ({ ...prev, [region]: false }));
    }
  }, []);

  // Fetch initial regions
  useEffect(() => {
    fetchRegionPlans('europe');
    fetchRegionPlans('asia');
  }, [fetchRegionPlans]);

  // Fetch more regions when expanded
  useEffect(() => {
    if (showMoreRegions) {
      fetchRegionPlans('americas');
      fetchRegionPlans('africa');
      fetchRegionPlans('oceania');
    }
  }, [showMoreRegions, fetchRegionPlans]);

  // Handle country selection
  const handleCountrySelect = useCallback(async (country) => {
    setLoadingSheetPlans(true);
    setShowPlanSheet(true);

    try {
      const plansQuery = query(
        collection(db, 'dataplans'),
        where('country_codes', 'array-contains', country.code)
      );
      const snapshot = await getDocs(plansQuery);

      let plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      plans = plans.filter(p =>
        p.enabled !== false &&
        p.is_topup !== true &&
        p.type !== 'topup'
      );

      setSelectedPlans(plans);
    } catch (error) {
      console.error('Error loading plans:', error);
      setSelectedPlans([]);
    } finally {
      setLoadingSheetPlans(false);
    }
  }, []);

  // Handle plan click
  const handlePlanClick = useCallback((plan, region, openFullSheet = false) => {
    if (openFullSheet || !plan) {
      setSelectedPlans(regionData[region]?.plans || []);
      setShowPlanSheet(true);
    } else {
      trackCustomFacebookEvent('PlanClicked', {
        plan_id: plan.id,
        plan_price: plan.price,
        region: region,
        source: 'home_plans_section',
        timestamp: new Date().toISOString()
      });

      const planUrl = currentLanguage === 'en'
        ? `/share-package/${plan.id}?country=${plan.country_slug || region}`
        : `/${currentLanguage}/share-package/${plan.id}?country=${plan.country_slug || region}`;
      router.push(planUrl);
    }
  }, [regionData, currentLanguage, router]);

  // Handle global plan click
  const handleGlobalPlanClick = useCallback((plan) => {
    trackCustomFacebookEvent('GlobalPlanClicked', {
      plan_id: plan.id,
      plan_price: plan.price,
      source: 'home_global_section',
      timestamp: new Date().toISOString()
    });

    const planUrl = currentLanguage === 'en'
      ? `/share-package/${plan.id}?country=discover-global`
      : `/${currentLanguage}/share-package/${plan.id}?country=discover-global`;
    router.push(planUrl);
  }, [currentLanguage, router]);

  // Navigate to all plans
  const handleNavigateToPlans = useCallback(() => {
    const plansUrl = currentLanguage === 'en' ? '/esim-plans' : `/${currentLanguage}/esim-plans`;
    router.push(plansUrl);
  }, [currentLanguage, router]);

  // Handle external country selection (e.g., from Hero/URL search)
  useEffect(() => {
    if (selectedCountry) {
      handleCountrySelect(selectedCountry);
    }
  }, [selectedCountry]); // handleCountrySelect is stable via useCallback

  const gridPatternStyle = useMemo(() => ({
    backgroundSize: '10px 10px',
    backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
  }), []);

  const isLoading = i18nLoading || countriesLoading;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-white flex flex-col overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="relative flex-1 flex flex-col">
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
              <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="h-10 w-96 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white flex flex-col overflow-hidden">
      <div className="relative flex-1 flex flex-col">
        <div className="hidden xl:block absolute left-0 top-0 bottom-0 w-32" style={gridPatternStyle} />
        <div className="hidden xl:block absolute right-0 top-0 bottom-0 w-32" style={gridPatternStyle} />

        {/* Header */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className="text-sm sm:text-base font-medium tracking-widest uppercase text-gray-500">
                {t('plans.title', 'eSIM Plans')}
              </p>
              <h2 className="mt-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-eerie-black max-w-5xl">
                {t('plans.subtitle', 'Stay connected worldwide')}
              </h2>
            </div>
          </div>
          <div className="w-full h-px bg-gray-100" />
        </div>

        {/* Main Content */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl space-y-8">

              {/* Discover Global Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tufts-blue to-blue-600 flex items-center justify-center">
                    <GlobeIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-eerie-black">
                      {t('deals.discoverGlobal', 'Discover Global')}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {globalCountriesCount > 0 ? `${globalCountriesCount}+ ${t('deals.countries', 'countries')}` : '130+ countries'} · {t('deals.oneEsim', 'One eSIM, worldwide coverage')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {globalLoading ? (
                    [...Array(4)].map((_, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-4 h-32 animate-pulse" />
                    ))
                  ) : globalPlans.length > 0 ? (
                    globalPlans.map((plan) => (
                      <GlobalPlanCard
                        key={plan.id}
                        plan={plan}
                        onClick={() => handleGlobalPlanClick(plan)}
                        t={t}
                      />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8 text-gray-400 text-sm">
                      {t('deals.noGlobalPlans', 'Global plans coming soon')}
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-gray-100" />

              {/* Regional Sections */}
              <RegionSection
                region="europe"
                countries={countries}
                plans={regionData.europe?.plans || []}
                countriesCount={regionData.europe?.countriesCount || 0}
                popularCountries={regionData.europe?.popularCountries || []}
                plansLoading={regionLoading.europe}
                onCountrySelect={handleCountrySelect}
                onPlanClick={(plan, openFull) => handlePlanClick(plan, 'europe', openFull)}
                t={t}
              />

              <RegionSection
                region="asia"
                countries={countries}
                plans={regionData.asia?.plans || []}
                countriesCount={regionData.asia?.countriesCount || 0}
                popularCountries={regionData.asia?.popularCountries || []}
                plansLoading={regionLoading.asia}
                onCountrySelect={handleCountrySelect}
                onPlanClick={(plan, openFull) => handlePlanClick(plan, 'asia', openFull)}
                t={t}
              />

              {/* Expanded Regions */}
              {showMoreRegions && (
                <>
                  <RegionSection
                    region="americas"
                    countries={countries}
                    plans={regionData.americas?.plans || []}
                    countriesCount={regionData.americas?.countriesCount || 0}
                    popularCountries={regionData.americas?.popularCountries || []}
                    plansLoading={regionLoading.americas}
                    onCountrySelect={handleCountrySelect}
                    onPlanClick={(plan, openFull) => handlePlanClick(plan, 'americas', openFull)}
                    t={t}
                  />
                  <RegionSection
                    region="africa"
                    countries={countries}
                    plans={regionData.africa?.plans || []}
                    countriesCount={regionData.africa?.countriesCount || 0}
                    popularCountries={regionData.africa?.popularCountries || []}
                    plansLoading={regionLoading.africa}
                    onCountrySelect={handleCountrySelect}
                    onPlanClick={(plan, openFull) => handlePlanClick(plan, 'africa', openFull)}
                    t={t}
                  />
                  <RegionSection
                    region="oceania"
                    countries={countries}
                    plans={regionData.oceania?.plans || []}
                    countriesCount={regionData.oceania?.countriesCount || 0}
                    popularCountries={regionData.oceania?.popularCountries || []}
                    plansLoading={regionLoading.oceania}
                    onCountrySelect={handleCountrySelect}
                    onPlanClick={(plan, openFull) => handlePlanClick(plan, 'oceania', openFull)}
                    t={t}
                  />
                </>
              )}

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                {!showMoreRegions && (
                  <button
                    onClick={() => setShowMoreRegions(true)}
                    className="btn-secondary flex items-center gap-2 px-6 py-3 rounded-full font-semibold  w-full sm:w-auto"
                  >
                    <span>{t('plans.showMoreRegions', 'Show More Regions')}</span>
                    <ChevronDownIcon className="w-5 h-5" />
                  </button>
                )}

                <button
                  onClick={handleNavigateToPlans}
                  className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full w-full sm:w-auto"
                >
                  <span>{t('plans.seeAllPlans', 'See All Plans')}</span>
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <PlanSelectionBottomSheet
        isOpen={showPlanSheet}
        onClose={() => setShowPlanSheet(false)}
        availablePlans={selectedPlans}
        loadingPlans={loadingSheetPlans}
        filteredCountries={[]}
      />
    </div>
  );
}
