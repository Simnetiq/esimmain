'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Globe, Wifi, Phone, MessageSquare, Clock, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { mapPackageCountryData, mapPlanDetails } from '@esim/shared/utils/esimFieldMapper';
import { db } from '@esim/shared/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';

const EsimCard = ({ order, usageData, loadingUsage, onViewQRCode }) => {
  const pathname = usePathname();
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [countryImage, setCountryImage] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch country/region image from Firebase
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

      try {
        let imageUrl = null;

        if (countryName && typeof countryName === 'string') {
          const nameSlug = countryName.toLowerCase().replace(/\s+/g, '-');
          const countryDoc = await getDoc(doc(db, 'countries', nameSlug));
          if (countryDoc.exists()) {
            const data = countryDoc.data();
            imageUrl = data.image?.url || data.photo;
          }
        }

        if (!imageUrl && code) {
          const codeSlug = code.toLowerCase().replace(/\s+/g, '-');
          const countryDoc = await getDoc(doc(db, 'countries', codeSlug));
          if (countryDoc.exists()) {
            const data = countryDoc.data();
            imageUrl = data.image?.url || data.photo;
          }
        }

        if (!imageUrl && isRegional && countryName) {
          const regionSlug = countryName.toLowerCase().replace(/\s+/g, '-');
          const regionDoc = await getDoc(doc(db, 'regions', regionSlug));
          if (regionDoc.exists()) {
            const data = regionDoc.data();
            imageUrl = data.imageUrl?.url || data.image?.url;
          }
        }

        if (!imageUrl && code && !isRegional) {
          const countryDoc = await getDoc(doc(db, 'countries', code.toUpperCase()));
          if (countryDoc.exists()) {
            const data = countryDoc.data();
            imageUrl = data.image?.url || data.photo;
          }
        }

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

  const direction = mounted ? getLanguageDirection(detectedLanguage) : 'ltr';
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
  const countryName = countryData?.countryName || null;

  const usage = usageData ? formatDataUsage(usageData.remaining, usageData.total, usageData.is_unlimited) : null;

  const rawPlanDetails = order.planDetails || {};
  const mappedPlanDetails = mapPlanDetails(rawPlanDetails);
  const planDetails = { ...rawPlanDetails, ...mappedPlanDetails };
  const dataDisplay = planDetails.data || `${planDetails.dataAmountMb || 0} MB`;
  const validityDisplay = planDetails.validity || null;

  const fullName = countryName || order.country_region || '';

  return (
    <div
      className={`w-full bg-white border rounded-xl shadow-sm p-4 md:p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-300 ${
        isExpired ? 'opacity-75 hover:opacity-100' : ''
      }`}
      onClick={() => onViewQRCode(order)}
      dir={direction}
      lang={detectedLanguage}
    >
      {/* Header Section */}
      <div className="flex justify-between pb-4 mb-4 border-b border-gray-100">
        <div className="flex items-center">
          {/* Country/Region Image */}
          <div className="w-12 h-12 bg-gray-100 border border-gray-200 flex items-center justify-center rounded-full me-3 overflow-hidden">
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
        {/* Status Badge */}
        <div>
          <span className={`inline-flex items-center ${statusInfo.bgColor} border ${statusInfo.borderColor} ${statusInfo.textColor} text-xs font-medium px-2 py-1 rounded-lg`}>
            <StatusIcon className="w-3.5 h-3.5 me-1" />
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Data Usage */}
        <dl className="flex flex-col">
          <dt className="text-gray-500 text-xs font-normal mb-1 flex items-center gap-1">
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
        <dl className="flex flex-col items-end">
          <dt className="text-gray-500 text-xs font-normal mb-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {t('dashboard.validity', 'Validity')}
          </dt>
          <dd className="text-base font-semibold text-gray-900">
            {validityDisplay ? `${validityDisplay} ${t('dashboard.days', 'days')}` : '—'}
          </dd>
        </dl>
      </div>

      {/* Usage Progress Bar */}
      {usage && !usage.text.includes('Unlimited') && (
        <div className="mb-4">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isExpired ? 'bg-gray-400' :
                usage.remainingPercentage > 50 ? 'bg-emerald-500' :
                usage.remainingPercentage > 20 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${usage.remainingPercentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-gray-500">
            <span>{usage.remainingPercentage}% {t('dashboard.remaining', 'remaining')}</span>
            {isExpired && usageData?.expired_at && (
              <span className="text-amber-600">
                {t('dashboard.expiredOn', 'Expired')} {new Date(usageData.expired_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Features Tags (only if present) */}
      {(planDetails.voice > 0 || planDetails.sms > 0) && (
        <div className="flex gap-2 mb-4">
          {planDetails.voice > 0 && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-1 rounded-md">
              <Phone className="w-3 h-3" />
              {planDetails.voice} {t('dashboard.min', 'min')}
            </span>
          )}
          {planDetails.sms > 0 && (
            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-medium px-2 py-1 rounded-md">
              <MessageSquare className="w-3 h-3" />
              {planDetails.sms} SMS
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div>
          <span className="text-xs text-gray-500">{t('dashboard.price', 'Price')}</span>
          <p className="text-lg font-bold text-gray-900">{formatPrice(order.amount || 0)}</p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewQRCode(order);
          }}
          className="inline-flex items-center text-tufts-blue bg-transparent border border-transparent hover:bg-gray-50 font-medium rounded-lg text-sm px-3 py-2 transition-colors"
        >
          {t('dashboard.viewDetails', 'View Details')}
          <ArrowRight className="w-4 h-4 ms-1.5 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
};

export default EsimCard;
