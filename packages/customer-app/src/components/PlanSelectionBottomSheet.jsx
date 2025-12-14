'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Globe, ArrowUpDown, Smartphone, Zap, DollarSign, Infinity } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import { formatPrice, parsePrice } from '@esim/shared/utils/priceUtils';
import Image from 'next/image';
import { getISOCode } from '@esim/shared/utils/countryCodeMap';
import { db } from '@esim/shared/firebase/config';
import { collection, getDocs } from 'firebase/firestore';

const PlanCard = ({ plan, onClick, badge }) => {
  const { t } = useI18n();
  
  const originalPrice = parsePrice(plan.price);
  const provider = plan.operator || plan.provider || '';

  // Badge configurations
  const badgeConfig = {
    cheapest: {
      color: '#47C97E',
      bgColor: 'bg-green-50',
      icon: DollarSign,
      text: t('planBadge.cheapest', 'Cheapest')
    },
    bestDeal: {
      color: '#E09445',
      bgColor: 'bg-amber-50',
      icon: Zap,
      text: t('planBadge.bestDeal', 'Best Deal')
    },
    unlimited: {
      color: '#6B5DD4',
      bgColor: 'bg-purple-50',
      icon: Infinity,
      text: t('planBadge.unlimited', 'Unlimited')
    }
  };

  const currentBadge = badge ? badgeConfig[badge] : null;
  const BadgeIcon = currentBadge?.icon;

  return (
    <button 
      className={`group w-full relative ${currentBadge?.bgColor || 'bg-gray-50'} hover:bg-white rounded-lg transition-all duration-300 text-left overflow-hidden`}
      onClick={onClick}
    >
      {/* Badge - Top */}
      {currentBadge && (
        <div 
          className="flex items-center justify-center gap-1 py-1.5 text-white text-xs font-medium"
          style={{ backgroundColor: currentBadge.color }}
        >
          {BadgeIcon && <BadgeIcon className="w-3 h-3" />}
          <span>{currentBadge.text}</span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Row 1: Data Amount + Days */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-lg font-bold text-eerie-black">
            {plan.data}
          </div>
          <div className="text-sm text-gray-500">
            {plan.period || plan.duration || 'N/A'} {t('planSelection.days', 'days')}
          </div>
        </div>

        {/* Row 2: Provider */}
        {provider && (
          <div className="text-xs text-gray-400 truncate">
            {provider}
          </div>
        )}

        {/* Row 3: Price */}
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-tufts-blue">
            {formatPrice(originalPrice)}
          </div>
          {/* Arrow indicator on hover */}
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 ring-1 ring-black/5">
            <svg className="w-4 h-4 text-tufts-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Border ring */}
      <div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-black/5 group-hover:ring-tufts-blue/30 transition-all duration-300" />
    </button>
  );
};

const PlanSelectionBottomSheet = ({ 
  isOpen, 
  onClose, 
  availablePlans, 
  loadingPlans,
  filteredCountries
}) => {
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [regionColors, setRegionColors] = useState({});
  const [regionNames, setRegionNames] = useState({});
  const [sortBy, setSortBy] = useState('price'); // price, data, days
  
  // Get current language for RTL detection
  const currentLanguage = React.useMemo(() => {
    try {
      if (i18nLoading) {
        // While loading, use localStorage or pathname detection
      if (typeof window !== 'undefined') {
        const savedLanguage = localStorage.getItem('Simnetiq-language');
        if (savedLanguage) return savedLanguage;
      }
        return detectLanguageFromPath(pathname) || 'en';
      }
      // Once loaded, use locale from I18nContext
      return locale || 'en';
    } catch {
      return 'en';
    }
  }, [locale, pathname, i18nLoading]);
  
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';
  
  // Helper function to generate localized URLs
  const getLocalizedUrl = (path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  };

  // Fetch region colors and names from Firebase
  useEffect(() => {
    const fetchRegionData = async () => {
      try {
        const regionsRef = collection(db, 'regions');
        const snapshot = await getDocs(regionsRef);
        const colors = {};
        const names = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          colors[doc.id] = data.color || '#6B7280';
          // Get translated name or fallback to default name
          names[doc.id] = data.translations?.[currentLanguage] || data.name || doc.id;
        });
        setRegionColors(colors);
        setRegionNames(names);
      } catch (error) {
        console.error('Error fetching region data:', error);
      }
    };

    if (isOpen) {
      fetchRegionData();
    }
  }, [isOpen, currentLanguage]);

  // Group countries by specific days (30, 7, 10, 15 days)
  const groupCountriesByDays = (countriesList) => {
    const targetDays = [30, 7, 10, 15];
    const groups = {};
    
    // Initialize groups for target days
    targetDays.forEach(day => {
      groups[day] = [];
    });
    
    // Add countries to appropriate day groups with recalculated min prices for specific days
    countriesList.forEach(country => {
      if (country.plans && country.plans.length > 0) {
        country.plans.forEach(plan => {
          const days = plan.period || plan.duration;
          if (targetDays.includes(days)) {
            // Calculate the actual minimum price for this specific day duration
            const dayPlans = country.plans.filter(p => (p.period || p.duration) === days);
            const dayMinPrice = dayPlans.length > 0 
              ? Math.min(...dayPlans.map(p => parseFloat(p.price) || 999))
              : 999;
            
            // Check if country already exists in this day group
            const existingCountry = groups[days].find(c => c.id === country.id);
            if (existingCountry) {
              // Update with the better (lower) price if this plan is cheaper
              if (dayMinPrice < existingCountry.dayMinPrice) {
                existingCountry.dayMinPrice = dayMinPrice;
              }
            } else {
              // Add country with the specific day's minimum price
              groups[days].push({
                ...country,
                dayMinPrice: dayMinPrice
              });
            }
          }
        });
      }
    });
    
    // Sort each group by the specific day's minimum price (cheapest first)
    Object.keys(groups).forEach(day => {
      groups[day].sort((a, b) => (a.dayMinPrice || a.minPrice) - (b.dayMinPrice || b.minPrice));
    });
    
    return groups;
  };


  // Helper to get data value in MB
  const getDataValueInMB = (plan) => {
    const dataStr = plan.data || '0';
    
    // Check for unlimited
    if (dataStr.toLowerCase().includes('unlimited') || dataStr.toLowerCase().includes('∞')) {
      return Infinity;
    }
    
    const match = dataStr.match(/(\d+\.?\d*)\s*(GB|MB)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    return unit === 'GB' ? value * 1024 : value;
  };

  // Determine badges for plans
  const plansWithBadges = useMemo(() => {
    if (!availablePlans || availablePlans.length === 0) return [];
    
    // Find cheapest plan
    const cheapestPlan = [...availablePlans].reduce((min, plan) => 
      (parseFloat(plan.price) < parseFloat(min.price) ? plan : min)
    );
    
    // Find unlimited plans
    const unlimitedPlans = availablePlans.filter(plan => 
      getDataValueInMB(plan) === Infinity
    );
    
    // Find best deal - prioritize 10GB, 7GB, or 5GB plans
    const bestDealPlan = (() => {
      const preferredSizes = [10, 7, 5]; // Priority order
      
      for (const size of preferredSizes) {
        const sizeInMB = size * 1024;
        const matchingPlans = availablePlans.filter(plan => {
          const dataInMB = getDataValueInMB(plan);
          return dataInMB >= sizeInMB - 100 && dataInMB <= sizeInMB + 100; // Small tolerance
        });
        
        if (matchingPlans.length > 0) {
          // Return the cheapest among matching size
          return matchingPlans.reduce((min, plan) => 
            (parseFloat(plan.price) < parseFloat(min.price) ? plan : min)
          );
        }
      }
      
      return null;
    })();
    
    // Assign badges
    return availablePlans.map(plan => ({
      ...plan,
      badge: plan.id === cheapestPlan.id ? 'cheapest' :
             unlimitedPlans.find(p => p.id === plan.id) ? 'unlimited' :
             bestDealPlan && plan.id === bestDealPlan.id ? 'bestDeal' :
             null
    }));
  }, [availablePlans]);

  // Sort plans based on selected sort method
  const sortPlans = useMemo(() => {
    if (!plansWithBadges || plansWithBadges.length === 0) return [];
    
    return [...plansWithBadges].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          // Sort by price (cheapest first)
          return (parseFloat(a.price) || 999) - (parseFloat(b.price) || 999);
        
        case 'data':
          // Sort by data amount (most data first)
          return getDataValueInMB(b) - getDataValueInMB(a);
        
        case 'days':
          // Sort by validity period (longest first)
          const daysA = parseInt(a.period || a.duration) || 0;
          const daysB = parseInt(b.period || b.duration) || 0;
          return daysB - daysA;
        
        default:
          return 0;
      }
    });
  }, [plansWithBadges, sortBy]);

  // Get country info from first plan
  const countryInfo = useMemo(() => {
    if (!availablePlans || availablePlans.length === 0) return null;
    
    const firstPlan = availablePlans[0];
    const countryCode = firstPlan.country_codes?.[0] || firstPlan.country_code;
    const countryName = firstPlan.country_region || firstPlan.country_name || countryCode;
    const region = firstPlan.region;
    
    return {
      code: countryCode,
      name: countryName,
      region: region
    };
  }, [availablePlans]);

  const handlePlanSelect = (plan) => {
    // Track plan selection with Facebook Pixel including value
    const planPrice = parseFloat(plan.price) || 0;
    
    trackCustomFacebookEvent('PlanSelected', {
      content_name: plan.name,
      content_type: 'esim_plan',
      content_ids: [plan.id],
      value: planPrice,
      currency: plan.currency || 'USD',
      data_amount: plan.data,
      data_unit: plan.dataUnit,
      validity_days: plan.period || plan.duration,
      country_codes: plan.country_codes?.join(',') || plan.country_code || '',
      source: 'plan_selection_sheet',
      event_category: 'engagement',
      timestamp: new Date().toISOString()
    });
    
    // Get country code for the plan
    const countryCode = plan.country_codes?.[0] || plan.country_code;
    
    // Navigate to the share package page with country info
    const params = new URLSearchParams({
      country: countryCode || ''
    });
    
    const sharePackageUrl = getLocalizedUrl(`/share-package/${plan.id}?${params.toString()}`);
    router.push(sharePackageUrl);
  };


  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        countryInfo ? (
          <div className="flex items-center gap-x-2 my-4">
            {/* Country Flag */}
            <div className="flex-shrink-0 w-10 aspect-[4/3] flex items-center justify-center border border-gray-200 overflow-hidden">
              <Image
                src={`/flags/4x3/${getISOCode(countryInfo.code)}.svg`}
                alt={`${countryInfo.name} flag`}
                width={40}
                height={30}
                className="w-full h-full object-cover"
                loading="lazy"
                unoptimized
              />
            </div>
            {/* Country Name */}
            <span className="font-light text-2xl text-gray-900">{countryInfo.name}</span>
            
          </div>
        ) : (
          t('planSelection.chooseYourPlan', 'Choose Your Plan')
        )
      }
      maxHeight="85vh"
      variant="center"
    >
      <div className="p-4 lg:p-6" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Available Plans or Countries */}
        {loadingPlans ? (
          <div className="py-8">
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                  <div className="h-6 bg-gray-200 rounded w-1/3" />
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">{t('planSelection.loadingPlans', 'Loading available plans...')}</p>
          </div>
        ) : availablePlans.length > 0 ? (
          <div className="space-y-4">
            {/* Header with Sort */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-tufts-blue/10 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-tufts-blue" />
                </div>
                <h4 className="font-semibold text-eerie-black text-sm sm:text-base">
                  {t('planSelection.availablePlans', 'Available Plans')} <span className="text-gray-400 font-normal">({availablePlans.length})</span>
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs sm:text-sm border-0 bg-gray-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-tufts-blue/20"
                >
                  <option value="price">{t('planSort.price', 'Price ↑')}</option>
                  <option value="data">{t('planSort.data', 'Data ↓')}</option>
                  <option value="days">{t('planSort.days', 'Days ↓')}</option>
                </select>
              </div>
            </div>
            
            {/* Plans Grid - 2 per row on mobile, 3 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {sortPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  badge={plan.badge}
                  onClick={() => handlePlanSelect(plan)}
                />
              ))}
            </div>
          </div>
        ) : filteredCountries && filteredCountries.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-tufts-blue/10 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-tufts-blue" />
                </div>
                <h4 className="font-semibold text-eerie-black text-sm sm:text-base">
                  {t('planSelection.availablePlans', 'Available Plans')}
                </h4>
              </div>
              <span className="text-xs text-gray-400">{t('planSelection.sortedByCheapest', 'Cheapest first')}</span>
            </div>
            
            {/* Auto-grouped Display by Days */}
            {(() => {
              const grouped = groupCountriesByDays(filteredCountries);
              const orderedDays = [30, 7, 10, 15]; // Display order
              
              return orderedDays.map((days, groupIndex) => {
                const countries = grouped[days] || [];
                if (countries.length === 0) return null;
                
                return (
                  <div key={days} className="space-y-4">
                    {/* Divider and Header */}
                    {groupIndex > 0 && (
                      <div className="w-full h-px bg-gray-100 my-4" />
                    )}
                    
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-semibold text-eerie-black">
                        {t('planSelection.dayPlans', '{{days}} Day{{plural}} Plans', { days, plural: days !== 1 ? 's' : '' })}
                      </h5>
                      <span className="text-xs text-gray-400">
                        {countries.length} {countries.length === 1 ? 'option' : 'options'}
                      </span>
                    </div>
                    
                    {/* Countries Grid - 2 per row on mobile, 3 on desktop */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {countries.map((country) => {
                        // Get the cheapest plan for this duration
                        const dayPlans = country.plans?.filter(p => (p.period || p.duration) === days) || [];
                        const cheapestPlan = dayPlans.length > 0 
                          ? dayPlans.reduce((min, p) => (parseFloat(p.price) < parseFloat(min.price) ? p : min))
                          : null;
                        
                        if (!cheapestPlan) return null;
                        
                        const countryCode = country.code;
                        const countryName = country.displayName || country.name;
                        const region = country.region;
                        const regionColor = regionColors[region] || '#6B7280';
                        
                        return (
                          <button
                            key={`${days}-${country.id}`}
                            className="group w-full relative bg-gray-50 hover:bg-white rounded-lg transition-all duration-300 text-left overflow-hidden"
                            onClick={() => {
                              // Navigate to plan or country
                            }}
                          >
                            <div className="p-4 space-y-3">
                              {/* Row 1: Flag + Country Name */}
                              <div className="flex items-center gap-2">
                                <div className="flex-shrink-0 w-8 h-6 overflow-hidden rounded bg-white">
                                  <Image
                                    src={`/flags/4x3/${getISOCode(countryCode)}.svg`}
                                    alt={`${countryName} flag`}
                                    width={32}
                                    height={24}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    unoptimized
                                  />
                                </div>
                                <h3 className="text-sm font-semibold text-eerie-black truncate flex-1">
                                  {countryName}
                                </h3>
                              </div>

                              {/* Row 2: Data + Price */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-base font-bold text-eerie-black">
                                  {cheapestPlan.data}
                                </div>
                                <div className="text-base font-bold text-tufts-blue">
                                  {formatPrice(cheapestPlan.price)}
                                </div>
                              </div>

                              {/* Row 3: Duration + Region */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">
                                  {days} {t('planSelection.days', 'days')}
                                </span>
                                {region && (
                                  <span 
                                    className="px-2 py-0.5 text-white text-xs font-medium rounded-full"
                                    style={{ backgroundColor: regionColor }}
                                  >
                                    {regionNames[region] || region}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Border ring */}
                            <div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-black/5 group-hover:ring-tufts-blue/30 transition-all duration-300" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe size={24} className="text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-eerie-black mb-2">{t('planSelection.noPlansAvailable', 'No Plans Available')}</h3>
            <p className="text-sm text-gray-500 mb-2">
              {t('planSelection.couldNotFind', 'We couldn\'t find any plans for your current selection')}
            </p>
            <p className="text-xs text-gray-400">
              {t('planSelection.tryAdjusting', 'Try adjusting your filters or selecting a different country')}
            </p>
          </div>
        )}

        {/* Bottom Spacing */}
        <div className="h-4" />
      </div>
    </BottomSheet>
  );
};

export default PlanSelectionBottomSheet;
