import { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';

// Fallback region mapping for countries
const regionMapping = {
  asia: ['JP', 'KR', 'CN', 'TH', 'SG', 'MY', 'ID', 'VN', 'PH', 'IN', 'KH', 'LA', 'MM', 'BD', 'NP', 'LK', 'MV', 'BT', 'TW', 'HK', 'MO', 'MN', 'KZ', 'UZ', 'TM', 'TJ', 'KG', 'AF', 'PK', 'BN', 'TL'],
  europe: ['GB', 'FR', 'DE', 'IT', 'ES', 'PT', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'IS', 'IE', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR', 'HR', 'SI', 'RS', 'BA', 'ME', 'MK', 'AL', 'XK', 'EE', 'LV', 'LT', 'UA', 'BY', 'MD', 'RU', 'MT', 'CY', 'LU', 'LI', 'MC', 'SM', 'VA', 'AD'],
  africa: ['EG', 'ZA', 'NG', 'KE', 'MA', 'TN', 'GH', 'ET', 'TZ', 'UG', 'DZ', 'SD', 'AO', 'MZ', 'CM', 'CI', 'NE', 'BF', 'ML', 'MW', 'ZM', 'SN', 'SO', 'TD', 'ZW', 'GN', 'RW', 'BJ', 'TG', 'SS', 'LY', 'LR', 'MR', 'CF', 'ER', 'GM', 'BW', 'GA', 'NA', 'MU', 'SZ', 'GW', 'LS', 'GQ', 'KM', 'CV', 'ST', 'SC', 'DJ', 'RE'],
  americas: ['US', 'CA', 'MX', 'BR', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 'GY', 'SR', 'GF', 'CR', 'PA', 'GT', 'HN', 'NI', 'SV', 'BZ', 'CU', 'DO', 'HT', 'JM', 'TT', 'BB', 'BS', 'GD', 'LC', 'VC', 'AG', 'DM', 'KN', 'PR', 'VI', 'AW', 'CW', 'BQ', 'SX', 'MF', 'GP', 'MQ', 'PM', 'BM', 'GL', 'FK'],
  oceania: ['AU', 'NZ', 'FJ', 'PG', 'NC', 'PF', 'SB', 'VU', 'WS', 'TO', 'KI', 'FM', 'MH', 'PW', 'NR', 'TV', 'CK', 'NU', 'TK', 'WF', 'AS', 'GU', 'MP', 'UM']
};

const popularCountryCodes = [
  'US', 'ES', 'FR', 'IT', 'GB', 'NL', 'BR', 'IN', 'CN', 'TH',
  'JP', 'AU', 'DE', 'CA', 'SG', 'MX', 'TR', 'AE', 'PT', 'GR',
];

export const useCountryFilters = (countries) => {
  const [selectedRegion, setSelectedRegion] = useState('popular');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [topPlansByRegion, setTopPlansByRegion] = useState({});
  const [regionConfig, setRegionConfig] = useState(null);

  // Fetch region config when selectedRegion changes
  useEffect(() => {
    const fetchRegionConfig = async () => {
      if (selectedRegion === 'all') {
        setRegionConfig(null);
        return;
      }

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('regions')
          .select('*')
          .eq('id', selectedRegion)
          .single();
        
        if (!error && data) {
          setRegionConfig(data);
        } else {
          setRegionConfig(null);
        }
      } catch {
        setRegionConfig(null);
      }
    };

    fetchRegionConfig();
  }, [selectedRegion]);

  // Fetch top plans for the popular region
  useEffect(() => {
    const fetchTopPlans = async () => {
      try {
        const supabase = getSupabase();
        const { data: popularRegion } = await supabase
          .from('regions')
          .select('top_plan_ids')
          .eq('id', 'popular')
          .single();

        if (popularRegion?.top_plan_ids?.length > 0) {
          const { data: plans } = await supabase
            .from('dataplans')
            .select('id, country_codes, country_code')
            .in('id', popularRegion.top_plan_ids);

          if (plans) {
            const countryCodes = new Set();
            plans.forEach(plan => {
              if (plan.country_codes && Array.isArray(plan.country_codes)) {
                plan.country_codes.forEach(code => countryCodes.add(code));
              } else if (plan.country_code) {
                countryCodes.add(plan.country_code);
              }
            });
            setTopPlansByRegion({ popular: Array.from(countryCodes) });
          }
        }
      } catch {
        // Silent
      }
    };

    fetchTopPlans();
  }, []);

  // Search function
  const searchCountries = async (term) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      if (countries && countries.length > 0) {
        const searchLower = term.toLowerCase();
        const results = countries.filter(country =>
          country.displayName?.toLowerCase().includes(searchLower) ||
          country.originalName?.toLowerCase().includes(searchLower) ||
          country.code?.toLowerCase().includes(searchLower) ||
          country.name?.toLowerCase().includes(searchLower)
        );
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchCountries(searchTerm);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, countries]);

  // Filter by region
  const filterByRegion = (countriesList) => {
    if (!countriesList || countriesList.length === 0) return [];
    if (searchTerm) return [...countriesList];

    if (regionConfig?.popular_countries?.length > 0) {
      const selected = regionConfig.popular_countries.map(code =>
        countriesList.find(c => c.code === code)
      ).filter(Boolean);
      if (selected.length > 0) return selected;
    }

    if (selectedRegion === 'popular') {
      if (topPlansByRegion.popular?.length > 0) {
        const popular = countriesList.filter(c => topPlansByRegion.popular.includes(c.code));
        if (popular.length > 0) return popular;
      }

      const flagged = countriesList.filter(c => c.is_popular === true);
      if (flagged.length > 0) return flagged;

      return countriesList.filter(c => popularCountryCodes.includes(c.code));
    } else if (selectedRegion !== 'all') {
      return countriesList.filter(country => {
        if (country.region === selectedRegion) return true;
        if (selectedRegion === 'americas' && ['north-america', 'south-america', 'latin-america'].includes(country.region)) return true;
        const regionCodes = regionMapping[selectedRegion] || [];
        return regionCodes.includes(country.code);
      });
    }

    return [...countriesList];
  };

  useEffect(() => {
    const countriesToFilter = searchTerm ? searchResults : countries;
    const filtered = filterByRegion(countriesToFilter);
    setFilteredCountries(filtered);
  }, [searchTerm, countries, searchResults, selectedRegion, topPlansByRegion, regionConfig]);

  return {
    selectedRegion,
    setSelectedRegion,
    searchTerm,
    setSearchTerm,
    filteredCountries,
    isSearching
  };
};
