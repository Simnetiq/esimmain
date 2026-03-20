'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Header component with title and single sync action button
 */
const PlansHeader = ({ onOpenAiraloSync }) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Plans Management</h2>
        <p className="text-gray-600 mt-1">View and manage all eSIM data plans</p>
      </div>
      <button
        onClick={onOpenAiraloSync}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Sync from Airalo
      </button>
    </div>
  );
};

export default PlansHeader;
