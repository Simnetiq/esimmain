'use client';

import React from 'react';
import { Wifi, Clock, DollarSign, Smartphone } from 'lucide-react';
import { formatPrice, calculateDiscountedPrice } from '@esim/shared/utils/priceUtils';

const PackageStats = ({
  packageData,
  providerInfo,
  hasReferralDiscount,
  referralSettings,
  isRTL,
  t
}) => {
  // Format data display
  const formatData = (data, unit = 'GB') => {
    if (data === 'Unlimited' || data === -1) {
      return 'Unlimited';
    }
    if (typeof data === 'string' && data.includes(unit)) {
      return data;
    }
    return `${data} ${unit}`;
  };

  if (!packageData) return null;

  return (
    <div className="mx-auto w-full max-w-9xl">
      <div className="mx-auto w-full max-w-7xl">
        <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl package-stats">
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {/* Data */}
            <div className="bg-jordy-blue/10 p-4 border border-gray-200/70">
              <div className={`flex justify-start items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0 bg-tufts-blue/10 p-2">
                  <Wifi className="w-5 h-5 text-tufts-blue" />
                </div>
                <div>
                  <div className="text-xs text-cool-black mb-1">{t('sharePackage.data', 'Data')}</div>
                  <div className="font-semibold text-eerie-black">
                    {formatData(packageData.data, packageData.dataUnit)}
                  </div>
                </div>
              </div>
            </div>

            {/* Validity */}
            <div className="bg-jordy-blue/10 p-4 border border-gray-200/70">
              <div className={`flex justify-start items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0 bg-tufts-blue/10 p-2">
                  <Clock className="w-5 h-5 text-tufts-blue" />
                </div>
                <div>
                  <div className="text-xs text-cool-black mb-1">{t('sharePackage.validity', 'Validity')}</div>
                  <div className="font-semibold text-eerie-black">
                    {packageData.period || packageData.duration || 'N/A'} {t('sharePackage.days', 'days')}
                  </div>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="bg-jordy-blue/10 p-4 border border-gray-200/70">
              <div className={`flex justify-start items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0 bg-tufts-blue/10 p-2">
                  <DollarSign className="w-5 h-5 text-tufts-blue" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-cool-black mb-1">{t('sharePackage.price', 'Price')}</div>
                  {hasReferralDiscount ? (
                    <div>
                      <div className={`flex justify-start items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        <span className="font-semibold text-green-600">
                          {formatPrice(calculateDiscountedPrice(
                            packageData.price,
                            referralSettings.discountPercentage,
                            referralSettings.minimumPrice
                          ))}
                        </span>
                        <div className="flex bg-cobalt-blue rounded-full px-2 py-0.5">
                          <span className="text-xs text-white font-medium whitespace-nowrap">
                            -{referralSettings.discountPercentage}%
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 line-through mt-1">
                        {formatPrice(packageData.price)}
                      </div>
                    </div>
                  ) : (
                    <div className="font-semibold text-eerie-black">{formatPrice(packageData.price)}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Operator */}
            <div className="bg-jordy-blue/10 p-4 border border-gray-200/70">
              <div className={`flex justify-start items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0 bg-tufts-blue/10 p-2 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-tufts-blue" />
                </div>
                <div>
                  <div className="text-xs text-cool-black mb-1">{t('sharePackage.operator', 'Operator')}</div>
                  <div className="font-semibold text-eerie-black" style={{ color: providerInfo?.color }}>
                    {packageData.operator || packageData.networks || providerInfo?.name || packageData.provider || t('sharePackage.esim', 'eSIM')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full h-px bg-gray-100"></div>
    </div>
  );
};

export default PackageStats;
