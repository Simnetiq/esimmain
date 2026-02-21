/**
 * Provider Utilities
 * Extract provider information from plan slugs and display provider details
 */

// Provider mapping based on slug prefixes
const PROVIDER_MAP = {
  // Airalo providers (most common)
  'abrazo': { name: 'Abrazo', icon: '', color: '#4A90E2' },
  'vinaka': { name: 'Vinaka', icon: '', color: '#00A8E8' },
  'volta': { name: 'Volta', icon: '', color: '#FFB800' },
  'wa-mobile': { name: 'WA Mobile', icon: '', color: '#25D366' },
  'wassu-telecom': { name: 'Wassu Telecom', icon: '', color: '#FF6B6B' },
  'xie-xie': { name: 'Xie Xie', icon: '', color: '#E74C3C' },
  'xin-chao': { name: 'Xin Chao', icon: '', color: '#3498DB' },
  'yaxsi-mobile': { name: 'Yaxsi Mobile', icon: '', color: '#9B59B6' },
  'yes-go': { name: 'Yes Go', icon: '', color: '#2ECC71' },
  'zimcom': { name: 'Zimcom', icon: '', color: '#E67E22' },
  'zivjo': { name: 'Zivjo', icon: '', color: '#1ABC9C' },
  
  // Other common providers
  'airalo': { name: 'Airalo', icon: '', color: '#FF6B35' },
  'roamjet': { name: 'RoamJet', icon: '', color: '#4A90E2' },
  'esimo': { name: 'eSIMo', icon: '', color: '#00C9A7' },
  'holafly': { name: 'Holafly', icon: '', color: '#FF6B9D' },
  'nomad': { name: 'Nomad', icon: '', color: '#6C5CE7' },
  'ubigi': { name: 'Ubigi', icon: '', color: '#00B894' },
  'truphone': { name: 'Truphone', icon: '', color: '#0984E3' },
  'gigsky': { name: 'GigSky', icon: '', color: '#6C5CE7' },
  'keepgo': { name: 'KeepGo', icon: '', color: '#00B894' },
  'flexiroam': { name: 'Flexiroam', icon: '', color: '#FD79A8' },
};

/**
 * Extract provider name from slug
 * @param {string} slug - The plan slug (e.g., "abrazo-30days-10gb")
 * @returns {string} Provider name
 */
export function getProviderNameFromSlug(slug) {
  if (!slug) return 'Unknown Provider';
  
  // Try to match known providers
  const lowerSlug = slug.toLowerCase();
  
  for (const [key, value] of Object.entries(PROVIDER_MAP)) {
    if (lowerSlug.startsWith(key)) {
      return value.name;
    }
  }
  
  // If no match, extract first part of slug and capitalize
  const firstPart = slug.split('-')[0];
  return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
}

/**
 * Get provider icon from slug
 * @param {string} slug - The plan slug
 * @returns {string} Provider icon (emoji or symbol)
 */
export function getProviderIconFromSlug(slug) {
  if (!slug) return '📱';
  
  const lowerSlug = slug.toLowerCase();
  
  for (const [key, value] of Object.entries(PROVIDER_MAP)) {
    if (lowerSlug.startsWith(key)) {
      return value.icon;
    }
  }
  
  return '📱'; // Default icon
}

/**
 * Get provider color from slug
 * @param {string} slug - The plan slug
 * @returns {string} Provider color (hex)
 */
export function getProviderColorFromSlug(slug) {
  if (!slug) return '#4A90E2';
  
  const lowerSlug = slug.toLowerCase();
  
  for (const [key, value] of Object.entries(PROVIDER_MAP)) {
    if (lowerSlug.startsWith(key)) {
      return value.color;
    }
  }
  
  return '#4A90E2'; // Default color
}

/**
 * Get full provider info from slug
 * @param {string} slug - The plan slug
 * @returns {object} Provider info { name, icon, color }
 */
export function getProviderInfo(slug) {
  if (!slug) {
    return {
      name: 'Unknown Provider',
      icon: '📱',
      color: '#4A90E2'
    };
  }
  
  const lowerSlug = slug.toLowerCase();
  
  for (const [key, value] of Object.entries(PROVIDER_MAP)) {
    if (lowerSlug.startsWith(key)) {
      return value;
    }
  }
  
  // If no match, return default with capitalized first part
  const firstPart = slug.split('-')[0];
  return {
    name: firstPart.charAt(0).toUpperCase() + firstPart.slice(1),
    icon: '📱',
    color: '#4A90E2'
  };
}

/**
 * Get provider info from plan data
 * @param {object} planData - Plan data from database
 * @returns {object} Provider info { name, icon, color }
 */
export function getProviderFromPlanData(planData) {
  if (!planData) {
    return {
      name: 'Unknown Provider',
      icon: '📱',
      color: '#4A90E2'
    };
  }
  
  // Check if provider field exists
  if (planData.provider) {
    const providerLower = planData.provider.toLowerCase();
    
    // Check if it's in our map
    if (PROVIDER_MAP[providerLower]) {
      return PROVIDER_MAP[providerLower];
    }
    
    // Return capitalized provider name
    return {
      name: planData.provider.charAt(0).toUpperCase() + planData.provider.slice(1),
      icon: '📱',
      color: '#4A90E2'
    };
  }
  
  // Fallback to slug-based detection
  if (planData.slug) {
    return getProviderInfo(planData.slug);
  }
  
  // Check operator field
  if (planData.operator) {
    return {
      name: planData.operator,
      icon: '📡',
      color: '#4A90E2'
    };
  }
  
  return {
    name: 'Unknown Provider',
    icon: '📱',
    color: '#4A90E2'
  };
}

const providerUtils = {
  getProviderNameFromSlug,
  getProviderIconFromSlug,
  getProviderColorFromSlug,
  getProviderInfo,
  getProviderFromPlanData,
  PROVIDER_MAP
};

export default providerUtils;

