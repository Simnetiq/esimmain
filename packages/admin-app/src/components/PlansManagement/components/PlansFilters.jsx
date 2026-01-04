'use client';

import React from 'react';
import {
  Filter,
  Smartphone,
  Globe,
  MapPin,
  Flag,
  MessageSquare,
  Phone
} from 'lucide-react';
import { PLAN_CATEGORIES } from '../utils/helpers';

/**
 * Category tabs and feature filters (SMS/Voice)
 * Hidden when Supabase is selected (server-side filtering)
 */
const PlansFilters = ({
  selectedCategory,
  onCategoryChange,
  hasSmsFilter,
  onSmsFilterChange,
  hasVoiceFilter,
  onVoiceFilterChange,
  filteredCount,
  dataSource
}) => {
  // Don't show for Supabase - filters are handled differently
  if (dataSource === 'supabase') {
    return null;
  }

  const clearAllFilters = () => {
    onCategoryChange(PLAN_CATEGORIES.ALL);
    onSmsFilterChange(false);
    onVoiceFilterChange(false);
  };

  const hasActiveFilters = selectedCategory !== PLAN_CATEGORIES.ALL || hasSmsFilter || hasVoiceFilter;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex flex-col gap-4">
        {/* Plan Type Tabs */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Plan Type:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onCategoryChange(PLAN_CATEGORIES.ALL)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                selectedCategory === PLAN_CATEGORIES.ALL
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              All Plans
            </button>
            <button
              onClick={() => onCategoryChange(PLAN_CATEGORIES.GLOBAL)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                selectedCategory === PLAN_CATEGORIES.GLOBAL
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Globe className="w-4 h-4 text-blue-500" />
              Global
            </button>
            <button
              onClick={() => onCategoryChange(PLAN_CATEGORIES.REGIONAL)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                selectedCategory === PLAN_CATEGORIES.REGIONAL
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MapPin className="w-4 h-4 text-green-500" />
              Regional
            </button>
            <button
              onClick={() => onCategoryChange(PLAN_CATEGORIES.COUNTRY)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                selectedCategory === PLAN_CATEGORIES.COUNTRY
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Flag className="w-4 h-4 text-orange-500" />
              Country
            </button>
          </div>
        </div>

        {/* SMS/Voice Filters */}
        <div className="flex items-center gap-4 border-t border-gray-100 pt-4">
          <span className="text-sm font-medium text-gray-700">Features:</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasSmsFilter}
              onChange={(e) => onSmsFilterChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <MessageSquare className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-600">Has SMS</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasVoiceFilter}
              onChange={(e) => onVoiceFilterChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <Phone className="w-4 h-4 text-teal-500" />
            <span className="text-sm text-gray-600">Has Voice/Calls</span>
          </label>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="ml-auto px-3 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* Category Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
          <span>
            Showing: <strong className="text-gray-700">{filteredCount}</strong> plans
          </span>
          {selectedCategory !== PLAN_CATEGORIES.ALL && (
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
              {selectedCategory === PLAN_CATEGORIES.GLOBAL && '🌍 Global Plans'}
              {selectedCategory === PLAN_CATEGORIES.REGIONAL && '🗺️ Regional Plans'}
              {selectedCategory === PLAN_CATEGORIES.COUNTRY && '🏳️ Country Plans'}
            </span>
          )}
          {hasSmsFilter && (
            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full">
              💬 With SMS
            </span>
          )}
          {hasVoiceFilter && (
            <span className="px-2 py-1 bg-teal-50 text-teal-700 rounded-full">
              📞 With Voice
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlansFilters;
