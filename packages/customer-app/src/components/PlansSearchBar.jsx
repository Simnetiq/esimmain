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
    <div className="flex flex-col md:flex-row gap-3 lg:gap-4 mb-6 lg:mb-8 max-w-3xl mx-auto">
      <div className="flex-1 relative group">
        {/* Search icon with focus-aware color transition */}
        <Search
          className="absolute start-5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] z-10 transition-colors duration-200"
          style={{ color: 'var(--text-muted)' }}
        />
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
          className="w-full ps-12 pe-12 py-3.5 lg:py-4 rounded-2xl text-[15px] lg:text-base transition-all duration-200 outline-none"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1.5px solid var(--subtle-border)',
            color: 'var(--text-primary)',
            boxShadow: '0 1px 3px 0 var(--shadow-color)',
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = 'var(--tufts-blue)';
            e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--tufts-blue) 12%, transparent), 0 4px 12px -2px var(--shadow-color)';
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = 'var(--subtle-border)';
            e.currentTarget.style.boxShadow = '0 1px 3px 0 var(--shadow-color)';
          }}
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute end-4 top-1/2 -translate-y-1/2 p-1 rounded-full z-10 transition-all duration-150"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Search Dropdown */}
        {canShowDropdown && (
          <div
            ref={dropdownRef}
            className="absolute inset-x-0 top-full mt-2 rounded-2xl max-h-[360px] overflow-y-auto overflow-x-hidden z-[100] py-1.5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 85%, transparent)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--subtle-border)',
              boxShadow: '0 12px 40px -8px var(--shadow-color), 0 4px 12px -4px var(--shadow-color)',
            }}
          >
            {filteredCountries.map((country, index) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountryClick(country)}
                className="w-full px-3.5 py-2.5 mx-1.5 flex items-center gap-3 transition-all duration-150 text-start rounded-xl"
                style={{
                  width: 'calc(100% - 12px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* Country flag image */}
                <div
                  className="flex-shrink-0 w-10 h-7 rounded-md flex items-center justify-center overflow-hidden"
                  style={{
                    backgroundColor: 'var(--subtle-bg)',
                    border: '1px solid var(--subtle-border)',
                  }}
                >
                  {country.image?.url && (
                    <div className="relative w-full h-full">
                      <Image
                        src={country.image.url}
                        alt={country.displayName}
                        fill
                        sizes="40px"
                        className="object-cover"
                        quality={90}
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-medium leading-snug"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {country.displayName}
                  </div>
                  <div
                    className="text-xs leading-snug mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {country.code}
                    {country.minPrice && (
                      <span className="ms-1.5">
                        · From ${country.minPrice}
                      </span>
                    )}
                  </div>
                </div>
                <MapPin
                  className="w-3.5 h-3.5 flex-shrink-0 opacity-40"
                  style={{ color: 'var(--text-muted)' }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlansSearchBar;

