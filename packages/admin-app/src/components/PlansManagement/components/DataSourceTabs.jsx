'use client';

import React from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { DATA_SOURCES } from '../utils/helpers';

/**
 * Data source toggle tabs — Supabase (primary) and Airalo (live API comparison)
 */
const DataSourceTabs = ({
  dataSource,
  onDataSourceChange,
  airaloPlansCount,
  supabasePlansCount,
  loadingAiralo,
  loadingSupabase,
  onLoadAiralo,
  onLoadSupabase,
  isRTL
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className={`flex items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Left: tabs */}
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span className="text-sm font-medium text-gray-500">Source:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onDataSourceChange(DATA_SOURCES.SUPABASE)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dataSource === DATA_SOURCES.SUPABASE
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Supabase ({supabasePlansCount})
            </button>
            <button
              onClick={() => onDataSourceChange(DATA_SOURCES.AIRALO)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dataSource === DATA_SOURCES.AIRALO
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Live Airalo ({airaloPlansCount})
            </button>
          </div>
        </div>

        {/* Right: refresh button */}
        {dataSource === DATA_SOURCES.SUPABASE ? (
          <button
            onClick={onLoadSupabase}
            disabled={loadingSupabase}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
          >
            {loadingSupabase ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Database className="w-3.5 h-3.5" />
            )}
            {loadingSupabase ? 'Loading...' : 'Refresh'}
          </button>
        ) : (
          <button
            onClick={onLoadAiralo}
            disabled={loadingAiralo}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {loadingAiralo ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {loadingAiralo ? 'Loading...' : 'Fetch from API'}
          </button>
        )}
      </div>
    </div>
  );
};

export default DataSourceTabs;
