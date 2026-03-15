'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import Image from 'next/image';
import { formatPrice } from '@esim/shared/utils/priceUtils';

const PhoneIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MessageIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const ArrowUpRightIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 7h10v10"/><path d="M7 17 17 7"/>
  </svg>
);

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

  const fullName = country.displayName || country.name || '';
  const displayName = fullName.length > 16 ? fullName.substring(0, 16) + '...' : fullName;
  const planCount = country.packageCount || country.planCount || 0;
  const minPrice = country.minPrice;
  const countryCode = (country.code || '').toUpperCase();

  const hasPlansWithSms = country.hasPlansWithSms || country.plans?.some(p => parseInt(p.sms) > 0);
  const hasPlansWithVoice = country.hasPlansWithVoice || country.plans?.some(p => parseInt(p.voice) > 0 || parseInt(p.calls) > 0);

  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden transition-all duration-500 cursor-pointer"
      style={{ backgroundColor: 'var(--card-bg)' }}
      title={fullName}
      data-country-name={fullName}
      data-country-code={countryCode}
      dir={direction}
      lang={detectedLanguage}
    >
      {/* Country code watermark */}
      <span
        className="absolute top-3 end-4 text-[5rem] lg:text-[6rem] font-semibold leading-none select-none pointer-events-none"
        style={{ color: 'var(--subtle-border)' }}
        aria-hidden="true"
      >
        {countryCode}
      </span>

      <div className="relative p-4">
        {/* Country image + name */}
        <div className="flex items-center gap-3 rtl-native-flex">
          <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300" style={{ backgroundColor: 'var(--subtle-bg)' }}>
            {(country.imageUrl || country.image?.url) ? (
              <Image
                src={country.imageUrl || country.image?.url}
                alt={fullName}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                quality={75}
                loading="lazy"
              />
            ) : (
              <span className="text-xl">{country.flagEmoji || '🌍'}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-text-primary truncate leading-tight">
              {displayName}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {planCount > 0
                ? `${planCount} ${planCount === 1 ? t('plans.plan', 'plan') : t('plans.plans', 'plans')}`
                : t('plans.noPlansAvailable', 'No plans')
              }
              {hasPlansWithVoice && (
                <span className="hidden sm:inline text-teal-600 ms-1.5" title={t('plan.callsAvailable', 'Plans with calls available')}>
                  <PhoneIcon className="w-3 h-3 inline" />
                </span>
              )}
              {hasPlansWithSms && (
                <span className="hidden sm:inline text-purple-600 ms-1" title={t('plan.smsAvailable', 'Plans with SMS available')}>
                  <MessageIcon className="w-3 h-3 inline" />
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Most Popular badge — below the flag row */}
        {isPromoted && (
          <div className="mt-2 text-start">
            <span className="inline-flex items-center gap-1 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              {t('plans.topChoice', 'Most Popular')}
            </span>
          </div>
        )}

        {/* Spacer when no badge to keep consistent card height */}
        {!isPromoted && <div className="mt-2" />}

        {/* Price + arrow */}
        <div className="flex items-center justify-between pt-3 rtl-native-flex" style={{ borderTop: '1px solid var(--subtle-border)' }}>
          {minPrice ? (
            <div className="flex items-baseline gap-1.5 rtl-native-flex">
              <span className="text-xs text-text-muted">{t('plans.from', 'From')}</span>
              <span className="text-base font-bold text-text-primary">
                {formatPrice(minPrice)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-text-muted">{t('plans.priceNotAvailable', 'Price N/A')}</span>
          )}
          <span className="w-7 h-7 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--card-border)' }}>
            <ArrowUpRightIcon className="w-3.5 h-3.5 rtl:-scale-x-100" style={{ color: 'var(--text-primary)' }} />
          </span>
        </div>
      </div>
    </div>
  );
};

export default CountryCard;
