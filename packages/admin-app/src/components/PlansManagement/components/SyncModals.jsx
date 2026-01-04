'use client';

import React from 'react';
import {
  RefreshCw,
  Download,
  Search,
  AlertTriangle,
  Database,
  Cloud
} from 'lucide-react';

/**
 * Firebase Sync Modal
 */
export const FirebaseSyncModal = ({
  isOpen,
  onClose,
  allPlansCount,
  syncStatus,
  syncing,
  syncResult,
  onDryRun,
  onFullSync
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            Sync Plans with Airalo API
          </h3>
          <p className="text-gray-600 mt-1">
            Fetch the latest packages from Airalo and update your Firebase database
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Current Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Plans in Firebase:</span>
                <span className="ml-2 font-medium">{allPlansCount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500">Active Plans:</span>
                <span className="ml-2 font-medium">{syncStatus?.activePlans?.toLocaleString() || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Important Notice</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Full sync will remove plans that are no longer available in the Airalo catalog.
                  Run a dry run first to see what will be changed.
                </p>
              </div>
            </div>
          </div>

          {/* Sync Result */}
          {syncResult && (
            <div className={`rounded-lg p-4 ${syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h4 className={`font-medium ${syncResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {syncResult.dryRun ? 'Dry Run Result' : 'Sync Result'}
              </h4>
              <p className={`text-sm mt-1 ${syncResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {syncResult.message || syncResult.error}
              </p>
              {syncResult.details && (
                <div className="mt-3 text-sm space-y-1">
                  <p>• From Airalo API: <strong>{syncResult.details.from_airalo_api?.toLocaleString()}</strong> packages</p>
                  <p>• Currently in Firebase: <strong>{syncResult.details.existing_in_firebase?.toLocaleString()}</strong> packages</p>
                  <p>• New packages: <strong>{syncResult.details.packages?.added || 0}</strong></p>
                  <p>• Updated packages: <strong>{syncResult.details.packages?.updated || 0}</strong></p>
                  <p className="text-amber-700">• To be removed: <strong>{syncResult.details.total_deprecated || 0}</strong></p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onDryRun()}
              disabled={syncing}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Dry Run (Preview)
                </>
              )}
            </button>
            <button
              onClick={() => onFullSync()}
              disabled={syncing}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Full Sync (Update All)
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Supabase Sync Modal
 */
export const SupabaseSyncModal = ({
  isOpen,
  onClose,
  supabaseStatus,
  syncingSupabase,
  supabaseSyncResult,
  onDryRun,
  onFullSync
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            Sync Plans to Supabase
          </h3>
          <p className="text-gray-600 mt-1">
            Fetch packages from Airalo API and sync directly to Supabase database
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Supabase Status */}
          {supabaseStatus && (
            <div className="bg-emerald-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-600" />
                Supabase Status
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Countries:</span>
                  <span className="ml-2 font-medium">{supabaseStatus.countries?.toLocaleString() || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Data Plans:</span>
                  <span className="ml-2 font-medium">{supabaseStatus.dataplans?.toLocaleString() || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Active Plans:</span>
                  <span className="ml-2 font-medium">{supabaseStatus.activeDataplans?.toLocaleString() || 0}</span>
                </div>
                {supabaseStatus.lastSyncedAt && (
                  <div>
                    <span className="text-gray-500">Last Synced:</span>
                    <span className="ml-2 font-medium">{new Date(supabaseStatus.lastSyncedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Database className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800">Direct Airalo → Supabase Sync</h4>
                <p className="text-sm text-blue-700 mt-1">
                  This syncs package data directly from the Airalo API to your Supabase database,
                  bypassing Firebase. Use this to populate your read-only catalog data in Supabase.
                </p>
              </div>
            </div>
          </div>

          {/* Supabase Sync Result */}
          {supabaseSyncResult && (
            <div className={`rounded-lg p-4 ${supabaseSyncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h4 className={`font-medium ${supabaseSyncResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {supabaseSyncResult.dryRun ? 'Dry Run Result' : 'Sync Result'}
              </h4>
              <p className={`text-sm mt-1 ${supabaseSyncResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {supabaseSyncResult.message || supabaseSyncResult.error}
              </p>
              {supabaseSyncResult.details && (
                <div className="mt-3 text-sm space-y-1">
                  <p>• Countries synced: <strong>{supabaseSyncResult.details.countries?.synced || 0}</strong></p>
                  <p>• Dataplans synced: <strong>{supabaseSyncResult.details.dataplans?.synced || 0}</strong></p>
                </div>
              )}
              {supabaseSyncResult.preview && (
                <div className="mt-3 text-sm space-y-1">
                  <p>• Total countries: <strong>{supabaseSyncResult.preview.totalCountries}</strong></p>
                  <p>• Total dataplans: <strong>{supabaseSyncResult.preview.totalDataplans}</strong></p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onDryRun()}
              disabled={syncingSupabase}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {syncingSupabase ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Dry Run (Preview)
                </>
              )}
            </button>
            <button
              onClick={() => onFullSync()}
              disabled={syncingSupabase}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {syncingSupabase ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Full Sync to Supabase
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default { FirebaseSyncModal, SupabaseSyncModal };
