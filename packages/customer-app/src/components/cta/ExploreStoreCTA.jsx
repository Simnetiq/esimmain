'use client';

import Link from 'next/link';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';

// Arrow icon (45 degrees up-right)
const ArrowUpRightIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17 17 7"/><path d="M7 7h10v10"/>
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

  // Variant classes
  const variantClasses = {
    primary: 'bg-tufts-blue text-white shadow-lg hover:bg-tufts-blue/90 hover:scale-[1.02]',
    dark: 'bg-eerie-black text-white shadow-lg hover:bg-eerie-black/90 hover:scale-[1.02]',
    secondary: 'bg-white text-gray-900 border border-gray-200 shadow-sm hover:border-tufts-blue hover:text-tufts-blue'
  };

  // Button padding: left side has normal padding, right side is minimal (arrow circle sits flush)
  const sizeConfig = {
    sm: { outer: 'pl-5 pr-1 py-1 text-sm', circle: 'w-8 h-8', icon: 'w-3.5 h-3.5' },
    md: { outer: 'pl-6 pr-1.5 py-1.5 text-base', circle: 'w-9 h-9', icon: 'w-4 h-4' },
    lg: { outer: 'pl-10 pr-2 py-2 text-lg', circle: 'w-11 h-11', icon: 'w-5 h-5' },
  };

  const config = sizeConfig[size];

  return (
    <Link
      href={esimPlansUrl}
      onClick={handleClick}
      className={`
        inline-flex items-center rounded-full font-semibold
        transition-all duration-200
        ${config.outer}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      <span className="flex-1 text-center">{t('hero.exploreStore', 'Explore eSIM Store')}</span>
      <span className={`${isRTL ? 'mr-3' : 'ml-3'} flex-shrink-0 inline-flex items-center justify-center rounded-full bg-white ${config.circle}`}>
        <ArrowUpRightIcon className={`${config.icon} text-eerie-black ${isRTL ? '-scale-x-100' : ''}`} />
      </span>
    </Link>
  );
}
