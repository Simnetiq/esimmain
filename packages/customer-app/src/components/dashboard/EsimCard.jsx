'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Globe, Wifi, Phone, MessageSquare, Clock, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { mapPackageCountryData, mapPlanDetails, getCachedCountryImage, setCachedCountryImage } from '@esim/shared/utils/esimFieldMapper';
import { useCountryNames } from '@esim/shared/hooks/useCountriesSupabase';
import { getSupabase } from '@esim/shared/lib/supabase';
import Image from 'next/image';

const EsimCard = ({ order, usageData, loadingUsage, onViewQRCode, planMetadata, planMetadataLoading }) => {
  const pathname = usePathname();
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [countryImage, setCountryImage] = useState(null);

  // Get localized country names from Supabase
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
      } catch (error) {
        console.error('Error fetching country image:', error);
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

  const direction = getLanguageDirection(detectedLanguage);
  const isRTL = direction === 'rtl';

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
        icon: TrendingDown
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
          icon: TrendingUp
        };
      case 'pending':
        return {
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-700',
          borderColor: 'border-amber-200',
          label: t('dashboard.status.pending', 'Pending'),
          icon: Clock
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200',
          label: status || t('dashboard.unknown', 'Unknown'),
          icon: Clock
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
  const validityDisplay = planDetails.validity || null;

  const fullName = localizedCountryName || fallbackName;

  return (
    <div
      className={`w-full bg-white border rounded-xl shadow-sm p-4 md:p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-300 ${
        isExpired ? 'opacity-75 hover:opacity-100' : ''
      }`}
      onClick={() => onViewQRCode(order)}
      lang={detectedLanguage}
    >
      {/* Header Section */}
      <div className="flex justify-between pb-4 mb-4 border-b border-gray-100" dir={direction}>
        {/* In RTL: Status badge first (appears on right), then country info (appears on left) */}
        {isRTL ? (
          <>
            {/* Status Badge - renders first, appears on RIGHT in RTL due to justify-between + dir=rtl */}
            <div>
              <span className={`inline-flex items-center flex-row-reverse ${statusInfo.bgColor} border ${statusInfo.borderColor} ${statusInfo.textColor} text-xs font-medium px-2 py-1 rounded-lg`}>
                <StatusIcon className="w-3.5 h-3.5 ms-1" />
                {statusInfo.label}
              </span>
            </div>
            {/* Country Info - renders second, appears on LEFT in RTL */}
            {/* In RTL: text first, then image (so image appears on LEFT of text visually) */}
            <div className="flex items-center gap-3">
              <div>
                <h5 className="text-lg font-semibold text-gray-900 leading-tight">
                  {fullName || t('dashboard.unknownRegion', 'Unknown')}
                </h5>
                <p className="text-sm text-gray-500 truncate max-w-[180px]">
                  {order.planName || t('dashboard.unknownPlan', 'Unknown Plan')}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 border border-gray-200 flex items-center justify-center rounded-full overflow-hidden flex-shrink-0">
                {countryImage ? (
                  <Image
                    src={countryImage}
                    alt={fullName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <Globe className="w-6 h-6 text-gray-500" />
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Country Info - renders first, appears on LEFT in LTR */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 border border-gray-200 flex items-center justify-center rounded-full overflow-hidden flex-shrink-0">
                {countryImage ? (
                  <Image
                    src={countryImage}
                    alt={fullName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <Globe className="w-6 h-6 text-gray-500" />
                )}
              </div>
              <div>
                <h5 className="text-lg font-semibold text-gray-900 leading-tight">
                  {fullName || t('dashboard.unknownRegion', 'Unknown')}
                </h5>
                <p className="text-sm text-gray-500 truncate max-w-[180px]">
                  {order.planName || t('dashboard.unknownPlan', 'Unknown Plan')}
                </p>
              </div>
            </div>
            {/* Status Badge - renders second, appears on RIGHT in LTR */}
            <div>
              <span className={`inline-flex items-center ${statusInfo.bgColor} border ${statusInfo.borderColor} ${statusInfo.textColor} text-xs font-medium px-2 py-1 rounded-lg`}>
                <StatusIcon className="w-3.5 h-3.5 me-1" />
                {statusInfo.label}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Data Usage */}
        <dl className={`flex flex-col ${isRTL ? 'items-end' : 'items-start'}`}>
          <dt className={`text-gray-500 text-xs font-normal mb-1 flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Wifi className="w-3.5 h-3.5" />
            {t('dashboard.dataRemaining', 'Data Remaining')}
          </dt>
          {loadingUsage ? (
            <dd className="h-6 w-16 bg-gray-200 rounded animate-pulse"></dd>
          ) : (
            <dd className={`text-base font-semibold ${isExpired ? 'text-gray-500' : 'text-gray-900'}`}>
              {usage ? usage.text : dataDisplay}
              {usage && <span className="text-gray-400 font-normal text-sm"> / {usage.totalText}</span>}
            </dd>
          )}
        </dl>

        {/* Validity */}
        <dl className={`flex flex-col ${isRTL ? 'items-start' : 'items-end'}`}>
          <dt className={`text-gray-500 text-xs font-normal mb-1 flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Clock className="w-3.5 h-3.5" />
            {t('dashboard.validity', 'Validity')}
          </dt>
          <dd className="text-base font-semibold text-gray-900">
            {validityDisplay ? `${validityDisplay} ${t('dashboard.days', 'days')}` : '—'}
          </dd>
        </dl>
      </div>


      {/* Features Tags (only if present) */}
      {(() => {
        const hasVoice = planMetadata?.hasVoice || planDetails.voice > 0;
        const hasSms = planMetadata?.hasSms || planDetails.sms > 0;
        const voiceMinutes = planMetadata?.voice || planDetails.voice || 0;
        const smsCount = planMetadata?.sms || planDetails.sms || 0;

        if (!hasVoice && !hasSms) return null;

        return (
          <div className={`flex flex-wrap gap-2 mb-4 ${isRTL ? 'justify-end' : 'justify-start'}`}>
            {hasVoice && voiceMinutes > 0 && (
              <span className={`inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-1 rounded ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Phone className="w-3 h-3" />
                {voiceMinutes} {t('dashboard.min', 'min')}
              </span>
            )}
            {hasSms && smsCount > 0 && (
              <span className={`inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-medium px-2 py-1 rounded ${isRTL ? 'flex-row-reverse' : ''}`}>
                <MessageSquare className="w-3 h-3" />
                {smsCount} SMS
              </span>
            )}
          </div>
        );
      })()}

      {/* Operator Branding - from Supabase */}
      {planMetadata?.operatorName && (
        <div className={`flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
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
          <span className="text-xs text-gray-500">
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

      {/* Footer */}
      <div className={`flex items-center justify-between pt-4 border-t border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <span className="text-xs text-gray-500">{t('dashboard.price', 'Price')}</span>
          <p className="text-lg font-bold text-gray-900">{formatPrice(order.amount || 0)}</p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewQRCode(order);
          }}
          className={`inline-flex items-center text-tufts-blue bg-transparent border border-transparent hover:bg-gray-50 font-medium rounded-lg text-sm px-3 py-2 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          {t('dashboard.viewDetails', 'View Details')}
          <ArrowRight className={`w-4 h-4 ${isRTL ? 'me-1.5 rotate-180' : 'ms-1.5'}`} />
        </button>
      </div>
    </div>
  );
};

export default EsimCard;
