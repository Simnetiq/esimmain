'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { formatDataDisplay, getValidityDays } from '@esim/shared/utils/planDisplayUtils';

// Helper to capitalize first letter of each word
const capitalizeWords = (str) => {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const PackageHeader = ({
  packageData,
  countryImage,
  countryTranslations,
  urlCountryName,
  urlCountryCode,
  currentLanguage,
  isRTL,
  isGlobalPlan,
  t
}) => {
  // Get full country name with translations
  // PURE DATA FROM PROPS - NO HARDCODED FALLBACKS
  const getFullCountryName = (countryCode) => {
    if (!countryCode) return '';

    // Handle global plans
    if (isGlobalPlan && isGlobalPlan(packageData)) {
      return t('sharePackage.globalCoverage', 'Global');
    }

    // Handle special global codes
    if (countryCode === 'discover-global' || countryCode === 'global') {
      return t('sharePackage.globalCoverage', 'Global');
    }

    // Use translations passed from parent (from Supabase)
    if (countryTranslations && countryTranslations[currentLanguage]) {
      return countryTranslations[currentLanguage];
    }

    // Use country name from package data if available
    if (packageData?.country_name) {
      return packageData.country_name;
    }

    // Fall back to capitalizing the country code
    return capitalizeWords(countryCode);
  };

  if (!packageData) {
    return (
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
          <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            <p className="font-mono text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500">
              {t('sharePackage.secureCheckout', 'Secure Checkout')}
            </p>
            <h2 className="mt-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl">
              {t('sharePackage.pageTitle', 'Secure Checkout - Buy eSIM')}
            </h2>
          </div>
        </div>
        <div className="w-full h-px bg-gray-100"></div>
      </div>
    );
  }

  const displayCountryName = capitalizeWords(urlCountryName) || getFullCountryName(urlCountryCode || packageData.country_code);
  const isGlobal = isGlobalPlan ? isGlobalPlan(packageData) : false;

  // Use shared formatDataDisplay for consistent data formatting
  const dataDisplay = formatDataDisplay(packageData);
  const validityDays = getValidityDays(packageData);

  return (
    <div className="mx-auto w-full max-w-9xl">
      <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
        <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
          <p className="font-mono text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500">
            {t('sharePackage.secureCheckout', 'Secure Checkout')}
          </p>

          <div className="mt-4 max-w-5xl share-package-header">
            <div className="flex justify-start items-center gap-4">
              {/* Country/Region/Global Image */}
              <div className="flex-shrink-0 w-20 sm:w-24 lg:w-28 aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border-2 border-gray-200 overflow-hidden relative">
                {countryImage?.url ? (
                  <img
                    src={countryImage.url}
                    alt={displayCountryName || 'Global'}
                    className="w-full h-full object-cover"
                  />
                ) : isGlobal ? (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <Globe className="w-10 h-10 text-tufts-blue" />
                  </div>
                ) : null}
              </div>

              {/* Package Info */}
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-tufts-blue">
                  {displayCountryName && (
                    <>{displayCountryName} - </>
                  )}
                  {dataDisplay}
                </h2>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-xl sm:text-2xl font-semibold text-eerie-black">
                    {formatPrice(packageData.price)}
                  </p>
                  {validityDays > 0 && (
                    <span className="text-base sm:text-lg text-cool-black">
                      - {validityDays} {t('sharePackage.days', 'days')}
                    </span>
                  )}
                </div>
                {/* Data summary line */}
                <p className="mt-1 text-sm text-gray-500">
                  {dataDisplay} {t('sharePackage.for', 'for')} {validityDays} {t('sharePackage.days', 'days')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full h-px bg-gray-100"></div>
    </div>
  );
};

export default PackageHeader;
