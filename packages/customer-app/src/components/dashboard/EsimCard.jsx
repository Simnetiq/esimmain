/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getISOCode } from '@esim/shared/utils/countryCodeMap';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { mapPackageCountryData, mapPlanDetails } from '@esim/shared/utils/esimFieldMapper';

// Inline SVG icons to avoid lucide-react bundle overhead
const GlobeIcon = ({ className = "w-7 h-7" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
  </svg>
);

const QrCodeIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/>
    <path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>
  </svg>
);

const WifiIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>
  </svg>
);

const ClockIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const PhoneIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const MessageIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
  </svg>
);

const SignalIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/>
  </svg>
);

const ArrowRightIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
);

// Regional flag mapping
const REGION_FLAGS = {
  'EUROPE': 'eu',
  'EU': 'eu',
  'GLOBAL': 'un',
  'WORLDWIDE': 'un',
  'MIDDLEEAST': 'arab',
  'ARAB': 'arab',
  'ASIA': null,
  'ASIALINK': null,
  'AFRICA': null,
  'AMERICAS': null,
  'OCEANIA': null,
  'CARIBBEAN': null,
  'LATINAMERICA': null
};

// Circular Progress Ring Component
const CircularProgress = ({ percentage, size = 40, strokeWidth = 3, isExpired = false }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />
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
        <span className={`text-[10px] font-bold ${isExpired ? 'text-gray-500' : 'text-gray-700'}`}>
          {percentage}%
        </span>
      </div>
    </div>
  );
};

const EsimCard = ({ order, usageData, loadingUsage, onViewQRCode, isRTL }) => {
  const { t } = useI18n();

  // Format data usage with progress
  const formatDataUsage = (remaining, total, isUnlimited) => {
    if (isUnlimited) return { text: t('dashboard.unlimited', 'Unlimited'), percentage: 0, isUnlimited: true };
    if (remaining == null || total == null) return null;
    
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

  // Get flag path
  const getFlagPath = (code, isRegional) => {
    if (!code) return null;
    
    const upperCode = code.toUpperCase().replace(/\s+/g, '');
    
    if (isRegional || upperCode in REGION_FLAGS) {
      const regionFlag = REGION_FLAGS[upperCode];
      if (regionFlag) {
        return `/flags/4x3/${regionFlag}.svg`;
      }
      return null;
    }
    
    if (code.length === 2) {
      return `/flags/4x3/${code.toLowerCase()}.svg`;
    }
    
    const isoCode = getISOCode(code);
    return `/flags/4x3/${isoCode}.svg`;
  };

  // Check if eSIM is expired
  const isExpired = usageData ? (
    usageData.status === 'EXPIRED' || 
    usageData.status === 'RECYCLED' || 
    usageData.status === 'FINISHED' ||
    (usageData.expired_at && new Date(usageData.expired_at) < new Date())
  ) : false;

  // Get status info
  const getStatusInfo = (status, isExpired) => {
    if (isExpired) {
      return { color: 'bg-gray-400', textColor: 'text-gray-600', bgColor: 'bg-gray-100', label: t('dashboard.status.expired', 'Expired') };
    }
    
    switch (status?.toLowerCase()) {
      case 'active':
      case 'completed':
        return { color: 'bg-emerald-500', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', label: t('dashboard.status.active', 'Active') };
      case 'pending':
        return { color: 'bg-amber-500', textColor: 'text-amber-700', bgColor: 'bg-amber-50', label: t('dashboard.status.pending', 'Pending') };
      case 'expired':
        return { color: 'bg-gray-400', textColor: 'text-gray-600', bgColor: 'bg-gray-100', label: t('dashboard.status.expired', 'Expired') };
      default:
        return { color: 'bg-gray-400', textColor: 'text-gray-600', bgColor: 'bg-gray-100', label: status || t('dashboard.unknown', 'Unknown') };
    }
  };

  const statusInfo = getStatusInfo(order.status, isExpired);
  
  // Get country data
  const countryData = mapPackageCountryData(order);
  const countryCode = countryData?.countryCode || null;
  const countryName = countryData?.countryName || null;
  const isRegional = countryData?.isRegional || false;
  
  const flagPath = getFlagPath(countryCode, isRegional);
  const usage = usageData ? formatDataUsage(usageData.remaining, usageData.total, usageData.is_unlimited) : null;
  
  // Get plan details
  const rawPlanDetails = order.planDetails || {};
  const mappedPlanDetails = mapPlanDetails(rawPlanDetails);
  const planDetails = { ...rawPlanDetails, ...mappedPlanDetails };
  const dataDisplay = planDetails.data || `${planDetails.dataAmountMb || 0} MB`;
  const validityDisplay = planDetails.validity ? `${planDetails.validity}d` : null;
  
  // Display name
  const fullName = countryName || countryCode || '';
  const displayName = fullName.length > 20 ? fullName.substring(0, 20) + '...' : fullName;

  return (
    <div
      className={`group relative bg-gray-50 overflow-hidden hover:bg-white transition-all duration-500 cursor-pointer h-full flex flex-col ${
        isExpired ? 'opacity-75 hover:opacity-100' : ''
      }`}
      title={fullName}
      onClick={() => onViewQRCode(order)}
    >
      {/* Visual Header Area - Flag/Globe Display */}
      <div className="relative h-28 sm:h-32 lg:h-36 overflow-hidden bg-gray-100">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.05) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }} />
        </div>
        
        {/* Main Flag/Globe Display - Centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          {flagPath ? (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-lg group-hover:scale-110 transition-transform duration-500 border-4 border-white/80">
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
                        <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                          <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
                        </svg>
                      </div>
                    `;
                  }
                }}
              />
            </div>
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-tufts-blue to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500 border-4 border-white/80">
              <GlobeIcon className="w-10 h-10 text-white" />
            </div>
          )}
        </div>
        
        {/* Status Badge - Top Right */}
        <div className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'}`}>
          <div className={`inline-flex items-center gap-1.5 ${statusInfo.bgColor} px-2.5 py-1 rounded-full shadow-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.color} ${!isExpired ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-semibold ${statusInfo.textColor}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>
        
        {/* Data Usage Badge - Bottom Left */}
        <div className={`absolute bottom-3 ${isRTL ? 'right-3' : 'left-3'}`}>
          <div className="px-2.5 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg flex items-center gap-2 shadow-sm">
            {loadingUsage ? (
              <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
            ) : usage ? (
              <>
                <CircularProgress 
                  percentage={usage.remainingPercentage} 
                  size={24} 
                  strokeWidth={2.5}
                  isExpired={isExpired}
                />
                <span className="text-xs font-semibold text-eerie-black">
                  {usage.isUnlimited ? '∞' : `${usage.remaining} ${usage.unit}`}
                </span>
              </>
            ) : (
              <>
                <WifiIcon className="w-4 h-4 text-tufts-blue" />
                <span className="text-xs font-semibold text-eerie-black">{dataDisplay}</span>
              </>
            )}
          </div>
        </div>
        
        {/* Validity Badge - Bottom Right */}
        {validityDisplay && (
          <div className={`absolute bottom-3 ${isRTL ? 'left-3' : 'right-3'}`}>
            <div className="px-2.5 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg flex items-center gap-1.5 shadow-sm">
              <ClockIcon className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-eerie-black">{validityDisplay}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Content Area */}
      <div className="p-4 lg:p-5 flex-1 flex flex-col">
        {/* Plan name as description */}
        <p className="text-gray-500 text-sm leading-relaxed mb-1 truncate">
          {order.planName || t('dashboard.unknownPlan', 'Unknown Plan')}
        </p>
        
        {/* Country/Region as title */}
        <h3 className={`text-lg lg:text-xl font-semibold text-eerie-black mb-3 ${isRTL ? 'text-right' : ''}`}>
          {displayName}
        </h3>

        {/* Plan Features Tags */}
        {(planDetails.voice > 0 || planDetails.sms > 0 || (planDetails.operator && planDetails.operator !== 'Airalo Partner Network')) && (
          <div className={`flex flex-wrap gap-1.5 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {planDetails.voice > 0 && (
              <span className={`inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                <PhoneIcon />
                <span>{planDetails.voice} min</span>
              </span>
            )}
            
            {planDetails.sms > 0 && (
              <span className={`inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[11px] font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                <MessageIcon />
                <span>{planDetails.sms} SMS</span>
              </span>
            )}
            
            {planDetails.operator && planDetails.operator !== 'Airalo Partner Network' && (
              <span className={`inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                <SignalIcon />
                <span className="truncate max-w-[80px]">{planDetails.operator}</span>
              </span>
            )}
          </div>
        )}

        {/* Expiration notice */}
        {isExpired && usageData?.expired_at && (
          <div className={`flex items-center gap-1.5 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <ClockIcon className="w-3 h-3 text-amber-500" />
            <span className="text-xs text-amber-600">
              {t('dashboard.expiredOn', 'Expired on')} {new Date(usageData.expired_at).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer - Price & CTA */}
        <div className={`flex items-center justify-between pt-3 border-t border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div>
            <p className="text-[11px] text-gray-500 mb-0.5">{t('dashboard.price', 'Price')}</p>
            <p className="text-lg font-bold text-eerie-black">
              {formatPrice(order.amount || 0)}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewQRCode(order);
            }}
            className={`group/btn inline-flex items-center gap-2 px-4 py-2.5 bg-tufts-blue text-white rounded-full font-medium hover:bg-tufts-blue/90 active:scale-[0.98] transition-all duration-200 shadow-sm hover:shadow ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <QrCodeIcon className="w-4 h-4" />
            <span className="text-sm">{t('dashboard.viewQR', 'View QR')}</span>
            <ArrowRightIcon className="w-3.5 h-3.5 opacity-60 group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EsimCard;
