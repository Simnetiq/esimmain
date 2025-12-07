'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Sync search term with URL on mount
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || '';
    if (urlSearchTerm) {
      setSearchTerm(urlSearchTerm);
    }
  }, [searchParams]);

  // Update URL when search term changes
  useEffect(() => {
    if (searchTerm && pathname) {
      const params = new URLSearchParams(searchParams);
      params.set('search', searchTerm);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    } else if (!searchTerm && searchParams.get('search')) {
      const params = new URLSearchParams(searchParams);
      params.delete('search');
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [searchTerm, pathname, router, searchParams]);

  const clearSearch = () => {
    setSearchTerm('');
    setIsSearching(false);
    setSelectedCountry(null);
  };

  const selectCountry = (country) => {
    setSelectedCountry(country);
    if (country) {
      setSearchTerm(country.displayName || country.name);
    }
  };

  const value = {
    searchTerm,
    setSearchTerm,
    isSearching,
    setIsSearching,
    selectedCountry,
    setSelectedCountry,
    selectCountry,
    clearSearch,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

