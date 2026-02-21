/**
 * Get flag emoji from country code
 * @param {string} countryCode - 2-letter ISO country code
 * @returns {string} Flag emoji or globe emoji for invalid codes
 */
export const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🌍';

  // Handle special cases like PT-MA, multi-region codes, etc.
  if (countryCode.includes('-') || countryCode.length > 2) {
    return '🌍';
  }

  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());

    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌍';
  }
};

/**
 * Categorize a plan based on its properties
 * @param {object} plan - Plan object
 * @returns {'global'|'regional'|'country'} Plan category
 */
export const categorizePlan = (plan) => {
  const name = (plan.name || plan.title || '').toLowerCase();
  const countryRegion = (plan.country_region || plan.country_title || '').toLowerCase();
  const countryCodes = plan.country_codes || plan.country_ids || [];
  const isRegionalFlag = plan.is_regional || false;
  const regionType = plan.region_type || '';

  // Global plans
  if (
    name.includes('global') ||
    name.includes('discover') ||
    countryRegion.includes('global') ||
    regionType === 'global' ||
    plan.type === 'global'
  ) {
    return 'global';
  }

  // Regional plans (multiple countries, not global)
  if (
    isRegionalFlag ||
    regionType === 'regional' ||
    countryCodes.length > 1 ||
    countryRegion.includes('europe') ||
    countryRegion.includes('asia') ||
    countryRegion.includes('africa') ||
    countryRegion.includes('americas') ||
    countryRegion.includes('oceania') ||
    countryRegion.includes('european union') ||
    countryRegion.includes('caribbean')
  ) {
    return 'regional';
  }

  // Single country plans
  return 'country';
};

/**
 * Check if plan has SMS
 * @param {object} plan - Plan object
 * @returns {boolean}
 */
export const planHasSms = (plan) => {
  const sms = parseInt(plan.sms) || parseInt(plan.sms_count) || 0;
  return sms > 0;
};

/**
 * Check if plan has Voice
 * @param {object} plan - Plan object
 * @returns {boolean}
 */
export const planHasVoice = (plan) => {
  const voice = parseInt(plan.voice) || parseInt(plan.calls) || parseInt(plan.voice_minutes) || 0;
  return voice > 0;
};

/**
 * Data source options
 */
export const DATA_SOURCES = {
  SUPABASE: 'supabase',
  LEGACY: 'legacy',
  AIRALO: 'airalo',
  TOPUPS: 'topups'
};

/**
 * Plan categories
 */
export const PLAN_CATEGORIES = {
  ALL: 'all',
  GLOBAL: 'global',
  REGIONAL: 'regional',
  COUNTRY: 'country'
};

/**
 * Default pagination settings
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_ROWS_PER_PAGE: 25,
  ROWS_PER_PAGE_OPTIONS: [10, 25, 50, 100]
};

/**
 * Supabase table column definitions
 */
export const SUPABASE_COLUMNS = [
  { key: 'id', label: 'ID', width: '120px' },
  { key: 'name', label: 'Name', width: '150px' },
  { key: 'title', label: 'Title', width: '150px' },
  { key: 'type', label: 'Type' },
  { key: 'plan_category', label: 'Category' },
  { key: 'country_id', label: 'Country ID' },
  { key: 'country_name', label: 'Country' },
  { key: 'country_iso', label: 'ISO' },
  { key: 'region_id', label: 'Region' },
  { key: 'is_regional', label: 'Regional?' },
  { key: 'covered_countries_count', label: 'Covered' },
  { key: 'data_display', label: 'Data Display' },
  { key: 'data_amount_mb', label: 'Data (MB)' },
  { key: 'is_unlimited', label: 'Unlimited?' },
  { key: 'validity_days', label: 'Validity' },
  { key: 'has_voice', label: 'Voice?' },
  { key: 'voice_minutes', label: 'Voice Min' },
  { key: 'has_sms', label: 'SMS?' },
  { key: 'sms_count', label: 'SMS Count' },
  { key: 'price', label: 'Price' },
  { key: 'net_price', label: 'Net Price' },
  { key: 'currency', label: 'Currency' },
  { key: 'operator_id', label: 'Op. ID' },
  { key: 'operator_name', label: 'Operator' },
  { key: 'operator_style', label: 'Op. Style' },
  { key: 'operator_gradient_start', label: 'Gradient Start' },
  { key: 'operator_gradient_end', label: 'Gradient End' },
  { key: 'activation_policy', label: 'Activation' },
  { key: 'fair_usage_policy', label: 'Fair Usage' },
  { key: 'short_info', label: 'Short Info' },
  { key: 'apn_type', label: 'APN Type' },
  { key: 'apn_value', label: 'APN Value' },
  { key: 'status', label: 'Status' },
  { key: 'enabled', label: 'Enabled?' },
  { key: 'provider', label: 'Provider' },
  { key: 'synced_at', label: 'Synced At' }
];

/**
 * Build query string from filters object
 * @param {object} filters - Filter parameters
 * @returns {string} Query string
 */
export const buildQueryString = (filters) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '' && value !== false) {
      params.append(key, String(value));
    }
  });

  return params.toString();
};

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
