// App store links
export const appStoreLinks = {
  ios: 'https://apps.apple.com/gb/app/simnetiq-global-esim/id6755963262',
  android: 'https://play.google.com/store/apps/details?id=com.simnetiq.storeAndroid&hl=en'
};

// Helper function to get app store link based on platform
export const getAppStoreLink = (platform) => {
  switch (platform.toLowerCase()) {
    case 'ios':
    case 'iphone':
    case 'ipad':
      return appStoreLinks.ios;
    case 'android':
      return appStoreLinks.android;
    default:
      return null;
  }
};

// Helper function to detect platform and return appropriate link
export const getPlatformAppStoreLink = () => {
  if (typeof window === 'undefined') return appStoreLinks.ios; // Default to iOS for SSR

  const userAgent = window.navigator.userAgent.toLowerCase();

  console.log('[AppStoreLinks] User Agent:', userAgent);

  if (/iphone|ipad|ipod/.test(userAgent)) {
    console.log('[AppStoreLinks] Detected iOS device, redirecting to:', appStoreLinks.ios);
    return appStoreLinks.ios;
  } else if (/android/.test(userAgent)) {
    console.log('[AppStoreLinks] Detected Android device, redirecting to:', appStoreLinks.android);
    return appStoreLinks.android;
  }

  // Default to iOS for desktop/unknown devices
  console.log('[AppStoreLinks] Unknown device, defaulting to iOS:', appStoreLinks.ios);
  return appStoreLinks.ios;
};
