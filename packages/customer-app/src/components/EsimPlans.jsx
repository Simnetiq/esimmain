import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { useSearchParams, useRouter } from 'next/navigation';
import CountriesGrid from './CountriesGrid';
import RegionTabs from './RegionTabs';
import { useCountriesSupabase } from '@esim/shared/hooks/useCountriesSupabase';
import { usePromotedCountriesSupabase } from '@esim/shared/hooks/usePromotedCountriesSupabase';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import {
    fetchRegionalPlans,
    fetchCountryPlans,
} from '@esim/shared/services/plansServiceSupabase';

// Lazy load heavy modal component (reduces initial bundle)
const PlanSelectionBottomSheet = dynamic(
  () => import('./PlanSelectionBottomSheet'),
  { ssr: false, loading: () => null }
);


// Helper function to format data amount correctly
const formatDataAmount = (mb) => {
    if (!mb || mb <= 0) return null;
    if (mb >= 1024) {
        const gb = mb / 1024;
        return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`;
    }
    return `${mb} MB`;
};

// Flexible Plan Card Component for Regional Plans
const FlexiblePlanCard = ({ plan, t, onClick, isRTL = false }) => {
    // Use pre-formatted data if available, otherwise calculate from MB
    const dataAmount = plan.isUnlimited
        ? t('plans.unlimited', 'Unlimited')
        : (plan.dataAmountMb ? formatDataAmount(plan.dataAmountMb) : plan.data) || t('plans.data', 'Data');

    const validity = plan.validity
        ? `${plan.validity} ${t('plans.days', 'Days')}`
        : '';

    // Get voice minutes (from voice or calls field)
    const voiceMinutes = parseInt(plan.voice || plan.calls || '0', 10);
    const hasVoice = plan.hasVoice && voiceMinutes > 0;

    // Get SMS count
    const smsCount = parseInt(plan.sms || '0', 10);
    const hasSms = plan.hasSms && smsCount > 0;

    // Get country coverage count
    const countryCount = plan.coveredCountryCount || 0;

    return (
        <div
            onClick={onClick}
            className="bg-gray-50 p-4 hover:bg-white transition-all duration-500 cursor-pointer group h-full flex flex-col justify-between relative overflow-hidden"
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            {/* Price — big watermark on the right */}
            <span
                className="absolute top-3 end-3 text-[3rem] sm:text-[3.5rem] font-semibold leading-none text-gray-700 select-none pointer-events-none"
                aria-hidden="true"
            >
                ${plan.price}
            </span>

            <div>
                <h4 className="font-semibold text-lg text-eerie-black text-start">
                    {dataAmount}
                </h4>
                {validity && (
                    <p className="text-xs font-medium tracking-widest uppercase text-tufts-blue mt-1 mb-3 text-start">
                        {validity}
                    </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {plan.isFeatured && (
                        <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            {t('plans.featured', 'Featured')}
                        </span>
                    )}
                    {!plan.isFeatured && plan.isBestValue && (
                        <span className="inline-flex items-center bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {t('plans.bestValue', 'Best Value')}
                        </span>
                    )}
                    {hasVoice && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {voiceMinutes} {t('plans.mins', 'mins')}
                        </span>
                    )}
                    {hasSms && (
                        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            {smsCount} SMS
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between rtl-native-flex">
                    {countryCount > 0 ? (
                        <p className="text-xs text-tufts-blue/80 font-medium truncate text-start pe-4">
                            {t('deals.covers', 'Covers')} {countryCount} {countryCount === 1 ? t('deals.country', 'country') : t('deals.countries', 'countries')}
                        </p>
                    ) : <span />}
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 group-hover:bg-eerie-black group-hover:text-white transition-colors duration-300 rtl:rotate-180">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>

            </div>
        </div>
    );
};

// Constants for country limits
const HOME_PAGE_COUNTRY_LIMIT = 16;
const PLANS_PAGE_COUNTRY_LIMIT = 40;

const EsimPlans = ({ isHomePage = false }) => {
    const { t, locale } = useI18n();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Determine the country limit based on page context
    const countryLimit = isHomePage ? HOME_PAGE_COUNTRY_LIMIT : PLANS_PAGE_COUNTRY_LIMIT;

    // Detect current language from URL with fallback
    const currentLanguage = useMemo(() => {
        return locale || 'en';
    }, [locale]);

    const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('global');
    const [regionalPlans, setRegionalPlans] = useState([]);

    // Checkout/Modal State
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [selectedSheetPlans, setSelectedSheetPlans] = useState([]);
    const [loadingSheetPlans, setLoadingSheetPlans] = useState(false);
    const [allRegionalPlans, setAllRegionalPlans] = useState([]); // Store all regional plans (not just top 4)
    const [sheetContext, setSheetContext] = useState(null); // 'country' | 'regional' - context for the bottom sheet

    // Countries Data - using Supabase
    const { countries, isLoading: countriesLoading } = useCountriesSupabase(currentLanguage);

    // Promoted Countries for selected region - fetched from region_promoted_countries table
    const { promotedCountries, isLoading: promotedLoading } = usePromotedCountriesSupabase(
        selectedRegion,
        currentLanguage,
        16 // Max 16 promoted countries per region
    );

    // Hydration fix
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Debounce search to avoid filtering on every keystroke
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 250);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Special "Discover Global" entry for global/discover searches
    const discoverGlobalEntry = useMemo(() => ({
        id: 'discover-global',
        code: 'GLOBAL',
        name: 'Discover Global',
        displayName: t('plans.discoverGlobal', 'Discover Global'),
        slug: 'discover-global',
        flagEmoji: '🌍',
        planCount: 50, // Approximate - will show "50+ plans"
        isActive: true,
        isPopular: true,
        isRegional: true,
        isGlobal: true,
        region: 'global',
        status: 'active'
    }), [t]);

    // Filter countries based on search and region
    // Always exclude countries without tariffs (planCount === 0)
    // Prioritize PROMOTED countries when a region is selected
    const filteredCountries = useMemo(() => {
        // First, filter to only countries that have at least one plan (tariff)
        const countriesWithPlans = countries.filter(c => (c.planCount || 0) > 0);
        let filtered = countriesWithPlans;

        if (debouncedSearchTerm) {
            // Search mode - filter by search term (still only showing countries with plans)
            const term = debouncedSearchTerm.toLowerCase();
            filtered = countriesWithPlans.filter(c =>
                (c.name && c.name.toLowerCase().includes(term)) ||
                (c.displayName && c.displayName.toLowerCase().includes(term)) ||
                (c.code && c.code.toLowerCase().includes(term))
            );

            // Add "Discover Global" entry if searching for global/discover terms
            const globalTerms = ['global', 'discover', 'world', 'worldwide', 'international'];
            if (globalTerms.some(gt => gt.includes(term) || term.includes(gt))) {
                filtered = [discoverGlobalEntry, ...filtered];
            }
        } else {
            // Region filtering
            if (selectedRegion === 'all') {
                // Show all countries with plans for 'all' region
                filtered = countriesWithPlans;
            } else if (selectedRegion === 'popular') {
                // Show only popular countries that have plans
                filtered = countriesWithPlans.filter(c => c.isPopular === true);
                // If no popular countries marked, show first 20 by plan count
                if (filtered.length === 0) {
                    filtered = [...countriesWithPlans]
                        .sort((a, b) => (b.planCount || 0) - (a.planCount || 0))
                        .slice(0, 20);
                }
            } else if (selectedRegion === 'global') {
                // For GLOBAL region: show promoted countries first, then all remaining countries
                if (promotedCountries && promotedCountries.length > 0) {
                    const promotedIds = new Set(promotedCountries.map(c => c.id));
                    // Get all countries NOT in promoted list
                    const remainingCountries = countriesWithPlans.filter(c => !promotedIds.has(c.id));
                    // Combine: promoted first, then remaining alphabetically
                    filtered = [...promotedCountries, ...remainingCountries];
                } else {
                    filtered = countriesWithPlans;
                }
            } else if (selectedRegion) {
                // For specific regions (europe, asia, etc.), use PROMOTED countries first
                // Promoted countries come from admin-configured region_promoted_countries table
                if (promotedCountries && promotedCountries.length > 0) {
                    // Get IDs of promoted countries
                    const promotedIds = new Set(promotedCountries.map(c => c.id));

                    // Get remaining countries in this region (not already promoted)
                    const regionCountries = countriesWithPlans.filter(c => {
                        const countryRegion = (c.region || '').toLowerCase();
                        return countryRegion === selectedRegion && !promotedIds.has(c.id);
                    });

                    // Combine: promoted first, then remaining region countries
                    filtered = [...promotedCountries, ...regionCountries];
                } else {
                    // Fallback: filter by region_id if no promoted countries configured
                    filtered = countriesWithPlans.filter(c => {
                        const countryRegion = (c.region || '').toLowerCase();
                        return countryRegion === selectedRegion;
                    });
                }
            }
        }

        // Don't limit here - CountriesGrid handles pagination with "Load More"
        return filtered;
    }, [countries, debouncedSearchTerm, selectedRegion, discoverGlobalEntry, promotedCountries]);


    // Sync URL params
    useEffect(() => {
        const search = searchParams.get('search');
        if (search) setSearchTerm(search);
    }, [searchParams]);

    // Fetch Regional Plans from Supabase (with cancellation to prevent race conditions)
    useEffect(() => {
        let cancelled = false;

        const loadRegionalPlans = async () => {
            if (!selectedRegion || selectedRegion === 'all' || selectedRegion === 'popular') {
                setRegionalPlans([]);
                setAllRegionalPlans([]);
                return;
            }

            try {
                const plans = await fetchRegionalPlans(selectedRegion);
                if (cancelled) return;
                setAllRegionalPlans(plans);
                setRegionalPlans(plans.slice(0, 4));
            } catch (error) {
                if (cancelled) return;
                console.error('Error fetching regional plans from Supabase:', error);
                setRegionalPlans([]);
                setAllRegionalPlans([]);
            }
        };

        if (isMounted && selectedRegion) loadRegionalPlans();
        return () => { cancelled = true; };
    }, [selectedRegion, isMounted]);

    // Handlers - Load plans from Supabase
    const handleCountrySelect = useCallback(async (country) => {
        setLoadingSheetPlans(true);
        setShowCheckoutModal(true);
        setSheetContext('country');

        try {
            let plans;
            // Handle "Discover Global" special entry
            if (country.isGlobal || country.code === 'GLOBAL' || country.id === 'discover-global') {
                // Fetch all global plans (not just featured 4)
                plans = await fetchRegionalPlans('global');
            } else {
                plans = await fetchCountryPlans(country.code);
            }
            setSelectedSheetPlans(plans);
        } catch (error) {
            console.error('Error loading plans from Supabase:', error);
            setSelectedSheetPlans([]);
        } finally {
            setLoadingSheetPlans(false);
        }
    }, []);

    // Handler for "Show All" regional plans button
    const handleShowAllRegionalPlans = useCallback(() => {
        setSheetContext('regional');
        setSelectedSheetPlans(allRegionalPlans);
        setShowCheckoutModal(true);
    }, [allRegionalPlans]);

    // Handler for "Show More" button on home page - redirects to plans page
    const handleShowMoreCountries = useCallback(() => {
        const plansUrl = (currentLanguage === 'en' || !currentLanguage)
            ? '/esim-plans'
            : `/${currentLanguage}/esim-plans`;
        router.push(plansUrl);
    }, [currentLanguage, router]);

    const handlePlanClick = (plan, type) => {
        if (typeof trackCustomFacebookEvent === 'function') {
            trackCustomFacebookEvent('ViewContent', {
                content_name: plan.planName || plan.package,
                content_ids: [plan.id],
                content_type: 'product',
                value: plan.price,
                currency: 'USD'
            });
        }

        let countryParam = type;
        if (type === 'global') {
            countryParam = 'discover-global';
        } else if (type === 'regional') {
            // Fallback order: plan's slug -> selected region -> 'europe' (safe default)
            countryParam = plan.country_slug || selectedRegion || 'europe';
        }

        // Note: Don't use encodeURIComponent for the plan ID in the path segment
        // Next.js handles URL encoding automatically, and double-encoding causes issues
        // with special characters like '+' in plan IDs (e.g., 'discover+-15days-2gb')
        const planUrl = (currentLanguage === 'en' || !currentLanguage)
            ? `/share-package/${plan.id}?country=${countryParam}`
            : `/${currentLanguage}/share-package/${plan.id}?country=${countryParam}`;

        router.push(planUrl);
    };

    const isPlansPage = true;

    if (!isMounted) {
        return (
            <div className="min-h-screen bg-white">
                {/* Header skeleton */}
                <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12 lg:mt-20">
                    <div className="h-4 sm:h-5 bg-gray-100 rounded w-32 animate-pulse" />
                    <div className="h-7 sm:h-8 lg:h-10 xl:h-12 bg-gray-100 rounded w-80 mt-3 sm:mt-4 animate-pulse" />
                </div>
                <div className="w-full h-px bg-gray-100 mt-4 sm:mt-6" />

                {/* Search skeleton */}
                <div className="w-full border-b border-gray-100">
                    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
                        <div className="h-10 sm:h-11 bg-gray-100 rounded w-full animate-pulse" />
                    </div>
                </div>

                {/* Content skeleton */}
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                    {/* Region tabs skeleton */}
                    <div className="flex gap-2 mb-8">
                        {[1,2,3,4,5].map(i => (
                            <div key={i} className="h-8 bg-gray-100 rounded-full w-20 animate-pulse" />
                        ))}
                    </div>
                    {/* Countries grid skeleton */}
                    <div className="h-5 bg-gray-100 rounded w-28 mb-4 animate-pulse" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {Array.from({length: 8}).map((_, i) => (
                            <div key={i} className="h-16 bg-gray-50 rounded animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-white transition-opacity duration-150 ${isMounted ? 'opacity-100' : 'opacity-0'}`} dir={isRTL ? 'rtl' : 'ltr'}>

            {/* Header */}
            <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12 lg:mt-20">
                <p className="font-mono text-sm sm:text-base font-medium tracking-widest uppercase text-gray-500 rtl:font-bold rtl:tracking-tight">
                    {t('plans.title', 'eSIM Plans')}
                </p>
                <h2 className="my-3 sm:my-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-eerie-black">
                    {t('plans.subtitle', 'Choose your perfect eSIM plan')}
                </h2>
            </div>
            <div className="w-full h-px bg-gray-100 mt-4 sm:mt-6"></div>

            {/* Sticky Search */}
            <div className="w-full sticky top-0 z-40 bg-white border-b border-gray-100">
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
                    <input
                        type="text"
                        placeholder={t('plans.searchPlaceholder', 'Search eSIM plans...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field w-full py-2.5 sm:py-3 resize-none ps-10 pe-4 text-start"
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-12">
                {debouncedSearchTerm ? (
                    <CountriesGrid
                        countries={filteredCountries}
                        isPlansPage={isPlansPage}
                        searchTerm={debouncedSearchTerm}
                        onCountrySelect={handleCountrySelect}
                        isLoading={countriesLoading}
                        selectedRegion={selectedRegion}
                        initialLimit={countryLimit}
                        isHomePage={isHomePage}
                        onShowMoreClick={isHomePage ? handleShowMoreCountries : null}
                    />
                ) : (
                    <>
                        {/* Region Tabs */}
                        <div>
                            <RegionTabs
                                selectedRegion={selectedRegion}
                                onRegionChange={setSelectedRegion}
                            />
                        </div>

                        {/* Regional Plans */}
                        {regionalPlans.length > 0 && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3 rtl-native-flex">
                                    <h3 className="text-lg font-bold text-eerie-black">
                                        {t('plans.regionalPlans', 'Regional Plans')}
                                    </h3>
                                    {allRegionalPlans.length > 4 && (
                                        <button
                                            onClick={handleShowAllRegionalPlans}
                                            className="text-sm font-medium text-tufts-blue hover:text-blue-700 transition-colors flex items-center gap-1 rtl-native-flex"
                                        >
                                            {t('plans.showAll', 'Show All')}
                                            <span className="text-xs bg-tufts-blue/10 text-tufts-blue px-1.5 py-0.5 rounded-full">
                                                {allRegionalPlans.length}
                                            </span>
                                            <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {regionalPlans.map((plan) => (
                                        <FlexiblePlanCard
                                            key={plan.id}
                                            plan={plan}
                                            t={t}
                                            isRTL={isRTL}
                                            onClick={() => handlePlanClick(plan, selectedRegion === 'global' ? 'global' : 'regional')}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Countries Grid */}
                        <div>
                            <div className="flex items-center justify-between mb-3 rtl-native-flex">
                                <h3 className="text-lg font-bold text-eerie-black">
                                    {t('plans.countries', 'Countries')}
                                </h3>
                                {filteredCountries.length > 0 && (
                                    <span className="text-sm text-gray-500">
                                        {filteredCountries.length} {t('plans.available', 'available')}
                                    </span>
                                )}
                            </div>
                            <CountriesGrid
                                countries={filteredCountries}
                                isPlansPage={isPlansPage}
                                searchTerm={searchTerm}
                                onCountrySelect={handleCountrySelect}
                                isLoading={countriesLoading}
                                selectedRegion={selectedRegion}
                                initialLimit={countryLimit}
                                isHomePage={isHomePage}
                                onShowMoreClick={isHomePage ? handleShowMoreCountries : null}
                                promotedCountryIds={promotedCountries?.filter(c => c.isExplicitlyPromoted)?.map(c => c.id) || []}
                            />
                        </div>
                    </>
                )}
            </div>

            <PlanSelectionBottomSheet
                isOpen={showCheckoutModal}
                onClose={() => setShowCheckoutModal(false)}
                availablePlans={selectedSheetPlans}
                loadingPlans={loadingSheetPlans}
                filteredCountries={filteredCountries}
                context={sheetContext}
                regionName={selectedRegion}
            />
        </div>
    );
};

export default EsimPlans;
