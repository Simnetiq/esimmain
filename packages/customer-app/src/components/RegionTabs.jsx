'use client';

import React from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useRegions } from '@esim/shared/hooks/useRegions';
import { Flame, Globe } from 'lucide-react';

const RegionTabs = ({ selectedRegion, onRegionChange }) => {
  const { locale } = useI18n();
  const { regions, isLoading } = useRegions(locale);

  // Get icon for region
  const getRegionIcon = (regionId) => {
    if (regionId === 'popular') {
      return <Flame className="w-4 h-4" />;
    }
    if (regionId === 'all') {
      return <Globe className="w-4 h-4" />;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-3 justify-start">
        {[...Array(7)].map((_, i) => (
          <div 
            key={i}
            className="px-4 py-2 rounded-md h-9 w-24 bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 justify-start">
      {regions.map(region => {
        const icon = getRegionIcon(region.id);
        
        return (
          <button
            key={region.id}
            onClick={() => onRegionChange(region.id)}
            className="px-4 py-2 rounded-md font-medium text-sm border-2 flex items-center gap-2"
            style={{
              backgroundColor: selectedRegion === region.id 
                ? `${region.color}20`
                : 'transparent',
              borderColor: selectedRegion === region.id 
                ? region.color 
                : 'transparent',
              color: selectedRegion === region.id 
                ? region.color 
                : '#1f2937'
            }}
          >
            {icon}
            {region.displayName}
          </button>
        );
      })}
    </div>
  );
};

export default RegionTabs;

