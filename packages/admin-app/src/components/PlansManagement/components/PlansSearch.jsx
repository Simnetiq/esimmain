'use client';

import React from 'react';
import { Search, Filter, X, RefreshCw } from 'lucide-react';
import { getFlagEmoji, DATA_SOURCES } from '../utils/helpers';

/**
 * Search bar, country filter, and Apply Filters button
 */
const PlansSearch = ({
  searchTerm,
  onSearchChange,
  selectedCountry,
  onCountryChange,
  selectedCategory,
  onCategoryChange,
  hasSmsFilter,
  onSmsFilterChange,
  hasVoiceFilter,
  onVoiceFilterChange,
  // Countries lists
  availableCountries = [],
  airaloCountries = [],
  supabaseCountries = [],
  // Filter state
  filtersChanged,
  appliedFilters,
  onApplyFilters,
  onClearFilters,
  // Loading state
  loading,
  // Context
  dataSource,
  isRTL,
  t
}) => {
  // Select countries based on data source
  const getCountriesList = () => {
    if (dataSource === DATA_SOURCES.SUPABASE) {
      return supabaseCountries;
    }
    if (dataSource === DATA_SOURCES.AIRALO) {
      return airaloCountries;
    }
    return availableCountries.map(code => ({ id: code, name: code }));
  };

  const countries = getCountriesList();
  const isSupabase = dataSource === DATA_SOURCES.SUPABASE;

  // Check if any filters are applied
  const hasAppliedFilters = appliedFilters && (
    appliedFilters.search ||
    appliedFilters.country ||
    appliedFilters.category !== 'all' ||
    appliedFilters.hasSms ||
    appliedFilters.hasVoice
  );

  // Handle Enter key in search
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && isSupabase && filtersChanged) {
      onApplyFilters();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      {/* Search and Country Row */}
      <div className={`flex flex-col sm:flex-row sm:items-center gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5`} />
          <input
            type="text"
            placeholder={t?.('plansManagement.searchPlans', 'Search plans by name...') || 'Search plans by name...'}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
            style={{ textAlign: isRTL ? 'right' : 'left', direction: isRTL ? 'rtl' : 'ltr' }}
          />
        </div>

        {/* Country Filter */}
        <div className={`flex gap-3 items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
          <select
            value={selectedCountry}
            onChange={(e) => onCountryChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[200px]"
            style={{ textAlign: isRTL ? 'right' : 'left', direction: isRTL ? 'rtl' : 'ltr' }}
          >
            <option value="">{t?.('plansManagement.allCountries', 'All Countries') || 'All Countries'}</option>
            {countries.length > 0 ? (
              countries.map(country => {
                const id = country.id || country.code || country;
                const name = country.name || id;
                const iso = country.iso || country.code || id;
                return (
                  <option key={id} value={id}>
                    {getFlagEmoji(iso)} {name}
                  </option>
                );
              })
            ) : (
              <option value="" disabled>
                {t?.('plansManagement.noCountriesFound', 'No countries found') || 'No countries found'}
              </option>
            )}
          </select>
        </div>
      </div>

      {/* Supabase Filters Row */}
      {isSupabase && (
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Categories</option>
              <option value="country">Country Plans</option>
              <option value="regional">Regional Plans</option>
              <option value="global">Global Plans</option>
            </select>
          </div>

          {/* SMS Filter */}
          <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-50">
            <input
              type="checkbox"
              checked={hasSmsFilter}
              onChange={(e) => onSmsFilterChange(e.target.checked)}
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-600">Has SMS</span>
          </label>

          {/* Voice Filter */}
          <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-50">
            <input
              type="checkbox"
              checked={hasVoiceFilter}
              onChange={(e) => onVoiceFilterChange(e.target.checked)}
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-600">Has Voice</span>
          </label>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Clear Filters Button */}
          {hasAppliedFilters && (
            <button
              onClick={onClearFilters}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}

          {/* Apply Filters Button */}
          <button
            onClick={onApplyFilters}
            disabled={loading || !filtersChanged}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              filtersChanged
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                {filtersChanged ? 'Apply Filters' : 'Filters Applied'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Applied Filters Summary */}
      {isSupabase && hasAppliedFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">Active filters:</span>
          {appliedFilters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800 rounded-full">
              Search: "{appliedFilters.search}"
            </span>
          )}
          {appliedFilters.country && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
              Country: {appliedFilters.country}
            </span>
          )}
          {appliedFilters.category && appliedFilters.category !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
              Category: {appliedFilters.category}
            </span>
          )}
          {appliedFilters.hasSms && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full">
              Has SMS
            </span>
          )}
          {appliedFilters.hasVoice && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs bg-teal-100 text-teal-800 rounded-full">
              Has Voice
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PlansSearch;
