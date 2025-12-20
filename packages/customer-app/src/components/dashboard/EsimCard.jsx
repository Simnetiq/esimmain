'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Globe, QrCode, Wifi, Phone, MessageSquare, Clock, Signal, ChevronRight, Zap } from 'lucide-react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { getISOCode } from '@esim/shared/utils/countryCodeMap';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { mapPackageCountryData, mapPlanDetails } from '@esim/shared/utils/esimFieldMapper';
// Using native img for flags due to Next.js Image optimization issues with SVGs

// Regional flag mapping - maps region names to actual flag files that exist
// Available: eu.svg, un.svg, arab.svg, asean.svg, eac.svg, cefta.svg
const REGION_FLAGS = {
  'EUROPE': 'eu',         // EU flag - perfect match
  'EU': 'eu',
  'GLOBAL': 'un',         // UN flag for Global coverage
  'WORLDWIDE': 'un',
  'MIDDLEEAST': 'arab',   // Arab League flag
  'ARAB': 'arab',
  // These will show a styled globe icon (more accurate than wrong flags)
  'ASIA': null,           // ASEAN flag doesn't represent all of Asia
  'ASIALINK': null,
  'AFRICA': null,         // EAC only represents East Africa
  'AMERICAS': null,
  'OCEANIA': null,
  'CARIBBEAN': null,
  'LATINAMERICA': null
};

// Circular Progress Ring Component (Untitled UI style)
const CircularProgress = ({ percentage, size = 48, strokeWidth = 4, isExpired = false }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-100"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-all duration-500 ${isExpired ? 'text-gray-400' : 'text-tufts-blue'}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xs font-bold ${isExpired ? 'text-gray-500' : 'text-gray-700'}`}>
          {percentage}%
        </span>
      </div>
    </div>
  );
};

const EsimCard = ({ order, usageData, loadingUsage, onViewQRCode }) => {
  const pathname = usePathname();
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const detectedLanguage = useMemo(() => {
    try {
      if (i18nLoading) {
        if (typeof window !== 'undefined') {
          const savedLanguage = localStorage.getItem('Simnetiq-language');
          if (savedLanguage) return savedLanguage;
        }
        return detectLanguageFromPath(pathname) || 'en';
      }
      return locale || 'en';
    } catch {
      return 'en';
    }
  }, [locale, pathname, i18nLoading]);

  const direction = mounted ? getLanguageDirection(detectedLanguage) : 'ltr';
  const isRTL = direction === 'rtl';

  // Format data usage with progress
  const formatDataUsage = (remaining, total, isUnlimited) => {
    if (isUnlimited) return { text: t('dashboard.unlimited', 'Unlimited'), percentage: 0 };
    if (remaining == null || total == null) return null;
    
    // Determine unit based on total (more consistent than using remaining)
    const useGB = total >= 1024;
    const unit = useGB ? 'GB' : 'MB';
    
    const remainingFormatted = useGB ? (remaining / 1024).toFixed(1) : Math.round(remaining);
    const totalFormatted = useGB ? (total / 1024).toFixed(1) : Math.round(total);
    
    const usedPercentage = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;
    
    return {
      text: `${remainingFormatted} / ${totalFormatted} ${unit}`,
      remaining: remainingFormatted,
      total: totalFormatted,
      unit,
      percentage: usedPercentage,
      remainingPercentage: 100 - usedPercentage
    };
  };

  // Get flag path - handles both countries and regions
  const getFlagPath = (code, isRegional) => {
    if (!code) return null;
    
    const upperCode = code.toUpperCase().replace(/\s+/g, '');
    
    // Check if it's a known region with a flag
    if (isRegional || upperCode in REGION_FLAGS) {
      const regionFlag = REGION_FLAGS[upperCode];
      if (regionFlag) {
        return `/flags/4x3/${regionFlag}.svg`;
      }
      // Region without specific flag - will show globe icon
      return null;
    }
    
    // For countries: If it's already a 2-letter ISO code, use it directly (lowercase)
    // Otherwise, try to get the ISO code from the mapping
    if (code.length === 2) {
      return `/flags/4x3/${code.toLowerCase()}.svg`;
    }
    
    // For longer codes like "netherlands", use the ISO code mapper
    const isoCode = getISOCode(code);
    return `/flags/4x3/${isoCode}.svg`;
  };

  // Check if eSIM is expired based on usage data from Airalo API
  const isExpired = usageData ? (
    // Check API status field (EXPIRED, RECYCLED, FINISHED are considered expired)
    usageData.status === 'EXPIRED' || 
    usageData.status === 'RECYCLED' || 
    usageData.status === 'FINISHED' ||
    // Check expired_at timestamp if available
    (usageData.expired_at && new Date(usageData.expired_at) < new Date())
  ) : false;

  // Get status color and label
  const getStatusInfo = (status, isExpired) => {
    // If we have usage data indicating expiration, use that
    if (isExpired) {
      return { color: 'bg-gray-400', textColor: 'text-gray-500', bgColor: 'bg-gray-100', label: t('dashboard.status.expired', 'Expired') };
    }
    
    // Otherwise use the order status
    switch (status?.toLowerCase()) {
      case 'active':
        return { color: 'bg-emerald-500', textColor: 'text-emerald-600', bgColor: 'bg-emerald-50', label: t('dashboard.status.active', 'Active') };
      case 'completed':
        return { color: 'bg-emerald-500', textColor: 'text-emerald-600', bgColor: 'bg-emerald-50', label: t('dashboard.status.completed', 'Active') };
      case 'pending':
        return { color: 'bg-amber-500', textColor: 'text-amber-600', bgColor: 'bg-amber-50', label: t('dashboard.status.pending', 'Pending') };
      case 'expired':
        return { color: 'bg-gray-400', textColor: 'text-gray-500', bgColor: 'bg-gray-100', label: t('dashboard.status.expired', 'Expired') };
      default:
        return { color: 'bg-gray-400', textColor: 'text-gray-500', bgColor: 'bg-gray-100', label: status || t('dashboard.unknown', 'Unknown') };
    }
  };

  const statusInfo = getStatusInfo(order.status, isExpired);
  
  // Use shared utility to get consistent country data (handles both formats)
  const countryData = mapPackageCountryData(order);
  const countryCode = countryData?.countryCode || null;
  const countryName = countryData?.countryName || null;
  const isRegional = countryData?.isRegional || false;
  
  const flagPath = getFlagPath(countryCode, isRegional);
  const usage = usageData ? formatDataUsage(usageData.remaining, usageData.total, usageData.is_unlimited) : null;
  
  // Debug logging
  console.log('🎌 EsimCard country data:', { 
    orderId: order.id,
    countryCode,
    countryName,
    isRegional,
    flagPath,
    // Raw order fields for debugging
    rawCountryCode: order.countryCode,
    rawCountry_code: order.country_code,
    rawCountryName: order.countryName,
    rawCountry_region: order.country_region
  });
  
  // Use shared utility for plan details (handles both formats)
  const rawPlanDetails = order.planDetails || {};
  const mappedPlanDetails = mapPlanDetails(rawPlanDetails);
  const planDetails = {
    ...rawPlanDetails,
    ...mappedPlanDetails
  };
  const dataDisplay = planDetails.data || `${planDetails.dataAmountMb || 0} MB`;
  const validityDisplay = planDetails.validity ? `${planDetails.validity} ${t('dashboard.days', 'days')}` : null;
  
  // Country/Region name - check multiple possible field names
  const fullName = countryName || countryCode || '';
  const displayName = fullName.length > 16 ? fullName.substring(0, 16) + '...' : fullName;

  return (
    <div
      className={`group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer h-full ${
        isExpired
          ? 'border border-gray-200 opacity-80 hover:opacity-100'
          : 'border border-gray-200 hover:border-tufts-blue/30'
      }`}
      title={fullName}
      onClick={() => onViewQRCode(order)}
      dir={direction}
      lang={detectedLanguage}
    >
      {/* Card Header with Status */}
      <div className={`relative px-4 sm:px-5 pt-4 sm:pt-5 pb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
        {/* Status Badge - Absolute positioned */}
        <div className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'}`}>
          <div className={`inline-flex items-center gap-1.5 ${statusInfo.bgColor} px-2.5 py-1 rounded-full `}>
            <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.color} animate-pulse`}></div>
            <span className={`text-xs font-medium ${statusInfo.textColor}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Country/Region Header */}
        <div className={`flex items-center gap-3.5 `}>
          {/* Flag Container - Featured Icon Style (Untitled UI) */}
          <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden shadow-sm">
            {flagPath ? (
              <img
                src={flagPath}
                alt={`${fullName} flag`}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerHTML = `
                      <div class="w-full h-full bg-gradient-to-br from-tufts-blue to-blue-600 flex items-center justify-center">
                        <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    `;
                  }
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-tufts-blue to-blue-600 flex items-center justify-center">
                <Globe className="w-7 h-7 text-white" />
              </div>
            )}
          </div>
          
          <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate leading-tight">
              {displayName}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">
              {order.planName || t('dashboard.unknownPlan', 'Unknown Plan')}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Section - Untitled UI Card Style */}
      <div className="px-4 sm:px-5 py-3 bg-gray-50/50 border-y border-gray-100">
        <div className={`flex items-center justify-between `}>
          {/* Data Usage with Circular Progress */}
          <div className={`flex items-center gap-3 `}>
            {loadingUsage ? (
              <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse"></div>
            ) : usage ? (
              <CircularProgress 
                percentage={usage.remainingPercentage} 
                size={48} 
                strokeWidth={4}
                isExpired={isExpired}
              />
            ) : (
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isExpired ? 'bg-gray-100' : 'bg-tufts-blue/10'
              }`}>
                <Wifi className={`w-5 h-5 ${isExpired ? 'text-gray-400' : 'text-tufts-blue'}`} />
              </div>
            )}
            
            <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-xs text-gray-500 mb-0.5">
                {isExpired ? t('dashboard.dataUsed', 'Data Used') : t('dashboard.dataRemaining', 'Remaining')}
              </p>
              {loadingUsage ? (
                <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
              ) : (
                <p className={`text-sm font-semibold ${isExpired ? 'text-gray-600' : 'text-gray-900'}`}>
                  {usage ? usage.text : dataDisplay}
                </p>
              )}
            </div>
          </div>

          {/* Validity Badge */}
          {validityDisplay && (
            <div className={`flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200 `}>
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-600">{validityDisplay}</span>
            </div>
          )}
        </div>
        
        {/* Expiration notice */}
        {isExpired && usageData?.expired_at && (
          <div className={`flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-200 `}>
            <Clock className="w-3 h-3 text-amber-500" />
            <span className="text-xs text-amber-600">
              {t('dashboard.expiredOn', 'Expired on')} {new Date(usageData.expired_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Plan Features - Tag Style */}
      {(planDetails.voice > 0 || planDetails.sms > 0 || (planDetails.operator && planDetails.operator !== 'Airalo Partner Network')) && (
        <div className={`px-4 sm:px-5 py-2.5 flex flex-wrap gap-2 `}>
          {planDetails.voice > 0 && (
            <div className={`inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-xs font-medium `}>
              <Phone className="w-3 h-3" />
              <span>{planDetails.voice} {t('dashboard.min', 'min')}</span>
            </div>
          )}
          
          {planDetails.sms > 0 && (
            <div className={`inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-xs font-medium `}>
              <MessageSquare className="w-3 h-3" />
              <span>{planDetails.sms} SMS</span>
            </div>
          )}
          
          {planDetails.operator && planDetails.operator !== 'Airalo Partner Network' && (
            <div className={`inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium `}>
              <Signal className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{planDetails.operator}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer - Price & CTA */}
      <div className={`px-4 sm:px-5 py-3.5 border-t border-gray-100 flex items-center justify-between `}>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">{t('dashboard.price', 'Price')}</p>
          <p className="text-lg font-bold text-gray-900">
            {formatPrice(order.amount || 0)}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewQRCode(order);
          }}
          className={`group/btn inline-flex items-center gap-2 px-4 py-2.5 bg-tufts-blue text-white rounded-lg font-medium hover:bg-tufts-blue/90 active:scale-[0.98] transition-all duration-200 shadow-sm hover:shadow `}
        >
          <QrCode className="w-4 h-4" />
          <span className="text-sm">{t('dashboard.viewQR', 'View QR')}</span>
          <ChevronRight className="w-4 h-4 opacity-60 group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Subtle Hover Glow Effect */}
      <div className="absolute inset-0 rounded-xl ring-2 ring-tufts-blue/0 group-hover:ring-tufts-blue/20 transition-all duration-300 pointer-events-none"></div>
    </div>
  );
};

export default EsimCard;
