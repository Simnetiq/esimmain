import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Hook to fetch regions from Firebase with translations
 * @param {string} locale - Current locale (e.g., 'en', 'ru', 'es')
 * @returns {Object} - { regions, isLoading, error }
 */
export const useRegions = (locale = 'en') => {
  const [regions, setRegions] = useState([]);

  // Fetch regions from Firebase
  const { data: regionsData, isLoading, error } = useQuery({
    queryKey: ['regions', locale],
    queryFn: async () => {
      try {
        const regionsRef = collection(db, 'regions');
        const q = query(regionsRef, orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        
        const fetchedRegions = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Get translated name, fallback to default name
          const translatedName = data.translations?.[locale] || data.name || doc.id;
          
          return {
            id: doc.id,
            name: data.name,
            icon: data.icon || '🌐',
            color: data.color || '#0066CC',
            order: data.order || 0,
            imageUrl: data.imageUrl || '',
            topPlanIds: data.topPlanIds || [],
            translations: data.translations || {},
            displayName: translatedName,
            ...data
          };
        });
        
        return fetchedRegions;
      } catch (error) {
        console.error('Error fetching regions:', error);
        throw error;
      }
    },
    retry: 2,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  useEffect(() => {
    if (regionsData) {
      setRegions(regionsData);
    } else if (error) {
      // Set default regions as fallback
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

  return {
    regions,
    isLoading,
    error
  };
};

