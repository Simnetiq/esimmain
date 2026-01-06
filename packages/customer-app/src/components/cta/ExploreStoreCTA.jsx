'use client';

import Link from 'next/link';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';

// Store/Shop icon
const StoreIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
    <path d="M2 7h20"/>
    <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>
  </svg>
);

// Arrow icon
const ArrowRightIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
);

/**
 * CTA for exploring the eSIM store
 * Links to /esim-plans page
 *
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'dark'} props.variant - Button style variant
 * @param {'sm' | 'md' | 'lg'} props.size - Button size
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.source - Analytics source identifier
 */
export default function ExploreStoreCTA({
  variant = 'primary',
  size = 'md',
  className = '',
  source = 'hero_secondary_cta'
}) {
  const { t, locale } = useI18n();
  const direction = getLanguageDirection(locale || 'en');
  const isRTL = direction === 'rtl';

  // Build localized URL
  const esimPlansUrl = locale && locale !== 'en' ? `/${locale}/esim-plans` : '/esim-plans';

  const handleClick = () => {
    trackCustomFacebookEvent('ExploreStore', {
      source: source,
      content_type: 'navigation',
      destination: 'esim_plans',
      event_category: 'engagement',
      timestamp: new Date().toISOString()
    });
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-5 py-2.5 text-sm gap-2',
    md: 'px-6 py-3.5 text-base gap-2.5',
    lg: 'px-10 py-5 text-lg gap-3'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-tufts-blue text-white shadow-lg hover:bg-tufts-blue/90 hover:scale-[1.02]',
    dark: 'bg-eerie-black text-white shadow-lg hover:bg-eerie-black/90 hover:scale-[1.02]',
    secondary: 'bg-white text-gray-900 border border-gray-200 shadow-sm hover:border-tufts-blue hover:text-tufts-blue'
  };

  return (
    <Link
      href={esimPlansUrl}
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center rounded-full font-semibold
        transition-all duration-200
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      <StoreIcon className={iconSizeClasses[size]} />
      <span>{t('hero.exploreStore', 'Explore eSIM Store')}</span>
      <ArrowRightIcon className={`${iconSizeClasses[size]} ${isRTL ? 'rotate-180' : ''}`} />
    </Link>
  );
}
