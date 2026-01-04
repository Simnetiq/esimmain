'use client';

import React from 'react';
import { Globe2, MapPin, Activity } from 'lucide-react';

interface RegionsStatusBannerProps {
  totalRegions: number;
  activeRegions: number;
  loading: boolean;
}

const RegionsStatusBanner: React.FC<RegionsStatusBannerProps> = ({
  totalRegions,
  activeRegions,
  loading
}) => {
  const inactiveRegions = totalRegions - activeRegions;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Total Regions */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Globe2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Regions</p>
              <p className="text-xl font-bold text-gray-900">
                {loading ? '...' : totalRegions}
              </p>
            </div>
          </div>

          {/* Active Regions */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
              <p className="text-xl font-bold text-green-700">
                {loading ? '...' : activeRegions}
              </p>
            </div>
          </div>

          {/* Inactive Regions */}
          {inactiveRegions > 0 && (
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gray-100 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Inactive</p>
                <p className="text-xl font-bold text-gray-500">
                  {loading ? '...' : inactiveRegions}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-right">
          <p className="text-xs text-gray-500">
            Supabase Database
          </p>
          <p className="text-xs text-blue-600 font-medium">
            Server-side filtering enabled
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegionsStatusBanner;
