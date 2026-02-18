import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';

/**
 * Hook to fetch regions from Supabase with translations
 * @param {string} locale - Current locale (e.g., 'en', 'ru', 'es')
 * @returns {Object} - { regions, isLoading, error }
 */
export const useRegions = (locale = 'en') => {
  const [regions, setRegions] = useState([]);

  const { data: regionsData, isLoading, error } = useQuery({
    queryKey: ['regions', locale],
    queryFn: async () => {
      try {
        const supabase = getSupabase();
        
        // Fetch regions
        const { data: regionsRows, error: regionsError } = await supabase
          .from('regions')
          .select('*')
          .order('order', { ascending: true });
        
        if (regionsError) throw regionsError;

        // Fetch translations for this locale
        let translationsMap = {};
        if (locale !== 'en') {
          const { data: translations } = await supabase
            .from('region_translations')
            .select('region_id, name')
            .eq('language', locale);
          
          if (translations) {
            translations.forEach(t => {
              translationsMap[t.region_id] = t.name;
            });
          }
        }

        return (regionsRows || []).map(row => ({
          id: row.id,
          name: row.name,
          icon: row.icon || '🌐',
          color: row.color || '#0066CC',
          order: row.order || 0,
          imageUrl: row.image_url || '',
          topPlanIds: row.top_plan_ids || [],
          popularCountries: row.popular_countries || [],
          displayName: translationsMap[row.id] || row.name,
          ...row,
        }));
      } catch (error) {
        console.error('Error fetching regions:', error);
        throw error;
      }
    },
    retry: 2,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (regionsData) {
      setRegions(regionsData);
    } else if (error) {
      const defaultRegions = [
        { id: 'popular', name: 'Popular', displayName: 'Popular', icon: '🔥', color: '#0066CC', order: 0 },
        { id: 'asia', name: 'Asia', displayName: 'Asia', icon: '🌏', color: '#0066CC', order: 1 },
        { id: 'europe', name: 'Europe', displayName: 'Europe', icon: '🇪🇺', color: '#0066CC', order: 2 },
        { id: 'americas', name: 'Americas', displayName: 'Americas', icon: '🌎', color: '#0066CC', order: 3 },
        { id: 'africa', name: 'Africa', displayName: 'Africa', icon: '🌍', color: '#0066CC', order: 4 },
        { id: 'oceania', name: 'Oceania', displayName: 'Oceania', icon: '🌏', color: '#0066CC', order: 5 },
        { id: 'all', name: 'All', displayName: 'All', icon: '🌐', color: '#0066CC', order: 6 }
      ];
      setRegions(defaultRegions);
    }
  }, [regionsData, error]);

  return { regions, isLoading, error };
};
