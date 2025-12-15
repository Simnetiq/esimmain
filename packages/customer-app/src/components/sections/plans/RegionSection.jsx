import { memo, useMemo } from 'react';
import CountryCard from '../../CountryCard';
import RegionalDealCard from './RegionalDealCard';
import { REGION_COUNTRIES } from './planUtils';

// Region Section - 8 countries grid (2x4) + 1 regional deal card (50/50 split)
const RegionSection = memo(function RegionSection({ 
  region, 
  countries, 
  plans,
  countriesCount,
  plansLoading, 
  onCountrySelect, 
  onPlanClick, 
  t 
}) {
  const regionCountries = useMemo(() => {
    const regionCountryCodes = REGION_COUNTRIES[region] || [];
    return regionCountryCodes
      .map(code => countries.find(c => c.code === code || c.slug === code))
      .filter(Boolean)
      .slice(0, 8);
  }, [countries, region]);

  return (
    <div>
      {/* Desktop: 50% countries (2 cols x 4 rows) | 50% regional deal */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-4">
        {/* Countries Grid - 2 columns x 4 rows */}
        <div className="grid grid-cols-2 gap-3">
          {regionCountries.map((country) => (
            <CountryCard
              key={country.id}
              country={country}
              onClick={() => onCountrySelect(country)}
            />
          ))}
          {regionCountries.length < 8 && [...Array(8 - regionCountries.length)].map((_, i) => (
            <div key={`empty-${i}`} className="bg-gray-50 rounded-lg h-28 animate-pulse" />
          ))}
        </div>

        {/* Regional Deal Card - 50% */}
        <div>
          <RegionalDealCard
            region={region}
            plans={plans}
            countriesCount={countriesCount}
            onPlanClick={onPlanClick}
            t={t}
            isLoading={plansLoading}
          />
        </div>
      </div>

      {/* Mobile - Regional card first, then countries in 2x2 grid */}
      <div className="lg:hidden space-y-3">
        <RegionalDealCard
          region={region}
          plans={plans}
          countriesCount={countriesCount}
          onPlanClick={onPlanClick}
          t={t}
          isLoading={plansLoading}
        />
        <div className="grid grid-cols-2 gap-3">
          {regionCountries.slice(0, 4).map((country) => (
            <CountryCard
              key={country.id}
              country={country}
              onClick={() => onCountrySelect(country)}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default RegionSection;
