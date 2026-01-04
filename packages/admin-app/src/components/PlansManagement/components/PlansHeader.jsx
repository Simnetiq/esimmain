'use client';

import React from 'react';
import { RefreshCw, Database } from 'lucide-react';

/**
 * Header component with title and sync action buttons
 */
const PlansHeader = ({ onOpenFirebaseSync, onOpenSupabaseSync }) => {
  return (
    <div className="flex justify-between items-start">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Plans Management</h2>
        <p className="text-gray-600 mt-1">View and manage all eSIM data plans</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onOpenFirebaseSync}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Sync to Firebase
        </button>
        <button
          onClick={onOpenSupabaseSync}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Database className="w-4 h-4" />
          Sync to Supabase
        </button>
      </div>
    </div>
  );
};

export default PlansHeader;
