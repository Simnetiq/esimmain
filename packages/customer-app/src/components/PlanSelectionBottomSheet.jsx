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
      icon: DollarSign,
      text: t('planBadge.cheapest', 'Cheapest')
    },
    bestDeal: {
      color: '#E09445',
      icon: Zap,
      text: t('planBadge.bestDeal', 'Best Deal')
    },
    unlimited: {
      color: '#6B5DD4',
      icon: Infinity,
      text: t('planBadge.unlimited', 'Unlimited')
    }
  };

  const currentBadge = badge ? badgeConfig[badge] : null;
  const BadgeIcon = currentBadge?.icon;
  const borderColor = currentBadge ? currentBadge.color : '#e5e7eb'; // gray-200

  return (
    <button 
      className="w-full relative bg-white hover:shadow-lg transition-all duration-300 text-left overflow-visible group rounded-lg"
      style={{ 
        border: `2px solid ${borderColor}`,
      }}
      onClick={onClick}
    >
      {/* Badge Notch - Rectangle with triangle underneath */}
      {currentBadge && (
        <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center">
          {/* Rectangle Badge */}
          <div 
            className="flex items-center gap-1 px-3 py-1 text-white text-xs font-medium"
            style={{ 
              backgroundColor: currentBadge.color,
            }}
          >
            {BadgeIcon && <BadgeIcon className="w-3 h-3" />}
            <span>{currentBadge.text}</span>
          </div>
          {/* Triangle pointing down */}
          <div 
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${currentBadge.color}`,
            }}
          />
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Row 1: Data Amount + Days (same row) */}
        <div className={`flex items-baseline justify-between gap-2 ${currentBadge ? 'mt-2' : 'mt-1'}`}>
          <div className="text-lg font-bold text-gray-900">
            {plan.data}
          </div>
          <div className="text-sm text-gray-600">
            {plan.period || plan.duration || 'N/A'} {t('planSelection.days', 'days')}
          </div>
        </div>

        {/* Row 2: Provider */}
        {provider && (
          <div className="text-xs text-gray-500 truncate">
            {provider}
          </div>
        )}

        {/* Row 3: Price */}
        <div className="text-xl font-bold text-tufts-blue">
          {formatPrice(originalPrice)}
        </div>

        {/* Hover indicator */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
          style={{ backgroundColor: borderColor }}
        ></div>
      </div>
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
      <div className="p-4 lg:p-6 min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Available Plans or Countries */}
        {loadingPlans ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full bg-gray-100/10 h-14 w-14 border border-gray-200/70 mx-auto"></div>
            <p className={`text-eerie-black font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t('planSelection.loadingPlans', 'Loading available plans...')}</p>
            <p className={`text-sm text-eerie-black mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('planSelection.pleaseWait', 'Please wait while we fetch the best options for you')}</p>
          </div>
        ) : availablePlans.length > 0 ? (
          <div className="space-y-4">
            {/* Header with Sort */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-tufts-blue" />
                <h4 className="font-semibold text-eerie-black text-base">
                  {t('planSelection.availablePlans', 'Available Plans ({{count}})', { count: availablePlans.length })}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-tufts-blue" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-tufts-blue"
                >
                  <option value="price">{t('planSort.price', 'Price up to low')}</option>
                  <option value="data">{t('planSort.data', 'Data down to high')}</option>
                  <option value="days">{t('planSort.days', 'Days down to high')}</option>
                </select>
              </div>
            </div>
            
            {/* Plans Grid - 2 per row */}
            <div className="grid grid-cols-2 gap-3">
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-tufts-blue" />
                <h4 className="font-semibold text-gray-900 text-base">
                  {t('planSelection.availablePlans', 'Available Plans')}
                </h4>
              </div>
              <div className="flex items-center text-sm text-gray-500 gap-1">
                <ArrowUpDown className="w-4 h-4 text-tufts-blue" />
                <span>{t('planSelection.sortedByCheapest', 'Sorted by cheapest first')}</span>
              </div>
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
                      <div className="border-t border-gray-200 my-6"></div>
                    )}
                    
                    <div className="text-center">
                      <h5 className="text-base font-bold text-gray-900">
                        {t('planSelection.dayPlans', '{{days}} Day{{plural}} Plans', { days, plural: days !== 1 ? 's' : '' })}
                      </h5>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('planSelection.countriesAvailable', '{{count}} countr{{plural}} available', { 
                          count: countries.length, 
                          plural: countries.length === 1 ? 'y' : 'ies' 
                        })}
                      </p>
                    </div>
                    
                    {/* Countries Grid - 2 per row */}
                    <div className="grid grid-cols-2 gap-3">
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
                            className="w-full relative border border-gray-200 bg-white hover:border-tufts-blue hover:shadow-md transition-all duration-300 text-left overflow-hidden group rounded-lg"
                            onClick={() => {
                              // Navigate to plan or country
                            }}
                          >
                            <div className="p-3 space-y-2">
                              {/* Region Badge - Top Right */}
                              {region && (
                                <div className="absolute top-2 right-2 z-10">
                                  <span 
                                    className="px-2 py-0.5 text-white text-xs font-medium rounded-full"
                                    style={{ backgroundColor: regionColor }}
                                  >
                                    {regionNames[region] || region}
                                  </span>
                                </div>
                              )}

                              {/* Row 1: Flag + Country Name */}
                              <div className="flex items-center gap-2">
                                <div className="flex-shrink-0 w-8 h-6 overflow-hidden border border-gray-200">
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
                                <h3 className="text-xs font-semibold text-gray-900 truncate flex-1">
                                  {countryName}
                                </h3>
                              </div>

                              {/* Row 2: Data + Price */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-base font-bold text-gray-900">
                                  {cheapestPlan.data}
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  <div className="text-base font-bold text-tufts-blue">
                                    {formatPrice(cheapestPlan.price)}
                                  </div>
                                </div>
                              </div>

                              {/* Row 3: Duration (centered) */}
                              <div className="text-center text-xs text-gray-600">
                                {days} {t('planSelection.days', 'days')}
                              </div>

                              {/* Hover indicator */}
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-tufts-blue transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                            </div>
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
          <div className="text-center py-6">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe size={24} className="text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">{t('planSelection.noPlansAvailable', 'No Plans Available')}</h3>
            <p className="text-xs text-gray-600 mb-4">
              {t('planSelection.couldNotFind', 'We couldn\'t find any plans for your current selection')}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {t('planSelection.tryAdjusting', 'Try adjusting your filters or selecting a different country')}
            </p>
          </div>
        )}

        {/* Bottom Spacing */}
        <div className="h-6" />
      </div>
    </BottomSheet>
  );
};

export default PlanSelectionBottomSheet;
