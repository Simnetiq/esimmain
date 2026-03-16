'use client';

import React, { useMemo } from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useRegionsSupabase as useRegions } from '@esim/shared/hooks/useRegionsSupabase';
import { getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { Flame, Globe } from 'lucide-react';

const RegionTabs = ({ selectedRegion, onRegionChange }) => {
  const { locale, isLoading: i18nLoading } = useI18n();
  const { regions, isLoading } = useRegions(locale);

  // Language detection — avoid localStorage in render to prevent hydration mismatch
  const detectedLanguage = useMemo(() => {
    if (i18nLoading) return 'en';
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
      <div className="flex gap-2 overflow-x-auto scrollbar-hide rtl-native-flex" dir={direction} lang={detectedLanguage}>
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="px-4 py-2 h-9 w-24 rounded-full animate-pulse flex-shrink-0"
            style={{ backgroundColor: 'var(--subtle-bg)' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide rtl-native-flex" dir={direction} lang={detectedLanguage}>
      {regions.map(region => {
        const icon = getRegionIcon(region.id);
        const isSelected = selectedRegion === region.id;

        return (
          <button
            key={region.id}
            onClick={() => onRegionChange(region.id)}
            className={`px-4 py-2 font-medium text-sm rounded-full flex items-center gap-2 flex-shrink-0 whitespace-nowrap transition-colors duration-200 rtl-native-flex ${
              isSelected
                ? 'bg-tufts-blue text-white'
                : 'text-text-muted'
            }`}
            style={isSelected ? {} : { backgroundColor: 'var(--subtle-bg)', border: '1px solid var(--subtle-border)' }}
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

