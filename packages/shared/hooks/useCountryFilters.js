import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Fallback region mapping for countries (used when Firebase data is unavailable)
const regionMapping = {
  asia: ['JP', 'KR', 'CN', 'TH', 'SG', 'MY', 'ID', 'VN', 'PH', 'IN', 'KH', 'LA', 'MM', 'BD', 'NP', 'LK', 'MV', 'BT', 'TW', 'HK', 'MO', 'MN', 'KZ', 'UZ', 'TM', 'TJ', 'KG', 'AF', 'PK', 'BN', 'TL'],
  europe: ['GB', 'FR', 'DE', 'IT', 'ES', 'PT', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'IS', 'IE', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR', 'HR', 'SI', 'RS', 'BA', 'ME', 'MK', 'AL', 'XK', 'EE', 'LV', 'LT', 'UA', 'BY', 'MD', 'RU', 'MT', 'CY', 'LU', 'LI', 'MC', 'SM', 'VA', 'AD'],
  africa: ['EG', 'ZA', 'NG', 'KE', 'MA', 'TN', 'GH', 'ET', 'TZ', 'UG', 'DZ', 'SD', 'AO', 'MZ', 'CM', 'CI', 'NE', 'BF', 'ML', 'MW', 'ZM', 'SN', 'SO', 'TD', 'ZW', 'GN', 'RW', 'BJ', 'TG', 'SS', 'LY', 'LR', 'MR', 'CF', 'ER', 'GM', 'BW', 'GA', 'NA', 'MU', 'SZ', 'GW', 'LS', 'GQ', 'KM', 'CV', 'ST', 'SC', 'DJ', 'RE'],
  americas: ['US', 'CA', 'MX', 'BR', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY', 'GY', 'SR', 'GF', 'CR', 'PA', 'GT', 'HN', 'NI', 'SV', 'BZ', 'CU', 'DO', 'HT', 'JM', 'TT', 'BB', 'BS', 'GD', 'LC', 'VC', 'AG', 'DM', 'KN', 'PR', 'VI', 'AW', 'CW', 'BQ', 'SX', 'MF', 'GP', 'MQ', 'PM', 'BM', 'GL', 'FK'],
  oceania: ['AU', 'NZ', 'FJ', 'PG', 'NC', 'PF', 'SB', 'VU', 'WS', 'TO', 'KI', 'FM', 'MH', 'PW', 'NR', 'TV', 'CK', 'NU', 'TK', 'WF', 'AS', 'GU', 'MP', 'UM']
};

// Fallback popular tourist destinations (used when Firebase data is unavailable)
const popularCountryCodes = [
  'US',  // United States
  'ES',  // Spain
  'FR',  // France
  'IT',  // Italy
  'GB',  // United Kingdom
  'NL',  // Netherlands
  'BR',  // Brazil
  'IN',  // India
  'CN',  // China
  'TH',  // Thailand
  'JP',  // Japan
  'AU',  // Australia
  'DE',  // Germany
  'CA',  // Canada
  'SG',  // Singapore
  'MX',  // Mexico
  'TR',  // Turkey
  'AE',  // United Arab Emirates
  'PT',  // Portugal
  'GR',  // Greece
];

export const useCountryFilters = (countries) => {
  const [selectedRegion, setSelectedRegion] = useState('popular');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [topPlansByRegion, setTopPlansByRegion] = useState({});

  // State for region configuration
  const [regionConfig, setRegionConfig] = useState(null);

  // Fetch region config when selectedRegion changes
  useEffect(() => {
    const fetchRegionConfig = async () => {
      if (selectedRegion === 'all') {
        setRegionConfig(null);
        return;
      }

      try {
        const regionDoc = await getDoc(doc(db, 'regions', selectedRegion));
        if (regionDoc.exists()) {
          setRegionConfig(regionDoc.data());
        } else {
          setRegionConfig(null);
        }
      } catch (error) {
        console.error('Error fetching region configuration:', error);
        setRegionConfig(null);
      }
    };

    fetchRegionConfig();
  }, [selectedRegion]);

  // Fetch top plans for the popular region (Legacy support or if needed for other logic)
  useEffect(() => {
    const fetchTopPlans = async () => {
      try {
        const popularRegionDoc = await getDoc(doc(db, 'regions', 'popular'));
        if (popularRegionDoc.exists()) {
          const data = popularRegionDoc.data();
          if (data.topPlanIds && data.topPlanIds.length > 0) {
            // Fetch the plans data
            const plansPromises = data.topPlanIds.map(planId =>
              getDoc(doc(db, 'dataplans', planId))
            );
            const plansSnapshots = await Promise.all(plansPromises);
            const plans = plansSnapshots
              .filter(snap => snap.exists())
              .map(snap => ({ id: snap.id, ...snap.data() }));

            // Extract country codes from plans
            const countryCodes = new Set();
            plans.forEach(plan => {
              if (plan.country_codes && Array.isArray(plan.country_codes)) {
                plan.country_codes.forEach(code => countryCodes.add(code));
              } else if (plan.country_code) {
                countryCodes.add(plan.country_code);
              }
            });

            setTopPlansByRegion({
              popular: Array.from(countryCodes)
            });
          }
        }
      } catch (error) {
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
        const results = countries.filter(country => {
          const searchLower = term.toLowerCase();
          return (
            country.displayName?.toLowerCase().includes(searchLower) ||
            country.originalName?.toLowerCase().includes(searchLower) ||
            country.code?.toLowerCase().includes(searchLower) ||
            country.name?.toLowerCase().includes(searchLower)
          );
        });

        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  // Handle search with debounce
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

    // If searching, don't apply region filters
    if (searchTerm) {
      return [...countriesList];
    }

    // 1. Check for manually defined "Popular Countries" in region config
    // This applies to ANY region (Asia, Europe, Popular, etc.) if configured in Admin
    if (regionConfig && regionConfig.popularCountries && regionConfig.popularCountries.length > 0) {
      // Map codes to actual country objects
      const selectedCountries = regionConfig.popularCountries.map(code =>
        countriesList.find(c => c.code === code)
      ).filter(Boolean);

      if (selectedCountries.length > 0) {
        return selectedCountries;
      }
    }

    // Filter by selected region
    if (selectedRegion === 'popular') {
      // First, try using topPlanIds from Firebase regions collection (Legacy)
      if (topPlansByRegion.popular && topPlansByRegion.popular.length > 0) {
        const popularCountries = countriesList.filter(country =>
          topPlansByRegion.popular.includes(country.code)
        );

        if (popularCountries.length > 0) {
          return popularCountries;
        }
      }

      // Fallback 1: Check if country has is_popular flag from Firebase
      const popularFlaggedCountries = countriesList.filter(country =>
        country.is_popular === true
      );

      if (popularFlaggedCountries.length > 0) {
        return popularFlaggedCountries;
      }

      // Fallback 2: Use hardcoded list
      return countriesList.filter(country =>
        popularCountryCodes.includes(country.code)
      );
    } else if (selectedRegion !== 'all') {
      // First try using the region field from Firebase
      const filtered = countriesList.filter(country => {
        if (country.region === selectedRegion) return true;

        // Handle Americas mapping
        if (selectedRegion === 'americas' && (country.region === 'north-america' || country.region === 'south-america' || country.region === 'latin-america')) {
          return true;
        }

        // Fallback to hardcoded mapping if no region field
        const regionCodes = regionMapping[selectedRegion] || [];
        return regionCodes.includes(country.code);
      });
      return filtered;
    }

    return [...countriesList];
  };

  // Apply filters whenever dependencies change
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
