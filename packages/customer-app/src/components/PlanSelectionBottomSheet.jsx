'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

// Inline SVG icons to avoid lucide-react bundle overhead
const GlobeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
  </svg>
);

const SmartphoneIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>
  </svg>
);

const DollarSignIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

const ZapIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
  </svg>
);

const InfinityIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"/>
  </svg>
);

const ArrowRightIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
);

const PlanCard = ({ plan, onClick, badge }) => {
  const { t } = useI18n();
  
  const originalPrice = parsePrice(plan.price);

  // Badge configurations matching RegionalDealCard
  const badgeConfig = {
    cheapest: {
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-50',
      Icon: DollarSignIcon,
      iconColor: 'text-green-600',
      label: t('deals.bestPrice', 'Best price')
    },
    bestDeal: {
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-50',
      Icon: ZapIcon,
      iconColor: 'text-amber-600',
      label: t('deals.bestValue', 'Best value')
    },
    unlimited: {
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-50',
      Icon: InfinityIcon,
      iconColor: 'text-purple-600',
      label: t('deals.unlimited', 'Unlimited data')
    }
  };

  const currentBadge = badge ? badgeConfig[badge] : null;
  const BadgeIcon = currentBadge?.Icon;

  return (
    <button 
      className="group/plan w-full bg-white hover:bg-gray-50 rounded-lg p-3 text-left transition-all duration-200 hover:shadow-sm border border-gray-100"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${currentBadge?.iconBg || 'bg-gray-100'}`}>
            {BadgeIcon ? (
              <BadgeIcon className={`w-4 h-4 ${currentBadge?.iconColor || 'text-gray-600'}`} />
            ) : (
              <SmartphoneIcon className="w-4 h-4 text-gray-600" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-eerie-black">
              {plan.data} · {plan.period || plan.duration || 'N/A'}d
            </p>
            <p className="text-[11px] text-gray-500">
              {currentBadge?.label || plan.operator || plan.provider || t('deals.esimPlan', 'eSIM Plan')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-tufts-blue">
            {formatPrice(originalPrice)}
          </span>
          <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover/plan:text-tufts-blue group-hover/plan:translate-x-0.5 transition-all" />
        </div>
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
                  <SmartphoneIcon className="w-4 h-4 text-tufts-blue" />
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
                  <SmartphoneIcon className="w-4 h-4 text-tufts-blue" />
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
              <GlobeIcon className="w-6 h-6 text-gray-400" />
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
