'use client';

import React from 'react';
import { Clock, CheckCircle, AlertTriangle, Database } from 'lucide-react';

/**
 * Status banner showing sync status and plan counts
 */
const PlansStatusBanner = ({
  syncStatus,
  supabaseStatus,
  onRefreshStatus,
  dataSource
}) => {
  const showSupabase = dataSource === 'supabase';

  if (showSupabase && supabaseStatus) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-gray-900">
                {supabaseStatus.activeDataplans?.toLocaleString() || 0} active
              </span>
              <span className="text-sm text-gray-500">
                / {supabaseStatus.dataplans?.toLocaleString() || 0} total
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {supabaseStatus.countries?.toLocaleString() || 0} countries
            </span>
            {supabaseStatus.lastSyncedAt && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                {new Date(supabaseStatus.lastSyncedAt).toLocaleString()}
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              </div>
            )}
          </div>
          <button
            onClick={onRefreshStatus}
            className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (!syncStatus) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-5 py-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">
              {syncStatus.activePlans?.toLocaleString() || 0} active plans
            </span>
          </div>
          {syncStatus.lastSync && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              {new Date(syncStatus.lastSync.timestamp).toLocaleString()}
              {syncStatus.lastSync.status === 'success' ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              )}
            </div>
          )}
        </div>
        <button
          onClick={onRefreshStatus}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default PlansStatusBanner;
