/**
 * Shared plan display utility functions
 * Used by both PlanSelectionBottomSheet and share-package pages
 * for consistent plan data formatting across the application.
 */

/**
 * Format data display with unlimited detection
 * Priority order:
 * 1. Strict boolean check for unlimited
 * 2. Calculate from dataAmountMb
 * 3. Use data_display string
 *
 * @param {Object} plan - Plan object with data fields
 * @returns {string} Formatted data display (e.g., "Unlimited", "5 GB", "500 MB")
 */
export const formatDataDisplay = (plan) => {
  if (!plan) return 'Data';

  // Priority 1: Strict boolean check for unlimited (from database boolean field)
  if (plan.isUnlimited === true || plan.is_unlimited === true) {
    return 'Unlimited';
  }

  // Priority 2: Calculate from dataAmountMb (most reliable)
  const mb = plan.dataAmountMb || plan.data_amount_mb;
  if (mb && mb > 0) {
    if (mb >= 1024) {
      const gb = mb / 1024;
      return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`;
    }
    return `${mb} MB`;
  }

  // Priority 3: Use data_display or data string
  const dataStr = plan.data_display || plan.data;
  if (dataStr && typeof dataStr === 'string') {
    // Only show "Unlimited" from string if is_unlimited boolean wasn't set
    const lower = dataStr.toLowerCase();
    if (lower.includes('unlimited') || lower === '∞') {
      return 'Unlimited';
    }
    if (lower.includes('gb') || lower.includes('mb')) {
      return dataStr;
    }
    return dataStr;
  }

  return 'Data';
};

/**
 * Check if plan has SMS capability
 * @param {Object} plan - Plan object
 * @returns {boolean}
 */
export const planHasSms = (plan) => {
  if (!plan) return false;
  const hasSmsFlag = plan.hasSms === true || plan.has_sms === true;
  const smsCount = parseInt(plan.smsCount || plan.sms_count || plan.sms || 0);
  return hasSmsFlag || smsCount > 0;
};

/**
 * Check if plan has Voice/Calls capability
 * @param {Object} plan - Plan object
 * @returns {boolean}
 */
export const planHasVoice = (plan) => {
  if (!plan) return false;
  const hasVoiceFlag = plan.hasVoice === true || plan.has_voice === true;
  const voiceMinutes = parseInt(plan.voiceMinutes || plan.voice_minutes || plan.voice || plan.calls || 0);
  return hasVoiceFlag || voiceMinutes > 0;
};

/**
 * Get SMS count from plan
 * @param {Object} plan - Plan object
 * @returns {number}
 */
export const getSmsCount = (plan) => {
  if (!plan) return 0;
  return parseInt(plan.smsCount || plan.sms_count || plan.sms || 0);
};

/**
 * Get voice minutes from plan
 * @param {Object} plan - Plan object
 * @returns {number}
 */
export const getVoiceMinutes = (plan) => {
  if (!plan) return 0;
  return parseInt(plan.voiceMinutes || plan.voice_minutes || plan.voice || plan.calls || 0);
};

/**
 * Get validity days from plan
 * @param {Object} plan - Plan object
 * @returns {number}
 */
export const getValidityDays = (plan) => {
  if (!plan) return 0;
  return parseInt(plan.validity || plan.validity_days || plan.period || plan.duration || 0);
};

/**
 * Check if plan is regional (covers multiple countries)
 * @param {Object} plan - Plan object
 * @returns {boolean}
 */
export const planIsRegional = (plan) => {
  if (!plan) return false;
  return plan.isRegional === true ||
         plan.is_regional === true ||
         (plan.covered_countries && plan.covered_countries.length > 1) ||
         (plan.countryCodes && plan.countryCodes.length > 1);
};

/**
 * Check if plan is global
 * @param {Object} plan - Plan object
 * @returns {boolean}
 */
export const planIsGlobal = (plan) => {
  if (!plan) return false;

  const type = plan.type || plan.plan_type || '';
  const regionId = plan.region_id || plan.region || plan.region_slug || '';
  const countryId = plan.country_id || '';

  const isGlobalType = type.toLowerCase() === 'global';
  const isGlobalRegion = regionId.toLowerCase().includes('global');
  const isGlobalCountry = countryId.toLowerCase().includes('global');
  const hasManyCountries = (plan.coveredCountryCount || plan.covered_countries_count || 0) > 50;

  return isGlobalType || isGlobalRegion || isGlobalCountry || hasManyCountries;
};

/**
 * Get covered country count
 * @param {Object} plan - Plan object
 * @returns {number}
 */
export const getCoveredCountryCount = (plan) => {
  if (!plan) return 0;
  return plan.coveredCountryCount ||
         plan.covered_countries_count ||
         plan.covered_country_count ||
         (plan.covered_countries && plan.covered_countries.length) ||
         (plan.countryCodes && plan.countryCodes.length) ||
         0;
};

/**
 * Get operator display info
 * @param {Object} plan - Plan object
 * @returns {Object} Operator info with name, logo, style, and gradients
 */
export const getOperatorInfo = (plan) => {
  if (!plan) return null;

  const name = plan.operatorName || plan.operator_name;
  if (!name) return null;

  return {
    name,
    logo: plan.operatorLogo || plan.operator_logo || plan.operator_image_url,
    style: plan.operatorStyle || plan.operator_style || 'light',
    gradientStart: plan.gradientStart || plan.operator_gradient_start,
    gradientEnd: plan.gradientEnd || plan.operator_gradient_end
  };
};

/**
 * Get fair usage policy
 * @param {Object} plan - Plan object
 * @returns {string|null}
 */
export const getFairUsagePolicy = (plan) => {
  if (!plan) return null;
  return plan.fairUsagePolicy || plan.fair_usage_policy || null;
};

/**
 * Get activation policy
 * @param {Object} plan - Plan object
 * @returns {string}
 */
export const getActivationPolicy = (plan) => {
  if (!plan) return 'first-usage';
  return plan.activationPolicy || plan.activation_policy || 'first-usage';
};

/**
 * Format activation policy for display
 * @param {string} policy - Activation policy value
 * @returns {string}
 */
export const formatActivationPolicy = (policy) => {
  switch (policy) {
    case 'first-usage':
      return 'Activates on first use';
    case 'immediate':
      return 'Activates immediately';
    case 'manual':
      return 'Manual activation required';
    default:
      return 'Activates on first use';
  }
};

/**
 * Get plan badge type based on characteristics
 * @param {Object} plan - Plan object
 * @param {Object} context - Context with cheapest/bestDeal info
 * @returns {string|null} Badge type: 'cheapest', 'bestDeal', 'unlimited', or null
 */
export const getPlanBadge = (plan, context = {}) => {
  if (!plan) return null;

  if (context.isCheapest) return 'cheapest';
  if (plan.isUnlimited === true || plan.is_unlimited === true) return 'unlimited';
  if (context.isBestDeal) return 'bestDeal';

  return null;
};

/**
 * Badge configurations for styling
 */
export const badgeConfig = {
  cheapest: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: 'Best Price'
  },
  bestDeal: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    label: 'Best Value'
  },
  unlimited: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    label: 'Unlimited data'
  }
};

/**
 * Get data value in MB for sorting/comparison
 * @param {Object} plan - Plan object
 * @returns {number} Data in MB (Infinity for unlimited)
 */
export const getDataValueInMB = (plan) => {
  if (!plan) return 0;

  // Unlimited plans return Infinity
  if (plan.isUnlimited === true || plan.is_unlimited === true) {
    return Infinity;
  }

  // Use dataAmountMb if available
  const mb = plan.dataAmountMb || plan.data_amount_mb;
  if (mb && mb > 0) {
    return mb;
  }

  // Parse from data string
  const dataStr = plan.data_display || plan.data || '0';

  if (typeof dataStr === 'string') {
    const lower = dataStr.toLowerCase();
    if (lower.includes('unlimited') || lower === '∞') {
      return Infinity;
    }

    const match = dataStr.match(/(\d+\.?\d*)\s*(GB|MB)/i);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      return unit === 'GB' ? value * 1024 : value;
    }
  }

  return 0;
};

export default {
  formatDataDisplay,
  planHasSms,
  planHasVoice,
  getSmsCount,
  getVoiceMinutes,
  getValidityDays,
  planIsRegional,
  planIsGlobal,
  getCoveredCountryCount,
  getOperatorInfo,
  getFairUsagePolicy,
  getActivationPolicy,
  formatActivationPolicy,
  getPlanBadge,
  badgeConfig,
  getDataValueInMB
};
