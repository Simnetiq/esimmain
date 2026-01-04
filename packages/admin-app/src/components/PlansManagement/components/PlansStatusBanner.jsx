'use client';

import React from 'react';
import { Smartphone, Clock, CheckCircle, AlertTriangle, Database } from 'lucide-react';

/**
 * Status banner showing sync status and plan counts
 */
const PlansStatusBanner = ({
  syncStatus,
  supabaseStatus,
  allPlansCount,
  onRefreshStatus,
  dataSource
}) => {
  // Show Supabase status when Supabase is selected, otherwise show Firebase
  const showSupabase = dataSource === 'supabase';

  if (showSupabase && supabaseStatus) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              <span className="font-medium text-gray-900">
                {supabaseStatus.activeDataplans?.toLocaleString() || 0} Active Plans
              </span>
              <span className="text-sm text-gray-500">
                ({supabaseStatus.dataplans?.toLocaleString() || 0} total)
              </span>
            </div>
            {supabaseStatus.lastSyncedAt && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                Last synced: {new Date(supabaseStatus.lastSyncedAt).toLocaleString()}
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Countries: {supabaseStatus.countries?.toLocaleString() || 0}</span>
            </div>
          </div>
          <button
            onClick={onRefreshStatus}
            className="text-sm text-emerald-600 hover:text-emerald-800"
          >
            Refresh Status
          </button>
        </div>
      </div>
    );
  }

  if (!syncStatus) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">
              {syncStatus.activePlans?.toLocaleString() || allPlansCount} Active Plans
            </span>
          </div>
          {syncStatus.lastSync && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              Last synced: {new Date(syncStatus.lastSync.timestamp).toLocaleString()}
              {syncStatus.lastSync.status === 'success' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              )}
            </div>
          )}
        </div>
        <button
          onClick={onRefreshStatus}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
};

export default PlansStatusBanner;
