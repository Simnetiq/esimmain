'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import { useCountries } from '@esim/shared/hooks/useCountries';

const CountrySearchBar = ({ onSearch = false, onCountrySelect = null }) => {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  
  // Use the useCountries hook to get all countries
  const { countries } = useCountries(locale);
  
  // Prevent hydration mismatch by only checking RTL on client
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Check if current locale is RTL - only after mount
  const isRTL = mounted ? (locale === 'ar' || locale === 'he') : false;
  
  // Only show dropdown after component is mounted to prevent hydration errors
  const canShowDropdown = mounted && showDropdown && filteredCountries.length > 0;

  // Get popular countries from the countries list
  const popularCountries = React.useMemo(() => {
    if (!countries || countries.length === 0) return [];
    
    // Filter countries marked as popular
    const popular = countries.filter(c => c.is_popular === true);
    
    // If we have popular countries, return them limited to 14
    if (popular.length > 0) {
      return popular.slice(0, 14);
    }
    
    // Fallback: return first 14 countries sorted by minPrice
    return countries
      .filter(c => c.minPrice)
      .sort((a, b) => (a.minPrice || 999) - (b.minPrice || 999))
      .slice(0, 14);
  }, [countries]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter countries based on search
  useEffect(() => {
    if (!searchValue || searchValue.length < 2) {
      setFilteredCountries([]);
      setShowDropdown(false);
      return;
    }

    const normalizedSearch = searchValue.toLowerCase().trim();
    const matches = countries.filter(country => {
      // Search in display name
      if (country.displayName?.toLowerCase().includes(normalizedSearch)) {
        return true;
      }
      // Search in original name
      if (country.originalName?.toLowerCase().includes(normalizedSearch)) {
        return true;
      }
      // Search in code
      if (country.code?.toLowerCase().includes(normalizedSearch)) {
        return true;
      }
      // Search in all translations
      if (country.translations) {
        for (const translation of Object.values(country.translations)) {
          if (translation?.toLowerCase().includes(normalizedSearch)) {
            return true;
          }
        }
      }
      return false;
    });

    const limitedMatches = matches.slice(0, 8);
    
    setFilteredCountries(limitedMatches); // Limit to 8 results
    setShowDropdown(limitedMatches.length > 0);
  }, [searchValue, countries, mounted]);

  const handleCountryClick = (country) => {
    // Track country selection
    trackCustomFacebookEvent('CountrySelected', {
      country_name: country.displayName,
      country_code: country.code,
      content_category: 'country_search_dropdown',
      source: 'hero_search_dropdown',
      selection_type: 'dropdown',
      event_category: 'engagement',
      timestamp: new Date().toISOString()
    });

    if (onCountrySelect) {
      // If we have a callback, use it to open the country modal
      onCountrySelect({ 
        code: country.code, 
        name: country.displayName 
      });
      setSearchValue('');
      setShowDropdown(false);
    } else {
      // Navigate to plans page with search
      setSearchValue(country.displayName);
      setShowDropdown(false);
      
      // Force English language for search
      if (typeof window !== 'undefined') {
        localStorage.setItem('Simnetiq-language', 'en');
      }
      
      const searchUrl = `/esim-plans?search=${encodeURIComponent(country.displayName)}`;
      router.push(searchUrl);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    
    const searchTerm = searchValue.trim();
    
    // Track search event with Facebook Pixel
    if (searchTerm) {
      trackCustomFacebookEvent('Search', {
        search_string: searchTerm,
        content_category: 'country_search',
        source: 'hero_search_bar',
        event_category: 'search',
        timestamp: new Date().toISOString()
      });
    }
    
    // If there's exactly one match, select it
    if (filteredCountries.length === 1) {
      handleCountryClick(filteredCountries[0]);
      return;
    }
    
    // Close dropdown
    setShowDropdown(false);
    
    // Force English language for search
    if (typeof window !== 'undefined') {
      localStorage.setItem('Simnetiq-language', 'en');
    }
    
    if (searchTerm) {
      // Always use English URL for search
      const searchUrl = `/esim-plans?search=${encodeURIComponent(searchTerm)}`;
      router.push(searchUrl);
      
      // Also call onSearch callback if provided
      if (onSearch) {
        onSearch(searchTerm);
      }
    } else {
      // Always navigate to English plans page
      router.push('/esim-plans');
    }
  };

  const handleInputChange = (e) => {
    setSearchValue(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  return (
    <div className="w-full max-w-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Search Bar - Wrapper with relative for dropdown positioning */}
      <div className="relative">
        <form onSubmit={handleSearch} className="relative">
          <div className="relative group">
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              onFocus={() => {
                if (filteredCountries.length > 0) {
                  setShowDropdown(true);
                }
              }}
              placeholder={`${t('hero.countriesAvailable', 'Now available in 202+ countries')}`}
              className={`w-full ${isRTL ? 'pl-12 sm:pl-16 pr-6' : 'pr-14 sm:pr-16 pl-6'} text-base sm:text-lg border-1 border-gray-200/40 rounded-lg transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-blue-200/10 bg-white/70 focus:border-blue-200/20 backdrop-blur-md placeholder:text-gray-500 focus:ring-blue-200/20 placeholder:font-medium outline-none ${isRTL ? 'text-right' : 'text-left'}`}
            />
            <button
              type="submit"
              className={`absolute ${isRTL ? 'left-2 sm:left-3' : 'right-2 sm:right-3'} top-1/2 transform -translate-y-1/2 bg-white/80 backdrop-blur-md p-1 rounded-sm`}
              aria-label="Search"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </button>
          </div>
        </form>

        {/* Search Dropdown - Positioned absolutely to not affect layout */}
        {canShowDropdown && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-2xl max-h-80 overflow-y-auto z-[100]"
            style={{ 
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' 
            }}
          >
            {filteredCountries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountryClick(country)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
              >
                {/* Country Image - 4:3 aspect ratio */}
                <div className="flex-shrink-0 w-12 aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden">
                  {country.image?.url && (
                    <div className="relative w-full h-full">
                      <Image
                        src={country.image.url}
                        alt={country.displayName}
                        fill
                        sizes="48px"
                        className="object-cover"
                        quality={90}
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {country.displayName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {country.code}
                    {country.minPrice && (
                      <span className="ml-2">
                        • From ${country.minPrice}
                      </span>
                    )}
                  </div>
                </div>
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Popular Countries Suggestions - From Firebase */}
      {mounted && popularCountries.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-start gap-2">
          {popularCountries.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => {
                // Track country selection with Facebook Pixel
                trackCustomFacebookEvent('CountrySelected', {
                  country_name: country.displayName,
                  country_code: country.code,
                  content_category: 'popular_country',
                  source: 'hero_quick_select',
                  selection_type: 'quick_button',
                  event_category: 'engagement',
                  timestamp: new Date().toISOString()
                });
                
                // If onCountrySelect callback is provided, use it to open the country modal
                if (onCountrySelect && country.code) {
                  onCountrySelect({ 
                    code: country.code, 
                    name: country.displayName 
                  });
                } else {
                  // Fallback to search navigation
                  setSearchValue(country.displayName);
                  // Force English language
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('Simnetiq-language', 'en');
                  }
                  setTimeout(() => {
                    // Always use English URL
                    const searchUrl = `/esim-plans?search=${encodeURIComponent(country.displayName)}`;
                    router.push(searchUrl);
                  }, 100);
                }
              }}
              className="flex items-center gap-1.5 text-xs sm:text-sm px-2 py-1 rounded-sm bg-white/20 hover:shadow-sm hover:shadow-blue-200/60 transition-all duration-200 text-gray-700 hover:text-cobalt-blue font-bold"
            >
              {/* Small Image */}
              <div className="flex-shrink-0 w-5 aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 rounded flex items-center justify-center border border-gray-200/50 overflow-hidden">
                {country.image?.url && (
                  <div className="relative w-full h-full">
                    <Image
                      src={country.image.url}
                      alt={country.displayName}
                      fill
                      sizes="20px"
                      className="object-cover"
                      quality={90}
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
              {country.displayName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CountrySearchBar;
