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
  const displayName = fullName.length > 16 ? fullName.substring(0, 16) + '...' : fullName;
  const planCount = country.packageCount || country.planCount || 0;
  const minPrice = country.minPrice;
  const isRegional = country.is_regional || false;

  return (
    <div
      onClick={onClick}
      className="group relative bg-gray-50 rounded-lg overflow-hidden hover:bg-white transition-all duration-300 cursor-pointer"
      title={fullName}
      data-country-name={fullName}
      data-country-code={country.code}
    >
      {/* Regional Badge - Top Right */}
      {isRegional && (
        <div className="absolute top-3 right-3 z-10">
          <span className="px-2 py-1 bg-tufts-blue text-white text-xs font-medium rounded-full">
            {t('badge.regional', 'Regional')}
          </span>
        </div>
      )}

      {/* Card Content */}
      <div className="p-4 flex flex-col">
        {/* Country Flag & Name */}
        <div className="flex items-center gap-3 mb-3">
          {/* 4:3 Flag Container */}
          <div className="flex-shrink-0 w-14 sm:w-16 aspect-[4/3] bg-white rounded-lg flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300">
            {country.photo && country.photo.includes('firebasestorage') ? (
              <div className="relative w-full h-full">
                <Image 
                  src={country.photo} 
                  alt={fullName}
                  fill
                  sizes="64px"
                  className="object-cover"
                  quality={75}
                  priority={false}
                  loading="lazy"
                />
              </div>
            ) : (
              <Image
                src={`/flags/4x3/${getISOCode(country.code)}.svg`}
                alt={`${fullName} flag`}
                width={64}
                height={48}
                className="w-full h-full object-cover"
                loading="lazy"
                unoptimized
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-eerie-black truncate">
              {displayName}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {planCount > 0 
                ? `${planCount} ${planCount === 1 ? t('plans.plan', 'plan') : t('plans.plans', 'plans')}`
                : t('plans.noPlansAvailable', 'No plans')
              }
            </p>
          </div>
        </div>

        {/* Price Display */}
        <div className="flex items-center justify-between">
          {minPrice ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-gray-500">{t('plans.from', 'From')}</span>
              <span className="text-base font-bold text-tufts-blue">
                {formatPrice(minPrice)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">{t('plans.priceNotAvailable', 'Price N/A')}</span>
          )}
          
          {/* Arrow indicator on hover */}
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <svg className="w-4 h-4 text-tufts-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Border ring */}
      <div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-black/5 group-hover:ring-tufts-blue/30 transition-all duration-300" />
    </div>
  );
};

export default CountryCard;

