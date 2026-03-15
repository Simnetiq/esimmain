"use client";

import React, { useState, useEffect } from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { usePathname } from 'next/navigation';
import { esimService } from '@esim/shared/services/esimService';
import { detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  Wifi, 
  Clock, 
  MapPin, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';

const AiraloPlans = () => {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const [packages, setPackages] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [filteredPackages, setFilteredPackages] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('price'); // price, data, validity, name

  // Load packages and countries on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter packages based on search and filters
  useEffect(() => {
    let filtered = packages;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(pkg => 
        pkg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.country_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by country
    if (selectedCountry) {
      filtered = filtered.filter(pkg => pkg.country_code === selectedCountry);
    }

    // Filter by region
    if (selectedRegion) {
      filtered = filtered.filter(pkg => pkg.region_slug === selectedRegion);
    }

    // Sort packages
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'data':
          return b.data - a.data;
        case 'validity':
          return b.validity - a.validity;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredPackages(filtered);
  }, [packages, searchTerm, selectedCountry, selectedRegion, sortBy]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await esimService.fetchPlans();
      
      if (result.success) {
        setPackages(result.plans || []);
        setCountries(result.countries || []);
      } else {
        throw new Error(result.error || 'Failed to load data');
      }
    } catch {
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  // Get current language for URL generation
  const currentLanguage = React.useMemo(() => {
    try {
      if (locale) return locale;
      if (typeof window !== 'undefined') {
        const savedLanguage = localStorage.getItem('Simnetiq-language');
        if (savedLanguage) return savedLanguage;
      }
      return detectLanguageFromPath(pathname);
    } catch {
      return 'en';
    }
  }, [locale, pathname]);
  
  // Helper function to generate localized URLs
  const getLocalizedUrl = (path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  };

  const handlePackageSelect = (packageData) => {
    // Navigate to the share package page using the package slug as ID
    const sharePackageUrl = getLocalizedUrl(`/share-package/${packageData.slug}`);
    window.location.href = sharePackageUrl;
  };


  const formatPrice = (price, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const formatData = (data, unit = 'GB') => {
    if (data === 'Unlimited' || data === -1) {
      return 'Unlimited';
    }
    return `${data} ${unit}`;
  };

  const getCountryFlag = (countryCode) => {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    
    return String.fromCodePoint(...codePoints);
  };

  const getUniqueRegions = () => {
    const regions = [...new Set(packages.map(pkg => pkg.region_slug).filter(Boolean))];
    return regions.map(slug => ({
      slug,
      name: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, ' ')
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-tufts-blue" />
          <p className="text-text-muted">Loading eSIM packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-start mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            Global eSIM Packages
          </h1>
          <p className="text-xl text-text-muted max-w-3xl">
            Stay connected worldwide with our reliable eSIM packages powered by Airalo
          </p>
        </div>

        {/* Search and Filters */}
        <div className="p-6 mb-8" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute start-3 top-3 w-5 h-5 text-text-muted" />
                <input
                  type="text"
                  placeholder={t('search.packagesPlaceholder', 'Search packages, countries, or descriptions...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full ps-10 pe-4 py-3 rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-tufts-blue/30 focus:border-transparent"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--card-border)' }}
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-3 rounded-lg transition-colors text-text-primary"
              style={{ backgroundColor: 'var(--subtle-bg)' }}
            >
              <Filter className="w-5 h-5 me-2" />
              {t('search.filters', 'Filters')}
            </button>
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4" style={{ borderTop: '1px solid var(--divider)' }}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Country Filter */}
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">
                      Country
                    </label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-tufts-blue/30"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--card-border)' }}
                    >
                      <option value="">All Countries</option>
                      {countries.map(country => (
                        <option key={country.code} value={country.code}>
                          {getCountryFlag(country.code)} {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Region Filter */}
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">
                      Region
                    </label>
                    <select
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-tufts-blue/30"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--card-border)' }}
                    >
                      <option value="">All Regions</option>
                      {getUniqueRegions().map(region => (
                        <option key={region.slug} value={region.slug}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-tufts-blue/30"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--card-border)' }}
                    >
                      <option value="price">Price (Low to High)</option>
                      <option value="data">Data (High to Low)</option>
                      <option value="validity">Validity (Long to Short)</option>
                      <option value="name">Name (A to Z)</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPackages.map((pkg) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
              style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              onClick={() => handlePackageSelect(pkg)}
            >
              {/* Package Header */}
              <div className="p-6" style={{ borderBottom: '1px solid var(--divider)' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-text-primary truncate">
                    {pkg.name}
                  </h3>
                  <span className="text-2xl">
                    {getCountryFlag(pkg.country_code)}
                  </span>
                </div>
                <p className="text-sm text-text-muted line-clamp-2">
                  {pkg.description}
                </p>
              </div>

              {/* Package Details */}
              <div className="p-6">
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-text-muted">
                    <Wifi className="w-4 h-4 me-2" />
                    <span className="text-sm">
                      {formatData(pkg.data, pkg.data_unit)}
                    </span>
                  </div>
                  <div className="flex items-center text-text-muted">
                    <Clock className="w-4 h-4 me-2" />
                    <span className="text-sm">
                      {pkg.validity} {pkg.validity_unit}
                    </span>
                  </div>
                  <div className="flex items-center text-text-muted">
                    <MapPin className="w-4 h-4 me-2" />
                    <span className="text-sm">
                      {pkg.country_code?.toUpperCase() || 'Global'}
                    </span>
                  </div>
                  {pkg.is_roaming && (
                    <div className="flex items-center text-blue-600">
                      <Globe className="w-4 h-4 me-2" />
                      <span className="text-sm font-medium">Roaming</span>
                        </div>
                  )}
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-text-primary">
                    {formatPrice(pkg.price, pkg.currency)}
                  </div>
                  <div className="text-sm text-text-muted">
                    One-time payment
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2 mb-6">
                  {pkg.features?.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-text-muted">
                      <CheckCircle className="w-4 h-4 me-2 text-green-500" />
                      {feature}
                    </div>
                  ))}
                </div>

              </div>
            </motion.div>
          ))}
        </div>

        {/* No Results */}
        {filteredPackages.length === 0 && !loading && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              No packages found
            </h3>
            <p className="text-text-muted">
              Try adjusting your search terms or filters
            </p>
          </div>
        )}

        {/* Results Count */}
        {filteredPackages.length > 0 && (
          <div className="text-center mt-8 text-text-muted">
            Showing {filteredPackages.length} of {packages.length} packages
          </div>
        )}
      </div>
    </div>
  );
};

export default AiraloPlans;
