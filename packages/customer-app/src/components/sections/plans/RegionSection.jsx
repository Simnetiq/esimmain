import { memo, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import RegionalDealCard from './RegionalDealCard';
import { ArrowRightIcon } from './PlanIcons';
import { REGION_COUNTRIES } from './planUtils';
import CountryCard from '../../CountryCard';

const RegionSection = memo(function RegionSection({
    region,
    countries,
    plans,
    countriesCount,
    popularCountries = [], // List of country codes from admin config
    plansLoading,
    onCountrySelect,
    onPlanClick,
    t
}) {
    const router = useRouter();

    // Filter countries based on the region configuration
    const regionCountries = useMemo(() => {
        if (!countries) return [];

        // 1. If we have a manually defined list of popular countries, use that
        if (popularCountries && popularCountries.length > 0) {
            // Map codes to actual country objects
            const selectedCountries = popularCountries.map(code =>
                countries.find(c => c.code === code)
            ).filter(Boolean); // Remove nulls if country not found in active list

            if (selectedCountries.length > 0) {
                return selectedCountries;
            }
        }

        // 2. Fallback to automatic filtering based on DB region field
        return countries.filter(c => {
            const countryRegion = c.region?.toLowerCase();
            const targetRegion = region?.toLowerCase();

            // Simple direct match
            if (countryRegion === targetRegion) return true;

            // Handle Americas mapping
            if (targetRegion === 'americas' && (countryRegion === 'north-america' || countryRegion === 'south-america' || countryRegion === 'latin-america')) {
                return true;
            }

            return false;
        });
    }, [countries, region, popularCountries]);

    return (
        <div className="py-8 border-b border-gray-100 last:border-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                {/* Deal Card - Hero of the section */}
                <div className="h-full">
                    <RegionalDealCard
                        region={region}
                        plans={plans}
                        countriesCount={countriesCount}
                        onPlanClick={onPlanClick}
                        t={t}
                        isLoading={plansLoading}
                    />
                </div>

                {/* Quick Country Links */}
                <div className="space-y-6 lg:pl-8">
                    <div>
                        <h4 className="text-lg font-semibold text-eerie-black mb-2">
                            {t(`region.${region}_countries`, `Popular in ${region}`)}
                        </h4>
                        <p className="text-sm text-gray-500">
                            {t('deals.selectCountry', 'Select a specific country for local plans')}
                        </p>
                    </div>

                    {/* Country Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {regionCountries.slice(0, 6).map(country => (
                            <div key={country.code} className="h-full">
                                <CountryCard
                                    country={country}
                                    onClick={() => onCountrySelect(country)}
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => router.push('/esim-plans')}
                        className="inline-flex items-center gap-2 text-sm font-bold text-tufts-blue hover:text-blue-800 transition-colors mt-2"
                    >
                        {t('common.viewAllCountries', 'View all countries')}
                        <ArrowRightIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
});

export default RegionSection;
