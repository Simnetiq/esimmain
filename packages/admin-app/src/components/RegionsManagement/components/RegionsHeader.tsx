'use client';

import React from 'react';
import { Globe, Plus, RefreshCw } from 'lucide-react';

interface RegionsHeaderProps {
  onCreateRegion: () => void;
  onRefresh: () => void;
  loading: boolean;
}

const RegionsHeader: React.FC<RegionsHeaderProps> = ({
  onCreateRegion,
  onRefresh,
  loading
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Globe className="w-7 h-7 text-blue-600" />
          Regions Management
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage global, continental, and regional data with countries and tariffs
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          onClick={onCreateRegion}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Region
        </button>
      </div>
    </div>
  );
};

export default RegionsHeader;
