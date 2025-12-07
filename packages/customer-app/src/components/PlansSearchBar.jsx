'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import Image from 'next/image';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useCountries } from '@esim/shared/hooks/useCountries';
import { getISOCode } from '@esim/shared/utils/countryCodeMap';

const PlansSearchBar = ({ searchTerm, onSearchChange, onCountrySelect }) => {
  const { t, locale } = useI18n();
  const { countries } = useCountries(locale);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Only show dropdown after component is mounted to prevent hydration errors
  const canShowDropdown = mounted && showDropdown && filteredCountries.length > 0;

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
    if (!searchTerm || searchTerm.length < 2) {
      setFilteredCountries([]);
      setShowDropdown(false);
      return;
    }

    const normalizedSearch = searchTerm.toLowerCase().trim();
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

    setFilteredCountries(matches.slice(0, 8)); // Limit to 8 results
    setShowDropdown(matches.length > 0);
  }, [searchTerm, countries]);

  const handleCountryClick = (country) => {
    if (onCountrySelect) {
      onCountrySelect(country);
    } else {
      onSearchChange(country.displayName);
    }
    setShowDropdown(false);
  };

  const handleClearSearch = () => {
    onSearchChange('');
    setShowDropdown(false);
  };

  return (
    <div className="flex flex-col md:flex-row gap-3 lg:gap-4 mb-6 lg:mb-8 max-w-4xl mx-auto">
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-4 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 z-10" />
        <input
          ref={inputRef}
          type="text"
          placeholder={t('plans.searchPlaceholder', 'Search countries...')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => {
            if (filteredCountries.length > 0) {
              setShowDropdown(true);
            }
          }}
          className="w-full pl-10 pr-10 py-2 lg:py-3 border-0 shadow-lg rounded-full border-4 border-gray-200/40 focus:ring-2 focus:ring-blue-200/20 focus:border-transparent"
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 z-10"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

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
                {/* Country Flag - Rounded with 4:3 aspect ratio */}
                <div className="flex-shrink-0 w-12 aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden">
                  {country.photo && country.photo.includes('firebasestorage') ? (
                    <div className="relative w-full h-full">
                      <Image 
                        src={country.photo} 
                        alt={country.displayName}
                        fill
                        sizes="48px"
                        className="object-cover"
                        quality={90}
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <img
                      src={`/flags/4x3/${getISOCode(country.code)}.svg`}
                      alt={`${country.displayName} flag`}
                      width="48"
                      height="36"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
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
    </div>
  );
};

export default PlansSearchBar;

