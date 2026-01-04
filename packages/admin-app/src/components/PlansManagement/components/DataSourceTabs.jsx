'use client';

import React from 'react';
import { RefreshCw, Database } from 'lucide-react';
import { DATA_SOURCES } from '../utils/helpers';

/**
 * Data source toggle tabs with load buttons
 */
const DataSourceTabs = ({
  dataSource,
  onDataSourceChange,
  allPlansCount,
  airaloPlansCount,
  topupsCount,
  supabasePlansCount,
  // Loading states
  loadingAiralo,
  loadingTopups,
  loadingSupabase,
  // Callbacks
  onLoadAiralo,
  onLoadTopups,
  onLoadSupabase,
  isRTL
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex flex-col gap-4">
        {/* Data Source Toggle */}
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-sm font-medium text-gray-700">Data Source:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onDataSourceChange(DATA_SOURCES.SUPABASE)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  dataSource === DATA_SOURCES.SUPABASE
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Supabase ({supabasePlansCount})
              </button>
              <button
                onClick={() => onDataSourceChange(DATA_SOURCES.FIREBASE)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  dataSource === DATA_SOURCES.FIREBASE
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Firebase ({allPlansCount})
              </button>
              <button
                onClick={() => onDataSourceChange(DATA_SOURCES.AIRALO)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  dataSource === DATA_SOURCES.AIRALO
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Airalo ({airaloPlansCount})
              </button>
              <button
                onClick={() => onDataSourceChange(DATA_SOURCES.TOPUPS)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  dataSource === DATA_SOURCES.TOPUPS
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Topups ({topupsCount})
              </button>
            </div>
          </div>
        </div>

        {/* Load Supabase Data Button - shown when error or needs refresh */}
        {dataSource === DATA_SOURCES.SUPABASE && (
          <div className="flex justify-center gap-4">
            <button
              onClick={onLoadSupabase}
              disabled={loadingSupabase}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {loadingSupabase ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Refresh Data
                </>
              )}
            </button>
            <div className="text-sm text-gray-600 flex items-center">
              Supabase is the primary data source with server-side filtering
            </div>
          </div>
        )}

        {/* Load Airalo Button */}
        {dataSource === DATA_SOURCES.AIRALO && (
          <div className="flex justify-center">
            <button
              onClick={onLoadAiralo}
              disabled={loadingAiralo}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {loadingAiralo ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading Airalo Data...
                </>
              ) : (
                'Load Airalo Data'
              )}
            </button>
          </div>
        )}

        {/* Load Topups Button */}
        {dataSource === DATA_SOURCES.TOPUPS && (
          <div className="flex justify-center gap-4">
            <button
              onClick={onLoadTopups}
              disabled={loadingTopups}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {loadingTopups ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading Topups...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Refresh Topups
                </>
              )}
            </button>
            <div className="text-sm text-gray-600 flex items-center">
              Topups are synced to a separate collection for future topup functionality
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataSourceTabs;
