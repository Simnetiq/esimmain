'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import Image from 'next/image';
import { formatPrice } from '@esim/shared/utils/priceUtils';

const CountryCard = ({
  country,
  onClick,
  isPromoted = false
}) => {
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

  // Get country data
  const fullName = country.displayName || country.name || '';
  const displayName = fullName.length > 16 ? fullName.substring(0, 16) + '...' : fullName;
  const planCount = country.packageCount || country.planCount || 0;
  const minPrice = country.minPrice;
  const isRegional = country.is_regional || false;

  // Check if country has plans with SMS or Voice
  const hasPlansWithSms = country.hasPlansWithSms || country.plans?.some(p => parseInt(p.sms) > 0);
  const hasPlansWithVoice = country.hasPlansWithVoice || country.plans?.some(p => parseInt(p.voice) > 0 || parseInt(p.calls) > 0);

  return (
    <div
      onClick={onClick}
      className="group relative bg-white border border-gray-100 shadow-sm hover:shadow-md overflow-hidden transition-all duration-300 cursor-pointer"
      title={fullName}
      data-country-name={fullName}
      data-country-code={country.code}
      dir={direction}
      lang={detectedLanguage}
    >
      {/* Decorative corner element - same as plan cards */}
      <div className={`absolute top-0 w-16 h-16 bg-tufts-blue/5 transition-transform group-hover:scale-110 ${isRTL ? 'left-0 rounded-br-full -ml-8 -mt-8' : 'right-0 rounded-bl-full -mr-8 -mt-8'}`} />

      {/* Top Choice Badge for promoted countries - positioned opposite to flag */}
      {isPromoted && (
        <div className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} z-10`}>
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
        
            {t('plans.topChoice', 'Most Popular')}
          </span>
        </div>
      )}

      {/* Card Content */}
      <div className="p-4 flex flex-col">
        {/* Country Flag & Name - Conditional rendering for RTL */}
        <div className="flex items-center gap-3 mb-3">
          {isRTL ? (
            <>
              {/* RTL: Text first, then image (image appears on LEFT visually) */}
              <div className="flex-1 min-w-0 text-right">
                <h3 className="text-sm sm:text-base font-semibold text-eerie-black truncate">
                  {displayName}
                </h3>
                <div className="flex items-center gap-2 flex-row-reverse">
                  <p className="text-xs text-gray-500 truncate">
                    {planCount > 0
                      ? `${planCount} ${planCount === 1 ? t('plans.plan', 'plan') : t('plans.plans', 'plans')}`
                      : t('plans.noPlansAvailable', 'No plans')
                    }
                  </p>
                  {/* SMS & Voice indicators */}
                  {(hasPlansWithSms || hasPlansWithVoice) && (
                    <div className="flex items-center gap-1 flex-row-reverse">
                      {hasPlansWithVoice && (
                        <span className="text-teal-600" title={t('plan.callsAvailable', 'Plans with calls available')}>
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                        </span>
                      )}
                      {hasPlansWithSms && (
                        <span className="text-purple-600" title={t('plan.smsAvailable', 'Plans with SMS available')}>
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* 4:3 Country Image Container */}
              <div className="flex-shrink-0 w-14 sm:w-16 aspect-[4/3] bg-gray-50 rounded-md flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300">
                {(country.imageUrl || country.image?.url) ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={country.imageUrl || country.image?.url}
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
                  <span className="text-2xl">{country.flagEmoji || '🌍'}</span>
                )}
              </div>
            </>
          ) : (
            <>
              {/* LTR: Image first, then text */}
              {/* 4:3 Country Image Container */}
              <div className="flex-shrink-0 w-14 sm:w-16 aspect-[4/3] bg-gray-50 rounded-md flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300">
                {(country.imageUrl || country.image?.url) ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={country.imageUrl || country.image?.url}
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
                  <span className="text-2xl">{country.flagEmoji || '🌍'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h3 className="text-sm sm:text-base font-semibold text-eerie-black truncate">
                  {displayName}
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500 truncate">
                    {planCount > 0
                      ? `${planCount} ${planCount === 1 ? t('plans.plan', 'plan') : t('plans.plans', 'plans')}`
                      : t('plans.noPlansAvailable', 'No plans')
                    }
                  </p>
                  {/* SMS & Voice indicators */}
                  {(hasPlansWithSms || hasPlansWithVoice) && (
                    <div className="flex items-center gap-1">
                      {hasPlansWithVoice && (
                        <span className="text-teal-600" title={t('plan.callsAvailable', 'Plans with calls available')}>
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                        </span>
                      )}
                      {hasPlansWithSms && (
                        <span className="text-purple-600" title={t('plan.smsAvailable', 'Plans with SMS available')}>
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Price Display */}
        <div className="flex items-center justify-between">
          {isRTL ? (
            <>
              {/* RTL: Arrow first (appears on LEFT), then price (appears on RIGHT) */}
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-tufts-blue group-hover:text-white transition-colors rotate-180">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              {minPrice ? (
                <div className="flex items-baseline gap-1.5 flex-row-reverse">
                  <span className="text-xs text-gray-500">{t('plans.from', 'From')}</span>
                  <span className="text-base font-bold text-eerie-black">
                    {formatPrice(minPrice)}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-gray-400">{t('plans.priceNotAvailable', 'Price N/A')}</span>
              )}
            </>
          ) : (
            <>
              {/* LTR: Price first (appears on LEFT), then arrow (appears on RIGHT) */}
              {minPrice ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-gray-500">{t('plans.from', 'From')}</span>
                  <span className="text-base font-bold text-eerie-black">
                    {formatPrice(minPrice)}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-gray-400">{t('plans.priceNotAvailable', 'Price N/A')}</span>
              )}
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-tufts-blue group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CountryCard;

