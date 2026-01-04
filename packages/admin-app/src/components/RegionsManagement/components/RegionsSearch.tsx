'use client';

import React from 'react';
import { Search, Filter, X, Eye, EyeOff } from 'lucide-react';
import { getRegionTypes } from '../../../services/regionService';

interface RegionsSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  showInactive: boolean;
  onShowInactiveChange: (value: boolean) => void;
  filtersChanged: boolean;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  loading: boolean;
  isRTL: boolean;
}

const RegionsSearch: React.FC<RegionsSearchProps> = ({
  searchTerm,
  onSearchChange,
  selectedType,
  onTypeChange,
  showInactive,
  onShowInactiveChange,
  filtersChanged,
  onApplyFilters,
  onClearFilters,
  loading,
  isRTL
}) => {
  const regionTypes = getRegionTypes();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5`} />
          <input
            type="text"
            placeholder="Search regions by name..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>

        {/* Type Filter */}
        <div className="relative min-w-[150px]">
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full appearance-none px-4 py-2.5 pr-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {regionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        </div>

        {/* Show Inactive Toggle */}
        <button
          onClick={() => onShowInactiveChange(!showInactive)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
            showInactive
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {showInactive ? (
            <>
              <Eye className="w-4 h-4" />
              <span className="text-sm">Showing Inactive</span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" />
              <span className="text-sm">Hide Inactive</span>
            </>
          )}
        </button>

        {/* Apply Filters Button */}
        <button
          onClick={onApplyFilters}
          disabled={!filtersChanged || loading}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
            filtersChanged
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Filter className="w-4 h-4" />
          Apply
        </button>

        {/* Clear Filters Button */}
        <button
          onClick={onClearFilters}
          className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      </div>
    </div>
  );
};

export default RegionsSearch;
