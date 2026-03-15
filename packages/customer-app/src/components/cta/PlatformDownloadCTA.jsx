'use client';

import { usePlatform, appStoreLinks } from '../../hooks/usePlatform';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';

// App Store icon (line-based)
const AppStoreIcon = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="21" y1="17" x2="18" y2="17"/>
    <line x1="20" y1="21" x2="14.29" y2="10.72"/>
    <line x1="12" y1="6.6" x2="10" y2="3"/>
    <line x1="14" y1="3" x2="4" y2="21"/>
    <line x1="13" y1="17" x2="3" y2="17"/>
  </svg>
);

// Google Play icon (filled)
const GooglePlayIcon = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M2 3.65629C2 2.15127 3.59967 1.18549 4.93149 1.88645L20.7844 10.2301C22.2091 10.9799 22.2091 13.0199 20.7844 13.7698L4.9315 22.1134C3.59968 22.8144 2 21.8486 2 20.3436V3.65629ZM19.8529 11.9999L16.2682 10.1132L14.2243 11.9999L16.2682 13.8866L19.8529 11.9999ZM14.3903 14.875L12.75 13.3608L6.75782 18.8921L14.3903 14.875ZM12.75 10.639L14.3903 9.12488L6.75782 5.10777L12.75 10.639ZM4 5.28391L11.2757 11.9999L4 18.7159V5.28391Z"/>
  </svg>
);

/**
 * Single download button for a specific platform.
 *
 * Variants:
 * - 'primary': Dark bg (for light backgrounds)
 * - 'secondary': White bg with border (for light backgrounds)
 * - 'outline': Transparent with white border (for dark backgrounds)
 * - 'themed': Adapts to current theme via CSS variables (recommended)
 */
function DownloadButton({ platform, variant, size, source, className = '' }) {
  const { t } = useI18n();

  const isIOS = platform === 'ios';
  const Icon = isIOS ? AppStoreIcon : GooglePlayIcon;
  const label = isIOS
    ? t('hero.downloadAppIOS', 'Download for iOS')
    : t('hero.downloadAppAndroid', 'Download for Android');
  const link = isIOS ? appStoreLinks.ios : appStoreLinks.android;

  const handleClick = () => {
    trackCustomFacebookEvent('DownloadAppCTA', {
      platform,
      source,
      content_type: 'app_download',
      button_location: 'hero_cta',
      event_category: 'engagement',
      timestamp: new Date().toISOString()
    });
  };

  const sizeConfig = {
    sm: { outer: 'ps-5 pe-1 py-1 text-sm', circle: 'w-8 h-8', icon: 'w-4 h-4' },
    md: { outer: 'ps-6 pe-1.5 py-1.5 text-base', circle: 'w-9 h-9', icon: 'w-5 h-5' },
    lg: { outer: 'ps-10 pe-2 py-2 text-lg', circle: 'w-11 h-11', icon: 'w-6 h-6' },
  };

  const config = sizeConfig[size];
  const isThemed = variant === 'themed';

  // Static variant classes
  const variantClasses = {
    primary: 'bg-[var(--login-bg)] text-[var(--login-text)] shadow-lg hover:opacity-90',
    secondary: 'bg-[var(--bg-primary)] text-text-primary border border-[var(--card-border)] shadow-sm hover:border-tufts-blue hover:text-tufts-blue',
    outline: 'bg-transparent text-white border border-white/20 shadow-sm hover:border-white/40 hover:bg-white/5',
    themed: 'shadow-sm hover:opacity-90',
  };

  const circleClasses = {
    primary: 'bg-white/20',
    secondary: 'bg-[var(--subtle-bg)]',
    outline: 'bg-white/10',
    themed: '',
  };

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`
        inline-flex items-center rounded-full font-semibold
        transition-all duration-200 rtl-native-flex
        ${config.outer}
        ${variantClasses[variant]}
        ${className}
      `}
      style={isThemed ? {
        backgroundColor: 'var(--cta-secondary-bg)',
        color: 'var(--cta-secondary-text)',
        border: '1px solid var(--cta-secondary-border)',
      } : undefined}
    >
      <span className="flex-1 text-center">{label}</span>
      <span
        className={`ms-3 flex-shrink-0 inline-flex items-center justify-center rounded-full rtl-native-flex ${circleClasses[variant]} ${config.circle}`}
        style={isThemed ? { backgroundColor: 'var(--cta-secondary-circle-bg)' } : undefined}
      >
        <Icon
          className={config.icon}
          style={isThemed ? { color: 'var(--cta-secondary-circle-text)' } : undefined}
        />
      </span>
    </a>
  );
}

/**
 * Platform-aware download CTA
 * - Desktop: Shows both iOS and Android buttons
 * - Mobile: Shows only the platform-specific button
 *
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'outline' | 'themed'} props.variant
 * @param {'sm' | 'md' | 'lg'} props.size
 * @param {string} props.className
 * @param {string} props.source
 */
export default function PlatformDownloadCTA({
  variant = 'primary',
  size = 'md',
  className = '',
  source = 'hero_primary_cta'
}) {
  const platform = usePlatform();
  const isMobile = platform === 'ios' || platform === 'android';
  const detected = platform !== null;

  const fadeClass = detected
    ? 'opacity-100 transition-opacity duration-300'
    : 'opacity-0';

  if (isMobile) {
    return (
      <DownloadButton
        platform={platform}
        variant={variant}
        size={size}
        source={source}
        className={`${className} ${fadeClass}`}
      />
    );
  }

  return (
    <div className={`flex flex-row items-center justify-center gap-3 rtl-native-flex ${className} ${fadeClass}`}>
      <DownloadButton platform="ios" variant={variant} size={size} source={source} />
      <DownloadButton platform="android" variant={variant} size={size} source={source} />
    </div>
  );
}

export { DownloadButton };
