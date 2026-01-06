'use client';

import { usePlatform, appStoreLinks } from '../../hooks/usePlatform';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';

// Inline SVG icons
const AppleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const AndroidIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4483-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993.0001.5511-.4482.9997-.9993.9997zm-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993 0 .5511-.4483.9997-.9993.9997zm11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396z"/>
  </svg>
);

/**
 * Single download button for a specific platform
 */
function DownloadButton({ platform, variant, size, source, className = '' }) {
  const { t } = useI18n();

  const isIOS = platform === 'ios';
  const Icon = isIOS ? AppleIcon : AndroidIcon;
  const label = isIOS
    ? t('hero.downloadAppIOS', 'Download our iOS app')
    : t('hero.downloadAppAndroid', 'Download our Android app');
  const link = isIOS ? appStoreLinks.ios : appStoreLinks.android;

  const handleClick = () => {
    trackCustomFacebookEvent('DownloadAppCTA', {
      platform: platform,
      source: source,
      content_type: 'app_download',
      button_location: 'hero_cta',
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
    sm: 'w-5 h-5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7'
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-gray-900 text-white shadow-lg hover:bg-gray-800 hover:scale-[1.02]',
    secondary: 'bg-white text-gray-900 border border-gray-200 shadow-sm hover:border-tufts-blue hover:text-tufts-blue'
  };

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center rounded-full font-semibold
        transition-all duration-200
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      <Icon className={iconSizeClasses[size]} />
      <span>{label}</span>
    </a>
  );
}

/**
 * Platform-aware download CTA
 * - Desktop: Shows both iOS and Android buttons
 * - Mobile: Shows only the platform-specific button
 *
 * @param {Object} props
 * @param {'primary' | 'secondary'} props.variant - Button style variant
 * @param {'sm' | 'md' | 'lg'} props.size - Button size
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.source - Analytics source identifier
 */
export default function PlatformDownloadCTA({
  variant = 'primary',
  size = 'md',
  className = '',
  source = 'hero_primary_cta'
}) {
  const platform = usePlatform();
  const isMobile = platform === 'ios' || platform === 'android';

  // On mobile, show only the platform-specific button
  if (isMobile) {
    return (
      <DownloadButton
        platform={platform}
        variant={variant}
        size={size}
        source={source}
        className={className}
      />
    );
  }

  // On desktop, show both buttons (both use the same variant)
  // Use flex-row on all screen sizes to keep buttons on same line
  return (
    <div className={`flex flex-row items-center gap-3 ${className}`}>
      <DownloadButton
        platform="ios"
        variant={variant}
        size={size}
        source={source}
      />
      <DownloadButton
        platform="android"
        variant={variant}
        size={size}
        source={source}
      />
    </div>
  );
}

// Export individual button for direct use if needed
export { DownloadButton };
