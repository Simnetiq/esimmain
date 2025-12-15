// App store links
export const appStoreLinks = {
  ios: 'https://apps.apple.com/gb/app/simnetiq-global-esim/id6755963262',
  android: '#' // Coming soon
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
  if (typeof window === 'undefined') return appStoreLinks.ios; // Default to iOS
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return appStoreLinks.ios;
  } else if (/android/.test(userAgent)) {
    return appStoreLinks.android;
  }
  
  // Default to iOS for desktop/unknown devices
  return appStoreLinks.ios;
};
