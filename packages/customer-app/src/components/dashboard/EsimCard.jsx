'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { mapPackageCountryData, mapPlanDetails, getCachedCountryImage, setCachedCountryImage } from '@esim/shared/utils/esimFieldMapper';
import { useCountryNames } from '@esim/shared/hooks/useCountriesSupabase';
import { getSupabase } from '@esim/shared/lib/supabase';
import Image from 'next/image';

// ─── Inline SVG icons (no lucide-react) ───────────────────────────────────

const GlobeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
  </svg>
);

const WifiIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>
  </svg>
);

const PhoneIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.9a16 16 0 0 0 6.29 6.29l.94-.93a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z"/>
  </svg>
);

const MessageSquareIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const ArrowUpRightIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 7h10v10"/><path d="M7 17 17 7"/>
  </svg>
);

const TrendingUpIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
  </svg>
);

const TrendingDownIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>
  </svg>
);

const EsimCard = ({ order, usageData, loadingUsage, onViewQRCode, planMetadata, planMetadataLoading }) => {
  const pathname = usePathname();
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [countryImage, setCountryImage] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFetchDone, setImageFetchDone] = useState(false);

  const { getLocalizedName } = useCountryNames(locale || 'en');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch country/region image from Supabase
  useEffect(() => {
    const fetchCountryImage = async () => {
      const countryData = mapPackageCountryData(order);
      const isRegional = countryData?.isRegional || order.is_regional;

      let code = countryData?.countryCode;
      if (!code && order.country_codes?.length >= 1) {
        code = order.country_codes[0];
      }

      const countryName = countryData?.countryName || order.country_region;

      if (!code && !countryName) {
        setCountryImage(null);
        return;
      }

      // Check shared cache first
      const cacheKey = code || countryName;
      const cached = getCachedCountryImage(cacheKey);
      if (cached) { setCountryImage(cached); return; }

      try {
        const supabase = getSupabase();
        let imageUrl = null;

        if (countryName && typeof countryName === 'string') {
          const nameSlug = countryName.toLowerCase().replace(/\s+/g, '-');
          const { data } = await supabase.from('countries').select('image_url').eq('id', nameSlug).maybeSingle();
          if (data) imageUrl = data.image_url;
        }

        if (!imageUrl && code) {
          const codeSlug = code.toLowerCase().replace(/\s+/g, '-');
          const { data } = await supabase.from('countries').select('image_url').eq('id', codeSlug).maybeSingle();
          if (data) imageUrl = data.image_url;
        }

        if (!imageUrl && isRegional && countryName) {
          const regionSlug = countryName.toLowerCase().replace(/\s+/g, '-');
          const { data } = await supabase.from('countries').select('image_url').eq('id', regionSlug).maybeSingle();
          if (data) imageUrl = data.image_url;
        }

        if (!imageUrl && code && !isRegional) {
          const { data } = await supabase.from('countries').select('image_url').eq('id', code.toUpperCase()).maybeSingle();
          if (data) imageUrl = data.image_url;
        }

        if (imageUrl) setCachedCountryImage(cacheKey, imageUrl);
        setCountryImage(imageUrl || null);
        setImageFetchDone(true);
      } catch (error) {
        console.error('Error fetching country image:', error);
        setImageFetchDone(true);
      }
    };

    if (mounted) {
      fetchCountryImage();
    }
  }, [order, mounted]);

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

  // Format data usage
  const formatDataUsage = (remaining, total, isUnlimited) => {
    if (isUnlimited) return { text: t('dashboard.unlimited', 'Unlimited'), percentage: 0, remainingPercentage: 100 };
    if (remaining == null || total == null) return null;

    const useGB = total >= 1024;
    const unit = useGB ? 'GB' : 'MB';

    const remainingFormatted = useGB ? (remaining / 1024).toFixed(1) : Math.round(remaining);
    const totalFormatted = useGB ? (total / 1024).toFixed(1) : Math.round(total);

    const usedPercentage = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;

    return {
      text: `${remainingFormatted}${unit}`,
      totalText: `${totalFormatted}${unit}`,
      remaining: remainingFormatted,
      total: totalFormatted,
      unit,
      percentage: usedPercentage,
      remainingPercentage: 100 - usedPercentage
    };
  };

  // Check if eSIM is expired
  const isExpired = usageData ? (
    usageData.status === 'EXPIRED' ||
    usageData.status === 'RECYCLED' ||
    usageData.status === 'FINISHED' ||
    (usageData.expired_at && new Date(usageData.expired_at) < new Date())
  ) : false;

  // Get status info
  const getStatusInfo = (status, isExpiredState) => {
    if (isExpiredState) {
      return {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-200',
        label: t('dashboard.status.expired', 'Expired'),
        icon: TrendingDownIcon
      };
    }

    switch (status?.toLowerCase()) {
      case 'active':
      case 'completed':
        return {
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-700',
          borderColor: 'border-emerald-200',
          label: t('dashboard.status.active', 'Active'),
          icon: TrendingUpIcon
        };
      case 'pending':
        return {
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-700',
          borderColor: 'border-amber-200',
          label: t('dashboard.status.pending', 'Pending'),
          icon: ClockIcon
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200',
          label: status || t('dashboard.unknown', 'Unknown'),
          icon: ClockIcon
        };
    }
  };

  const statusInfo = getStatusInfo(order.status, isExpired);
  const StatusIcon = statusInfo.icon;

  const countryData = mapPackageCountryData(order);
  const countryCode = countryData?.countryCode || order.countryCode || order.country_code;
  const fallbackName = countryData?.countryName || order.country_region || '';

  // Get localized country name from Supabase, fallback to stored name
  const localizedCountryName = useMemo(() => {
    if (!countryCode) return fallbackName;
    return getLocalizedName(countryCode, fallbackName);
  }, [countryCode, fallbackName, getLocalizedName]);

  const usage = usageData ? formatDataUsage(usageData.remaining, usageData.total, usageData.is_unlimited) : null;

  const rawPlanDetails = order.planDetails || {};
  const mappedPlanDetails = mapPlanDetails(rawPlanDetails);
  const planDetails = { ...rawPlanDetails, ...mappedPlanDetails };
  const dataDisplay = planDetails.data || `${planDetails.dataAmountMb || 0} MB`;

  const fullName = localizedCountryName || fallbackName;

  // Watermark: use live total data if available, else plan data display
  const watermarkText = usage
    ? `${usage.total}${usage.unit}`
    : dataDisplay.replace(/\s/g, '');

  return (
    <div
      className={`group relative w-full bg-[var(--bg-secondary)] overflow-hidden cursor-pointer transition-all duration-500 hover:bg-[var(--bg-primary)] ${
        isExpired ? 'opacity-75 hover:opacity-100' : ''
      }`}
      onClick={() => onViewQRCode(order)}
      lang={detectedLanguage}
    >
      {/* Faded data watermark */}
      <span
        className="absolute top-4 end-4 hidden sm:block text-[5rem] lg:text-[6rem] font-semibold leading-none text-gray-300 dark:text-gray-700 select-none pointer-events-none"
        aria-hidden="true"
      >
        {watermarkText}
      </span>

      {/* Content sits above watermark */}
      <div className="relative p-4 md:p-5">

        {/* Header Section */}
        <div className="flex items-center gap-3 mb-4 rtl-native-flex">
          <div className="w-12 h-12 bg-[var(--subtle-bg)] flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 relative">
            {countryImage ? (
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-[var(--card-border)] rounded-full animate-pulse" />
                )}
                <Image
                  src={countryImage}
                  alt={fullName}
                  width={48}
                  height={48}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  unoptimized
                  onLoad={() => setImageLoaded(true)}
                />
              </>
            ) : !imageFetchDone ? (
              <div className="absolute inset-0 bg-[var(--card-border)] rounded-full animate-pulse" />
            ) : (
              <GlobeIcon className="w-6 h-6 text-text-muted" />
            )}
          </div>
          <div>
            <h5 className="text-lg font-semibold text-eerie-black leading-tight">
              {fullName || t('dashboard.unknownRegion', 'Unknown')}
            </h5>
            <p className="text-sm text-text-muted truncate max-w-[180px]">
              {order.planName || t('dashboard.unknownPlan', 'Unknown Plan')}
            </p>
          </div>
        </div>

        {/* Data Remaining */}
        <div className="mb-4">
          <p className="text-text-muted text-xs font-normal mb-1 flex items-center gap-1 rtl-native-flex">
            <WifiIcon className="w-3.5 h-3.5" />
            {t('dashboard.dataRemaining', 'Data Remaining')}
          </p>
          {loadingUsage ? (
            <div className="h-6 w-20 bg-[var(--card-border)] rounded animate-pulse"></div>
          ) : (
            <p className={`text-base font-semibold ${isExpired ? 'text-text-muted' : 'text-text-primary'}`}>
              {usage ? `${usage.text} / ${usage.totalText}` : dataDisplay}
            </p>
          )}
        </div>


        {/* Features Tags (only if present) */}
        {(() => {
          const hasVoice = planMetadata?.hasVoice || planDetails.voice > 0;
          const hasSms = planMetadata?.hasSms || planDetails.sms > 0;
          const voiceMinutes = planMetadata?.voice || planDetails.voice || 0;
          const smsCount = planMetadata?.sms || planDetails.sms || 0;

          if (!hasVoice && !hasSms) return null;

          return (
            <div className="flex flex-wrap gap-2 mb-4 justify-start rtl-native-flex">
              {hasVoice && voiceMinutes > 0 && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-1">
                  <PhoneIcon className="w-3 h-3" />
                  {voiceMinutes} {t('dashboard.min', 'min')}
                </span>
              )}
              {hasSms && smsCount > 0 && (
                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-medium px-2 py-1">
                  <MessageSquareIcon className="w-3 h-3" />
                  {smsCount} SMS
                </span>
              )}
            </div>
          );
        })()}

        {/* Operator Branding - from Supabase */}
        {planMetadata?.operatorName && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-[var(--subtle-bg)] rtl-native-flex">
            {planMetadata.operatorLogo ? (
              <Image
                src={planMetadata.operatorLogo}
                alt={planMetadata.operatorName}
                width={24}
                height={24}
                className="h-6 w-auto object-contain"
                unoptimized
              />
            ) : null}
            <span className="text-xs text-text-muted">
              {t('dashboard.poweredBy', 'Powered by')}{' '}
              <span
                className="font-medium"
                style={{
                  background: planMetadata.operatorGradientStart && planMetadata.operatorGradientEnd
                    ? `linear-gradient(135deg, ${planMetadata.operatorGradientStart}, ${planMetadata.operatorGradientEnd})`
                    : 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                {planMetadata.operatorName}
              </span>
            </span>
          </div>
        )}

        {/* Footer — Price + Status */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--divider)] rtl-native-flex">
          <div>
            <span className="text-xs text-text-muted">{t('dashboard.price', 'Price')}</span>
            <p className="text-lg font-bold text-eerie-black">{formatPrice(order.amount || 0)}</p>
          </div>
          <span className={`inline-flex items-center ${statusInfo.bgColor} border ${statusInfo.borderColor} ${statusInfo.textColor} text-xs font-medium px-2 py-1 rounded-lg`}>
            <StatusIcon className="w-3.5 h-3.5 me-1" />
            {statusInfo.label}
          </span>
        </div>

        {/* View Details CTA — text centered, arrow pinned end */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewQRCode(order);
          }}
          className={`relative w-full mt-4 flex items-center justify-center py-3 bg-[var(--login-bg)] text-[var(--login-text)] text-sm font-medium rounded-full transition-opacity duration-300 hover:opacity-90`}
        >
          <span>{t('dashboard.viewDetails', 'View Details')}</span>
          <span className="absolute top-1/2 -translate-y-1/2 end-3 w-6 h-6 rounded-full bg-[var(--login-text)] flex items-center justify-center">
            <ArrowUpRightIcon className="w-3.5 h-3.5 text-[var(--login-bg)] rtl:-scale-x-100" />
          </span>
        </button>

      </div>
    </div>
  );
};

export default EsimCard;
