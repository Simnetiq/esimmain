/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useCountries } from '@esim/shared/hooks/useCountries';
import Image from 'next/image';

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
        <Search className="absolute start-4 top-4 w-4 h-4 sm:w-5 sm:h-5 text-text-muted z-10" />
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
          className="w-full ps-10 pe-10 py-2 lg:py-3 rounded-full shadow-lg text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-tufts-blue/20 focus:border-transparent"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--card-border)' }}
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute end-4 top-4 text-text-muted hover:text-text-primary z-10"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Search Dropdown - Positioned absolutely to not affect layout */}
        {canShowDropdown && (
          <div
            ref={dropdownRef}
            className="absolute inset-x-0 top-full mt-2 rounded-lg max-h-80 overflow-y-auto z-[100]"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--card-border)',
              boxShadow: '0 20px 25px -5px var(--shadow-color), 0 8px 10px -6px var(--shadow-color)'
            }}
          >
            {filteredCountries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountryClick(country)}
                className="w-full px-4 py-3 flex items-center gap-3 transition-colors text-start last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
                style={{ borderBottom: '1px solid var(--subtle-border)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {/* Country Image - 4:3 aspect ratio */}
                <div className="flex-shrink-0 w-12 aspect-[4/3] rounded-lg flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--subtle-bg)', border: '1px solid var(--subtle-border)' }}>
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
                  <div className="text-sm font-medium text-text-primary">
                    {country.displayName}
                  </div>
                  <div className="text-xs text-text-muted">
                    {country.code}
                    {country.minPrice && (
                      <span className="ms-2">
                        • From ${country.minPrice}
                      </span>
                    )}
                  </div>
                </div>
                <MapPin className="w-4 h-4 text-text-muted flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlansSearchBar;

