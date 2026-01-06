import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

/**
 * Hook to filter countries with Supabase support
 * All data comes from Supabase - no hardcoded fallbacks
 *
 * @param {Array} countries - Array of countries to filter
 * @returns {Object} Filter state and functions
 */
export const useCountryFiltersSupabase = (countries) => {
  const [selectedRegion, setSelectedRegion] = useState('popular');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [regionConfig, setRegionConfig] = useState(null);

  // Fetch region configuration from Supabase
  useEffect(() => {
    const fetchRegionConfig = async () => {
      if (selectedRegion === 'all' || !isSupabaseAvailable()) {
        setRegionConfig(null);
        return;
      }

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('regions')
          .select(`
            *,
            region_countries:countries!region_id (
              id,
              iso_code,
              is_popular
            )
          `)
          .eq('id', selectedRegion)
          .single();

        if (!error && data) {
          // Build popularCountries array from the joined countries
          const popularCountries = data.region_countries
            ?.filter(c => c.is_popular)
            ?.map(c => c.iso_code || c.id.toUpperCase()) || [];

          setRegionConfig({
            ...data,
            popularCountries: popularCountries.length > 0 ? popularCountries : null
          });
        } else {
          setRegionConfig(null);
        }
      } catch (error) {
        console.error('Error fetching region config from Supabase:', error);
        setRegionConfig(null);
      }
    };

    fetchRegionConfig();
  }, [selectedRegion]);

  // Search countries locally (client-side filtering)
  const searchCountries = useCallback((term) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    if (countries && countries.length > 0) {
      const searchLower = term.toLowerCase();
      const results = countries.filter(country => {
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

    setIsSearching(false);
  }, [countries]);

  // Debounced search
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
  }, [searchTerm, searchCountries]);

  // Filter countries by region - Supabase data only, no hardcoded fallbacks
  const filterByRegion = useCallback((countriesList) => {
    if (!countriesList || countriesList.length === 0) return [];

    // If searching, return search results without region filter
    if (searchTerm) {
      return [...countriesList];
    }

    // 1. Check for manually defined popular countries in region config
    if (regionConfig?.popularCountries && regionConfig.popularCountries.length > 0) {
      const selectedCountries = regionConfig.popularCountries
        .map(code => countriesList.find(c => c.code === code))
        .filter(Boolean);

      if (selectedCountries.length > 0) {
        return selectedCountries;
      }
    }

    // Filter by explicit region_id ONLY - NO hardcoded special cases
    // All region logic is controlled by Supabase data
    const filtered = countriesList.filter(country => {
      // Only include countries with plans
      if ((country.planCount || 0) === 0) return false;

      // Check country's region field (normalized to lowercase)
      const countryRegion = (country.region || '').toLowerCase();
      const countryRegionId = (country.region_id || '').toLowerCase();
      const targetRegion = selectedRegion.toLowerCase();

      // ONLY use explicit region_id matching - NO hardcoded mappings
      if (countryRegion === targetRegion) return true;
      if (countryRegionId === targetRegion) return true;

      return false;
    });

    return filtered;
  }, [selectedRegion, regionConfig, searchTerm]);

  // Apply filters when dependencies change
  useEffect(() => {
    const countriesToFilter = searchTerm ? searchResults : countries;
    const filtered = filterByRegion(countriesToFilter);
    setFilteredCountries(filtered);
  }, [searchTerm, countries, searchResults, filterByRegion]);

  // Get available regions based on countries (from Supabase data)
  const availableRegions = useMemo(() => {
    const regions = new Set();
    countries?.forEach(country => {
      if (country.region) {
        regions.add(country.region);
      }
      if (country.region_id) {
        regions.add(country.region_id);
      }
    });
    return Array.from(regions);
  }, [countries]);

  return {
    selectedRegion,
    setSelectedRegion,
    searchTerm,
    setSearchTerm,
    filteredCountries,
    isSearching,
    regionConfig,
    availableRegions
  };
};

export default useCountryFiltersSupabase;
