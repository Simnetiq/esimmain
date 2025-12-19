import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';
import CountriesGrid from './CountriesGrid';
import RegionTabs from './RegionTabs';
import PlanSelectionBottomSheet from './PlanSelectionBottomSheet';
import { useCountries } from '@esim/shared/hooks/useCountries';
import { db } from '@esim/shared/firebase/config';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import { REGION_SLUGS, countCountriesFromPlans } from './sections/plans';
import { FlagIcon } from '@esim/shared';


// Flexible Plan Card Component
const FlexiblePlanCard = ({ plan, t, subtitle, onClick }) => {
    const dataAmount = plan.dataAmountMb
        ? (plan.dataAmountMb >= 1000 ? `${plan.dataAmountMb / 1000} GB` : `${plan.dataAmountMb} MB`)
        : plan.data || 'Data';

    const validity = plan.validity
        ? `${plan.validity} ${t('plans.days', 'Days')}`
        : '';

    // Determine flag or icon
    const countryCode = plan.country_code || (plan.country_codes && plan.country_codes[0]);

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full flex flex-col justify-between relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-16 h-16 bg-tufts-blue/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />

            <div>
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg text-eerie-black">{dataAmount}</h4>
                    {plan.isBestValue && (
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {t('plans.bestValue', 'Best Value')}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                    {countryCode && plan.type !== 'global' ? (
                        <FlagIcon countryCode={countryCode} size="sm" className="rounded-sm" />
                    ) : (
                        <Globe className="w-4 h-4 text-tufts-blue" />
                    )}
                    <span className="text-sm text-gray-500 font-medium">{validity}</span>
                </div>

                <p className="text-xs text-tufts-blue/80 font-medium truncate pr-4">
                    {subtitle}
                </p>
            </div>

            <div className="mt-4 flex items-center justify-between">
                <span className="font-bold text-eerie-black text-lg">
                    ${plan.price}
                </span>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-tufts-blue group-hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

const EsimPlans = () => {
    const { t, locale } = useI18n();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Detect current language from URL with fallback (matching EsimPlansSection logic)
    const currentLanguage = useMemo(() => {
        // Simple fallback to locale from context if path detection isn't needed/available
        return locale || 'en';
    }, [locale]);

    const isRTL = currentLanguage === 'ar' || currentLanguage === 'he';

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('popular');
    const [globalPlans, setGlobalPlans] = useState([]);
    const [allGlobalPlans, setAllGlobalPlans] = useState([]);
    const [globalLoading, setGlobalLoading] = useState(true);
    const [globalCountriesCount, setGlobalCountriesCount] = useState(130);
    const [regionalPlans, setRegionalPlans] = useState([]);
    const [regionalLoading, setRegionalLoading] = useState(false);

    // Checkout/Modal State
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [selectedSheetPlans, setSelectedSheetPlans] = useState([]);
    const [loadingSheetPlans, setLoadingSheetPlans] = useState(false);

    // Countries Data
    const { countries, loading: countriesLoading } = useCountries();

    // Hydration fix
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Filter countries based on search
    const filteredCountries = useMemo(() => {
        let filtered = countries;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = countries.filter(c =>
                (c.name && c.name.toLowerCase().includes(term)) ||
                (c.displayName && c.displayName.toLowerCase().includes(term)) ||
                (c.code && c.code.toLowerCase().includes(term))
            );
        } else {
            // Filter by region
            if (selectedRegion && selectedRegion !== 'all' && selectedRegion !== 'popular') {
                filtered = countries.filter(c => {
                    const region = (c.region || '').toLowerCase();
                    const regions = (c.regions || []).map(r => r.toLowerCase());
                    return region === selectedRegion || regions.includes(selectedRegion);
                });
            }
        }
        return filtered;
    }, [countries, searchTerm, selectedRegion]);

    // Derived counts
    const regionCountriesCount = filteredCountries.length;

    // Sync URL params
    useEffect(() => {
        const search = searchParams.get('search');
        if (search) setSearchTerm(search);
    }, [searchParams]);

    // Fetch Global Plans
    useEffect(() => {
        const fetchGlobalPlans = async () => {
            setGlobalLoading(true);
            try {
                const q = query(
                    collection(db, 'dataplans'),
                    where('country_title', '==', 'Discover Global')
                );
                const snapshot = await getDocs(q);
                let plans = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                plans = plans.filter(p =>
                    p.enabled !== false &&
                    p.is_topup !== true &&
                    p.type !== 'topup'
                );

                const regularPlans = plans.filter(p => !(p.data || '').toLowerCase().includes('unlimited') && !p.is_unlimited);

                // Sort regular plans by price for priority selection
                regularPlans.sort((a, b) => (a.price || 0) - (b.price || 0));

                // Prioritize plans with specific data amounts: 200MB, 1GB, 10GB, 20GB
                const priorityPlans = [];
                const dataPriorities = [
                    { search: '200 mb', exact: true },
                    { search: '1 gb', exact: true },
                    { search: '10 gb', exact: true },
                    { search: '20 gb', exact: true }
                ];

                for (const priority of dataPriorities) {
                    const found = regularPlans.find(p => {
                        const data = (p.data || '').toLowerCase().trim();
                        if (priority.exact) {
                            return data === priority.search;
                        } else {
                            return data.includes(priority.search);
                        }
                    });
                    if (found && !priorityPlans.find(p => p.id === found.id)) {
                        priorityPlans.push(found);
                    }
                }

                // Fill remaining slots with cheapest plans
                const remainingSlots = 4 - priorityPlans.length;
                if (remainingSlots > 0) {
                    const remainingPlans = regularPlans.filter(p =>
                        !priorityPlans.find(pp => pp.id === p.id)
                    ).slice(0, remainingSlots);
                    priorityPlans.push(...remainingPlans);
                }

                // Count countries from first plan's operator_coverages
                if (regularPlans.length > 0) {
                    const count = countCountriesFromPlans([regularPlans[0]]);
                    setGlobalCountriesCount(count);
                }

                // Store all plans for the "explore all" feature
                setAllGlobalPlans(regularPlans);
                setGlobalPlans(priorityPlans.slice(0, 4));
            } catch (error) {
                console.error('Error fetching global plans:', error);
            } finally {
                setGlobalLoading(false);
            }
        };

        if (isMounted) fetchGlobalPlans();
    }, [isMounted]);

    // Fetch Regional Plans
    useEffect(() => {
        const fetchRegionalPlans = async () => {
            if (!selectedRegion || selectedRegion === 'all' || selectedRegion === 'popular') {
                setRegionalPlans([]);
                return;
            }

            setRegionalLoading(true);
            try {
                const slugs = REGION_SLUGS[selectedRegion] || [selectedRegion];
                let allPlans = [];

                for (const slug of slugs) {
                    const q = query(
                        collection(db, 'dataplans'),
                        where('country_slug', '==', slug)
                    );
                    const snapshot = await getDocs(q);
                    const plans = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    allPlans = [...allPlans, ...plans];
                }

                allPlans = allPlans.filter(p =>
                    p.enabled !== false &&
                    p.is_topup !== true &&
                    p.type !== 'topup'
                );

                setRegionalPlans(allPlans.slice(0, 4));
            } catch (error) {
                console.error('Error fetching regional plans:', error);
                setRegionalPlans([]);
            } finally {
                setRegionalLoading(false);
            }
        };

        if (isMounted && selectedRegion) fetchRegionalPlans();
    }, [selectedRegion, isMounted]);

    // Handlers
    const handleCountrySelect = useCallback(async (country) => {
        setLoadingSheetPlans(true);
        setShowCheckoutModal(true);

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

            setSelectedSheetPlans(plans);
        } catch (error) {
            console.error('Error loading plans:', error);
            setSelectedSheetPlans([]);
        } finally {
            setLoadingSheetPlans(false);
        }
    }, []);

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

        const planUrl = (currentLanguage === 'en' || !currentLanguage)
            ? `/share-package/${encodeURIComponent(plan.id)}?country=${countryParam}`
            : `/${currentLanguage}/share-package/${encodeURIComponent(plan.id)}?country=${countryParam}`;

        router.push(planUrl);
    };

    const handleExploreAllGlobal = () => {
        setSelectedSheetPlans(allGlobalPlans);
        setShowCheckoutModal(true);
    };

    const isPlansPage = true;

    if (!isMounted) {
        return <div className="min-h-screen bg-white" />;
    }

    return (
        <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
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
            <div className="w-full sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
                    <input
                        type="text"
                        placeholder={t('plans.searchPlaceholder', 'Search eSIM plans...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`input-field w-full py-2.5 sm:py-3 resize-none ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                        style={{ textAlign: isRTL ? 'right' : 'left' }}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-12">
                {searchTerm ? (
                    <CountriesGrid
                        countries={filteredCountries}
                        isPlansPage={isPlansPage}
                        searchTerm={searchTerm}
                        onCountrySelect={handleCountrySelect}
                        isLoading={countriesLoading}
                        selectedRegion={selectedRegion}
                    />
                ) : (
                    <>
                        {/* 1. Discover Global */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tufts-blue to-blue-600 flex items-center justify-center">
                                    <Globe className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-eerie-black">{t('deals.discoverGlobal', 'Discover Global')}</h3>
                                    <p className="text-xs text-gray-500">
                                        {globalCountriesCount}+ {t('deals.countries', 'countries')} · {t('deals.oneEsim', 'One eSIM, worldwide coverage')}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {globalLoading ? (
                                    [...Array(4)].map((_, i) => <div key={i} className="bg-gray-50 rounded-xl p-4 h-32 animate-pulse" />)
                                ) : globalPlans.map((plan) => (
                                    <FlexiblePlanCard
                                        key={plan.id}
                                        plan={plan}
                                        t={t}
                                        subtitle={t('deals.globalCoverage', 'Coverage in 130+ countries')}
                                        onClick={() => handlePlanClick(plan, 'global')}
                                    />
                                ))}
                                {!globalLoading && globalPlans.length === 0 && (
                                    <div className="col-span-full text-center py-8 text-gray-400 text-sm">
                                        {t('deals.noGlobalPlans', 'Global plans coming soon')}
                                    </div>
                                )}
                            </div>

                            {/* Explore All Button */}
                            {!globalLoading && globalPlans.length > 0 && (
                                <div className="flex justify-center mt-4">
                                    <button
                                        onClick={handleExploreAllGlobal}
                                        className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 hover:scale-105"
                                    >
                                        <span>{t('deals.exploreAll', 'Explore All')}</span>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="w-full h-px bg-gray-100" />

                        {/* 2. Region Tabs */}
                        <div>
                            <RegionTabs
                                selectedRegion={selectedRegion}
                                onRegionChange={setSelectedRegion}
                            />
                        </div>

                        {/* 3. Regional Plans */}
                        {regionalPlans.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-eerie-black mb-3">
                                    {t('plans.regionalPlans', 'Regional Plans')}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {regionalPlans.map((plan) => (
                                        <FlexiblePlanCard
                                            key={plan.id}
                                            plan={plan}
                                            t={t}
                                            subtitle={`${t('deals.covers', 'Covers')} ${regionCountriesCount} ${t('deals.countries', 'countries')}`}
                                            onClick={() => handlePlanClick(plan, 'regional')}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. Countries Grid */}
                        <div>
                            <CountriesGrid
                                countries={filteredCountries}
                                isPlansPage={isPlansPage}
                                searchTerm={searchTerm}
                                onCountrySelect={handleCountrySelect}
                                isLoading={countriesLoading}
                                selectedRegion={selectedRegion}
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
            />
        </div>
    );
};

export default EsimPlans;
