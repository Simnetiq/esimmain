import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { mobileCountries, getCountryName } from '../data/mobileCountries';

// Helper function to get flag emoji from country code
const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  
  if (countryCode.includes('-') || countryCode.length > 2) {
    return '🌍';
  }
  
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    
    const emoji = String.fromCodePoint(...codePoints);
    return emoji;
  } catch {
    return '🌍';
  }
};

// Helper function to get country design data
const getCountryDesignData = (countryCode) => {
  return mobileCountries.find(country => country.code === countryCode) || null;
};

export const useCountries = (locale) => {
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);

  // Fetch countries from Firebase
  const { data: countriesData, isLoading, error } = useQuery({
    queryKey: ['countries-with-pricing', locale],
    queryFn: async () => {
      try {
        
        const countriesQuery = query(
          collection(db, 'countries'),
          where('status', '==', 'active')
        );
        
        const countriesSnapshot = await getDocs(countriesQuery);
        const firebaseCountries = countriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        
        // Merge with design data
        const enhancedCountries = firebaseCountries.map(country => {
          const designData = getCountryDesignData(country.code);
          
          // Get display name with smart fallback logic
          let displayName = country.name;
          
          const isCountryCode = displayName && 
                                displayName.length === 2 && 
                                displayName === displayName.toUpperCase() &&
                                displayName === country.code;
          
          if (isCountryCode || !displayName) {
            console.warn(`⚠️ Country ${country.code} has code as name ("${displayName}"), using fallbacks`);
            
            displayName = country.translations?.[locale] || 
                         getCountryName(country.code, locale) ||
                         designData?.name ||
                         country.code;
          } else {
            displayName = country.translations?.[locale] || displayName;
          }
          
          return {
            ...country,
            flagEmoji: designData?.flagEmoji || country.flag || getFlagEmoji(country.code),
            displayName: displayName,
            originalName: country.name,
            hasDesignData: !!designData
          };
        });
        
        // Sort by minimum price
        enhancedCountries.sort((a, b) => (a.minPrice || 999) - (b.minPrice || 999));
        
        // Remove duplicates
        const uniqueCountries = [];
        const seenCodes = new Set();
        
        for (const country of enhancedCountries) {
          if (!seenCodes.has(country.code)) {
            seenCodes.add(country.code);
            uniqueCountries.push(country);
          } else {
          }
        }
        
        
        const activeCountries = uniqueCountries.filter(c => {
          const isActive = c.status === 'active' || c.isActive === true;
          return isActive;
        });
        
        
        return activeCountries;
      } catch {
        // Fallback to design data
        const fallbackCountries = mobileCountries
          .filter(country => country.status === 'active')
          .map(country => ({
            ...country,
            displayName: getCountryName(country.code, locale) || country.name,
            originalName: country.name,
            hasDesignData: true,
            isFallback: true
          }));
        
        return fallbackCountries;
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  useEffect(() => {
    if (countriesData) {
      setCountries(countriesData);
      setFilteredCountries(countriesData);
    } else if (error) {
      setCountries([]);
      setFilteredCountries([]);
    }
  }, [countriesData, error]);

  return {
    countries,
    filteredCountries,
    setFilteredCountries,
    isLoading,
    error
  };
};

