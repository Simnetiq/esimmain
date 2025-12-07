'use client';

import React from 'react';
import { Globe, QrCode, Wifi, Phone, MessageSquare, Clock, Signal } from 'lucide-react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getISOCode } from '@esim/shared/utils/countryCodeMap';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import Image from 'next/image';

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

const EsimCard = ({ order, usageData, loadingUsage, onViewQRCode, isRTL }) => {
  const { t } = useI18n();

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
  
  // Get country code - check multiple possible field names (camelCase and underscore)
  const countryCode = order.countryCode || order.country_code || null;
  const countryName = order.countryName || order.country_region || null;
  const isRegional = order.isRegional || order.is_regional || false;
  
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
  
  // Plan details
  const planDetails = order.planDetails || {};
  const dataDisplay = planDetails.data || `${planDetails.dataAmountMb || 0} MB`;
  const validityDisplay = planDetails.validity ? `${planDetails.validity} ${t('dashboard.days', 'days')}` : null;
  
  // Country/Region name - check multiple possible field names
  const fullName = countryName || countryCode || '';
  const displayName = fullName.length > 16 ? fullName.substring(0, 16) + '...' : fullName;

  return (
    <div
      className={`group relative bg-white border rounded-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer h-full ${
        isExpired 
          ? 'border-gray-300 opacity-75 hover:opacity-90' 
          : 'border-gray-200'
      }`}
      title={fullName}
      onClick={() => onViewQRCode(order)}
    >
      {/* Status Badge - Top Right */}
      <div className={`absolute top-2 z-10 ${isRTL ? 'left-2' : 'right-2'}`}>
        <div className={`flex items-center gap-1.5 ${statusInfo.bgColor} px-2 py-1 rounded ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.color}`}></div>
          <span className={`text-xs font-medium ${statusInfo.textColor}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 h-full flex flex-col">
        {/* Country Flag & Name */}
        <div className={`flex items-center gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* 4:3 Flag Container - Like CountryCard */}
          <div className="flex-shrink-0 w-16 sm:w-20 aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border-2 border-gray-200 overflow-hidden">
            {flagPath ? (
              <Image
                src={flagPath}
                alt={`${fullName} flag`}
                width={80}
                height={60}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  // Replace with globe icon on error
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerHTML = `
                      <div class="w-full h-full bg-gradient-to-br from-tufts-blue to-blue-600 flex items-center justify-center">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    `;
                  }
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-tufts-blue to-blue-600 flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
          
          <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
              {displayName}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 truncate">
              {order.planName || t('dashboard.unknownPlan', 'Unknown Plan')}
            </p>
          </div>
        </div>

        {/* Data Usage Bar (show for active and expired eSIMs) */}
        {(usage || order.status === 'active' || isExpired) && (
          <div className="mb-3">
            <div className={`flex items-center justify-between mb-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Wifi className={`w-3.5 h-3.5 ${isExpired ? 'text-gray-400' : 'text-tufts-blue'}`} />
                <span className={`text-xs font-medium ${isExpired ? 'text-gray-500' : 'text-gray-600'}`}>
                  {isExpired ? t('dashboard.dataUsed', 'Data Used') : t('dashboard.dataRemaining', 'Data Remaining')}
                </span>
              </div>
              {loadingUsage ? (
                <div className="animate-pulse bg-gray-200 h-3.5 w-16 rounded"></div>
              ) : usage ? (
                <span className={`text-xs font-semibold ${isExpired ? 'text-gray-500' : 'text-tufts-blue'}`}>
                  {usage.text}
                </span>
              ) : (
                <span className="text-xs text-gray-400">
                  {dataDisplay}
                </span>
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="h-1.5 bg-gray-100 rounded overflow-hidden">
              {loadingUsage ? (
                <div className="h-full w-full bg-gray-200 animate-pulse"></div>
              ) : usage ? (
                <div 
                  className={`h-full rounded transition-all duration-500 ${
                    isExpired 
                      ? 'bg-gradient-to-r from-gray-400 to-gray-500' 
                      : 'bg-gradient-to-r from-tufts-blue to-blue-500'
                  }`}
                  style={{ width: `${usage.remainingPercentage}%` }}
                ></div>
              ) : (
                <div className={`h-full w-full rounded ${
                  isExpired 
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500' 
                    : 'bg-gradient-to-r from-tufts-blue to-blue-500'
                }`}></div>
              )}
            </div>
            
            {/* Expiration Date (if expired and date available) */}
            {isExpired && usageData?.expired_at && (
              <div className={`flex items-center gap-1.5 mt-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {t('dashboard.expiredOn', 'Expired on')} {new Date(usageData.expired_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Plan Details Row */}
        <div className={`flex flex-wrap gap-1.5 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Validity */}
          {validityDisplay && (
            <div className={`flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600">{validityDisplay}</span>
            </div>
          )}
          
          {/* Voice Minutes */}
          {planDetails.voice > 0 && (
            <div className={`flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Phone className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600">{planDetails.voice} {t('dashboard.min', 'min')}</span>
            </div>
          )}
          
          {/* SMS */}
          {planDetails.sms > 0 && (
            <div className={`flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <MessageSquare className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600">{planDetails.sms} SMS</span>
            </div>
          )}
          
          {/* Operator */}
          {planDetails.operator && planDetails.operator !== 'Airalo Partner Network' && (
            <div className={`flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Signal className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600 truncate max-w-[100px]">{planDetails.operator}</span>
            </div>
          )}
        </div>

        {/* Bottom Row: Price and QR Button */}
        <div className={`mt-auto flex items-center justify-between pt-3 border-t border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-tufts-blue">
              {formatPrice(order.amount || 0)}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewQRCode(order);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 bg-tufts-blue text-white rounded hover:bg-tufts-blue/90 transition-all duration-200 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <QrCode className="w-4 h-4" />
            <span className="text-sm font-medium">{t('dashboard.viewQR', 'View QR')}</span>
          </button>
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 border-2 border-tufts-blue rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </div>
  );
};

export default EsimCard;
