'use client';

import React, { useMemo } from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useRegionsSupabase as useRegions } from '@esim/shared/hooks/useRegionsSupabase';
import { getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { Flame, Globe } from 'lucide-react';

const RegionTabs = ({ selectedRegion, onRegionChange }) => {
  const { locale, isLoading: i18nLoading } = useI18n();
  const { regions, isLoading } = useRegions(locale);

  // Language detection with fallback
  const detectedLanguage = useMemo(() => {
    if (i18nLoading) {
      if (typeof window !== 'undefined') {
        const savedLanguage = localStorage.getItem('Simnetiq-language');
        if (savedLanguage) return savedLanguage;
      }
      return 'en';
    }
    return locale || 'en';
  }, [locale, i18nLoading]);

  const direction = getLanguageDirection(detectedLanguage);

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
      <div className={`flex flex-wrap gap-3 justify-start `} dir={direction} lang={detectedLanguage}>
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
    <div className={`flex flex-wrap gap-3 justify-start `} dir={direction} lang={detectedLanguage}>
      {regions.map(region => {
        const icon = getRegionIcon(region.id);

        return (
          <button
            key={region.id}
            onClick={() => onRegionChange(region.id)}
            className={`px-4 py-2 rounded-md font-medium text-sm border-2 flex items-center gap-2 `}
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

