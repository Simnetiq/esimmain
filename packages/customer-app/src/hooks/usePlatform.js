'use client';

import { useState, useEffect } from 'react';

/**
 * Hook for client-side platform detection
 * Returns 'ios', 'android', or 'desktop' based on user agent
 * Defaults to 'desktop' for SSR and non-mobile browsers
 */
export function usePlatform() {
  const [platform, setPlatform] = useState(null); // null until detected

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios');
    } else if (/android/.test(ua)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, []);

  return platform;
}

/**
 * Returns whether the current device is mobile (iOS or Android)
 */
export function useIsMobile() {
  const platform = usePlatform();
  return platform !== null && (platform === 'ios' || platform === 'android');
}

/**
 * Returns platform-specific app store link
 */
export function usePlatformAppStoreLink() {
  const platform = usePlatform();

  const links = {
    ios: 'https://apps.apple.com/gb/app/simnetiq-global-esim/id6755963262',
    android: 'https://play.google.com/store/apps/details?id=com.simnetiq.storeAndroid&hl=en'
  };

  // Default to iOS link (desktop and pre-detection)
  return platform === 'android' ? links.android : links.ios;
}

export const appStoreLinks = {
  ios: 'https://apps.apple.com/gb/app/simnetiq-global-esim/id6755963262',
  android: 'https://play.google.com/store/apps/details?id=com.simnetiq.storeAndroid&hl=en'
};
