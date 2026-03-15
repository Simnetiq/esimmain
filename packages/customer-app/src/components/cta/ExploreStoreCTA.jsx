'use client';

import Link from 'next/link';
import { useI18n } from '@esim/shared/contexts/I18nContext';
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
 * Variants:
 * - 'primary': Tufts-blue bg, always blue regardless of theme
 * - 'dark': Dark bg button (for light backgrounds)
 * - 'secondary': White bg with border (for light backgrounds)
 * - 'darkPrimary': Tufts-blue bg with glow (for dark backgrounds)
 * - 'themed': Adapts to current theme via CSS variables (recommended for hero/landing)
 */
export default function ExploreStoreCTA({
  variant = 'primary',
  size = 'md',
  className = '',
  source = 'hero_secondary_cta'
}) {
  const { t, locale } = useI18n();

  const esimPlansUrl = locale && locale !== 'en' ? `/${locale}/esim-plans` : '/esim-plans';

  const handleClick = () => {
    trackCustomFacebookEvent('ExploreStore', {
      source,
      content_type: 'navigation',
      destination: 'esim_plans',
      event_category: 'engagement',
      timestamp: new Date().toISOString()
    });
  };

  // Static variant classes (theme-unaware)
  const variantClasses = {
    primary: 'bg-tufts-blue text-white shadow-lg hover:bg-tufts-blue/90',
    dark: 'bg-eerie-black text-white shadow-lg hover:bg-eerie-black/90',
    secondary: 'bg-[var(--bg-primary)] text-text-primary border border-[var(--card-border)] shadow-sm hover:border-tufts-blue hover:text-tufts-blue',
    darkPrimary: 'bg-tufts-blue text-white shadow-lg shadow-tufts-blue/20 hover:bg-tufts-blue/90',
    themed: 'shadow-lg hover:opacity-90',
  };

  // 'themed' variant uses CSS variables for bg/text, adapts to light/dark
  const isThemed = variant === 'themed';
  const isDarkStyle = variant === 'darkPrimary' || isThemed;

  const sizeConfig = {
    sm: { outer: 'ps-5 pe-1 py-1 text-sm', circle: 'w-8 h-8', icon: 'w-3.5 h-3.5' },
    md: { outer: 'ps-6 pe-1.5 py-1.5 text-base', circle: 'w-9 h-9', icon: 'w-4 h-4' },
    lg: { outer: 'ps-10 pe-2 py-2 text-lg', circle: 'w-11 h-11', icon: 'w-5 h-5' },
  };

  const config = sizeConfig[size];

  return (
    <Link
      href={esimPlansUrl}
      onClick={handleClick}
      className={`
        inline-flex items-center rounded-full font-semibold
        transition-all duration-200 rtl-native-flex
        ${config.outer}
        ${variantClasses[variant]}
        ${className}
      `}
      style={isThemed ? {
        backgroundColor: 'var(--cta-primary-bg)',
        color: 'var(--cta-primary-text)',
      } : undefined}
    >
      <span className="flex-1 text-center">{t('hero.exploreStore', 'eSIM Store')}</span>
      <span
        className={`ms-3 flex-shrink-0 inline-flex items-center justify-center rounded-full rtl-native-flex ${
          variant === 'darkPrimary' ? 'bg-white' : (isDarkStyle ? '' : (variant === 'secondary' ? 'bg-[var(--subtle-bg)]' : 'bg-white/20'))
        } ${config.circle}`}
        style={isThemed ? {
          backgroundColor: 'var(--cta-primary-circle-bg)',
        } : undefined}
      >
        <ArrowUpRightIcon
          className={`${config.icon} rtl:-scale-x-100 ${
            variant === 'darkPrimary' ? 'text-tufts-blue' : (isDarkStyle ? 'text-white' : (variant === 'secondary' ? 'text-eerie-black' : 'text-white'))
          }`}
          style={isThemed ? { color: 'var(--cta-primary-circle-text)' } : undefined}
        />
      </span>
    </Link>
  );
}
