'use client';

import React from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import Image from 'next/image';
import { getISOCode } from '@esim/shared/utils/countryCodeMap';
import { formatPrice } from '@esim/shared/utils/priceUtils';

const CountryCard = ({ 
  country, 
  onClick
}) => {
  const { t } = useI18n();

  // Get country data
  const fullName = country.displayName || country.name || '';
  const displayName = fullName.length > 14 ? fullName.substring(0, 14) + '...' : fullName;
  const planCount = country.packageCount || country.planCount || 0;
  const minPrice = country.minPrice;
  const isRegional = country.is_regional || false;

  return (
    <div
      onClick={onClick}
      className="group relative bg-white border-1 border-gray-200 rounded-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer h-full"
      title={fullName}
      data-country-name={fullName}
      data-country-code={country.code}
    >
      {/* Regional Badge - Top Right */}
      {isRegional && (
        <div className="absolute top-2 right-2 z-10">
          <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
            {t('badge.regional', 'Regional')}
          </span>
        </div>
      )}

      {/* Card Content */}
      <div className="p-4 sm:p-5 h-full flex flex-col">
        {/* Country Flag & Name */}
        <div className="flex items-center gap-3 mb-3">
          {/* 4:3 Flag Container */}
          <div className="flex-shrink-0 w-16 sm:w-20 aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border-2 border-gray-200 overflow-hidden">
            {country.photo && country.photo.includes('firebasestorage') ? (
              <div className="relative w-full h-full">
                <Image 
                  src={country.photo} 
                  alt={fullName}
                  fill
                  sizes="80px"
                  className="object-cover"
                  quality={75}
                  priority={false}
                  loading="lazy"
                />
              </div>
            ) : (
              /* SVG images must use unoptimized - Next.js can't optimize SVGs */
              <Image
                src={`/flags/4x3/${getISOCode(country.code)}.svg`}
                alt={`${fullName} flag`}
                width={80}
                height={60}
                className="w-full h-full object-cover"
                loading="lazy"
                unoptimized
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
              {displayName}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 truncate">
              {planCount > 0 
                ? `${planCount} ${planCount === 1 ? t('plans.plan', 'plan') : t('plans.plans', 'plans')} ${t('plans.available', 'available')}`
                : t('plans.noPlansAvailable', 'No plans available')
              }
            </p>
          </div>
        </div>

        {/* Price Display */}
        <div className="mt-auto">
          {minPrice ? (
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-600">{t('plans.from', 'From')}</span>
              <span className="text-lg font-bold text-tufts-blue">
                {formatPrice(minPrice)}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-500">{t('plans.priceNotAvailable', 'Price not available')}</span>
          )}
        </div>

        {/* Hover Effect */}
        <div className="absolute inset-0 border-2 border-tufts-blue rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      </div>
    </div>
  );
};

export default CountryCard;

