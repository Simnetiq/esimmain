/**
 * eSIM Field Mapper Utility
 * 
 * Provides consistent field mapping across the entire system.
 * Handles the conversion between Airalo API response format and our internal format.
 * 
 * Standard Field Names (used internally):
 * 
 * QR Code Data:
 * - qr_code: LPA string for QR generation (e.g., "LPA:1$sm-v4-006....")
 * - qr_code_url: URL to QR code image
 * - direct_apple_installation_url: Apple direct install link
 * - iccid: eSIM identifier
 * - matching_id: Matching ID for activation
 * - activation_code: Activation code
 * - smdp_address: SM-DP+ address
 * 
 * Country/Region Data:
 * - country_code: Country ISO code (e.g., "de", "us")
 * - country_region: Country/region display name (e.g., "Germany", "Asia")
 * - is_regional: Boolean for regional/multi-country plans
 * - country_codes: Array of covered country codes
 * 
 * Plan Details:
 * - data_amount_mb: Data in MB
 * - validity: Validity in days
 * - sms: SMS count
 * - voice_minutes: Voice minutes
 * - operator: Network operator name
 * - is_unlimited: Whether data is unlimited
 */

/**
 * Map Airalo SIM data to standard format
 * @param {Object} simData - Raw SIM data from Airalo API
 * @returns {Object} Standardized QR code data
 */
export function mapAiraloSimData(simData) {
  if (!simData) return null;
  
  // The LPA string is the key for QR generation
  const lpaString = simData.qrcode || simData.lpa || simData.qr_code;
  
  return {
    // Primary fields (snake_case for storage)
    qr_code: lpaString,
    qr_code_url: simData.qrcode_url || simData.qr_code_url,
    direct_apple_installation_url: simData.direct_apple_installation_url || simData.qrcode_url,
    iccid: simData.iccid,
    matching_id: simData.matching_id,
    activation_code: simData.activation_code || simData.matching_id,
    smdp_address: simData.lpa,
    
    // Also provide camelCase aliases for backwards compatibility
    qrCode: lpaString,
    qrCodeUrl: simData.qrcode_url || simData.qr_code_url,
    directAppleInstallationUrl: simData.direct_apple_installation_url || simData.qrcode_url,
    matchingId: simData.matching_id,
    activationCode: simData.activation_code || simData.matching_id,
    smdpAddress: simData.lpa,
    lpa: lpaString,
    
    // Mark as real data
    isReal: true
  };
}

/**
 * Map package data to standard country/region format
 * @param {Object} packageData - Package data from database or API
 * @returns {Object} Standardized country data
 */
export function mapPackageCountryData(packageData) {
  if (!packageData) return null;
  
  const countryCode = packageData.country_code || 
                      packageData.countryCode || 
                      null;
  
  const countryName = packageData.country_region || 
                      packageData.countryName || 
                      packageData.country_name ||
                      packageData.name ||
                      null;
  
  const isRegional = packageData.is_regional || 
                     packageData.isRegional || 
                     false;
  
  const countryCodes = packageData.country_codes || 
                       packageData.countryCodes || 
                       (countryCode ? [countryCode] : []);
  
  return {
    // Primary fields (snake_case for storage)
    country_code: countryCode,
    country_region: countryName,
    is_regional: isRegional,
    country_codes: countryCodes,
    
    // Also provide camelCase aliases for component props
    countryCode: countryCode?.toUpperCase(),
    countryName: countryName,
    isRegional: isRegional,
    countryCodes: countryCodes
  };
}

/**
 * Map plan details to standard format
 * @param {Object} planData - Plan data from order or API
 * @returns {Object} Standardized plan details
 */
export function mapPlanDetails(planData) {
  if (!planData) return {};
  
  return {
    // Data
    data: planData.data || `${planData.data_amount_mb || planData.dataAmountMb || 0} MB`,
    data_amount_mb: planData.data_amount_mb || planData.dataAmountMb || planData.capacity || 0,
    dataAmountMb: planData.data_amount_mb || planData.dataAmountMb || planData.capacity || 0,
    
    // Validity
    validity: planData.validity || planData.period || planData.day || 0,
    validity_unit: planData.validity_unit || 'days',
    
    // SMS & Voice
    sms: planData.sms || planData.text || 0,
    voice_minutes: planData.voice || planData.voice_minutes || 0,
    voice: planData.voice || planData.voice_minutes || 0,
    
    // Operator
    operator: planData.operator || planData.networks || 'Airalo Partner Network',
    esim_type: planData.esim_type || 'Prepaid',
    
    // Unlimited
    is_unlimited: planData.is_unlimited || planData.isUnlimited || false,
    isUnlimited: planData.is_unlimited || planData.isUnlimited || false
  };
}

/**
 * Map a complete order from Firebase to component-ready format
 * @param {Object} orderDoc - Order document from Firebase
 * @param {string} docId - Document ID
 * @returns {Object} Fully mapped order object
 */
export function mapFirebaseOrder(orderDoc, docId) {
  if (!orderDoc) return null;
  
  const data = orderDoc;
  
  // Get SIM data from orderData.sims[0] (Airalo structure)
  const simData = data.orderData?.sims?.[0] || data.simData;
  const qrData = simData ? mapAiraloSimData(simData) : {
    qr_code: data.qrCode || data.qr_code,
    qr_code_url: data.qrCodeUrl || data.qr_code_url,
    direct_apple_installation_url: data.directAppleInstallationUrl || data.direct_apple_installation_url,
    iccid: data.iccid,
    matching_id: data.matchingId || data.matching_id,
    activation_code: data.activationCode || data.activation_code,
    lpa: data.lpa,
    // camelCase aliases
    qrCode: data.qrCode || data.qr_code,
    qrCodeUrl: data.qrCodeUrl || data.qr_code_url,
    directAppleInstallationUrl: data.directAppleInstallationUrl || data.direct_apple_installation_url,
    matchingId: data.matchingId || data.matching_id,
    activationCode: data.activationCode || data.activation_code,
    isReal: !!(data.qrCode || data.qr_code)
  };
  
  // Get country data
  const countryData = mapPackageCountryData(data);
  
  // Get plan details
  const planDetails = mapPlanDetails(data.orderData || data.planDetails || data);
  
  // Get installation instructions
  const installation = {
    guides: data.orderData?.installation_guides || data.installation?.guides || {},
    manual: data.orderData?.manual_installation || data.installation?.manual || '',
    qrcode: data.orderData?.qrcode_installation || data.installation?.qrcode || '',
    apn: simData?.apn || data.orderData?.apn || data.installation?.apn || {}
  };
  
  // Determine status
  let status = data.status || 'pending';
  if (simData && (data.paymentStatus === 'completed' || data.paymentStatus === 'paid')) {
    status = 'active';
  }
  
  return {
    id: docId,
    ...data,
    
    // Identifiers
    orderId: data.orderResult?.orderId || data.order_id || data.orderId || docId,
    airaloOrderId: data.airaloOrderId || data.orderData?.id,
    
    // Plan info
    planName: data.planName || data.customerName || data.orderData?.package || 'Unknown Plan',
    amount: data.amount || data.price || data.orderResult?.price || data.orderData?.price || 0,
    currency: data.currency || 'usd',
    
    // Status
    status: status,
    paymentStatus: data.paymentStatus || data.orderResult?.paymentStatus || 'unknown',
    
    // Customer
    customerEmail: data.customerEmail || data.userEmail,
    
    // Timestamps
    createdAt: data.createdAt || data.created_at,
    updatedAt: data.updatedAt || data.updated_at,
    
    // Country/Region (both formats)
    ...countryData,
    
    // QR Code data (both formats)
    qrCode: qrData,
    
    // Plan details
    planDetails: planDetails,
    
    // Installation instructions
    installation: installation,
    
    // Raw data for reference
    airaloOrderData: data.orderData
  };
}

/**
 * Extract QR code value for display (handles multiple formats)
 * @param {Object} qrData - QR code data object
 * @returns {string|null} QR code string for display
 */
export function getQrCodeValue(qrData) {
  if (!qrData) return null;
  
  // Handle direct string
  if (typeof qrData === 'string') return qrData;
  
  // Handle object with various possible field names
  return qrData.qr_code || 
         qrData.qrCode || 
         qrData.lpa || 
         qrData.qrcode ||
         null;
}

/**
 * Extract QR code URL for display (handles multiple formats)
 * @param {Object} qrData - QR code data object
 * @returns {string|null} QR code URL
 */
export function getQrCodeUrl(qrData) {
  if (!qrData) return null;
  
  return qrData.qr_code_url || 
         qrData.qrCodeUrl || 
         qrData.qrcode_url ||
         null;
}

/**
 * Get Apple direct install URL
 * @param {Object} qrData - QR code data object
 * @returns {string|null} Apple direct install URL
 */
export function getAppleInstallUrl(qrData) {
  if (!qrData) return null;
  
  return qrData.direct_apple_installation_url || 
         qrData.directAppleInstallationUrl ||
         qrData.qr_code_url ||
         qrData.qrCodeUrl ||
         null;
}

/**
 * Get ICCID from various data structures
 * @param {Object} data - Order or QR data
 * @returns {string|null} ICCID
 */
export function getIccid(data) {
  if (!data) return null;
  
  return data.iccid || 
         data.qrCode?.iccid ||
         data.airaloOrderData?.sims?.[0]?.iccid ||
         data.orderData?.sims?.[0]?.iccid ||
         data.simData?.iccid ||
         null;
}

/**
 * Build order details object for EsimQrCode component
 * @param {Object} order - Full order object
 * @returns {Object} Order details for EsimQrCode
 */
export function buildOrderDetailsForQrCode(order) {
  if (!order) return null;
  
  return {
    orderId: order.orderId || order.order_id || order.id,
    planName: order.planName || order.plan_name || 'eSIM Plan',
    amount: order.amount || 0,
    validity: order.planDetails?.validity || order.validity || 30,
    status: order.status || 'active'
  };
}

/**
 * Build QR code data object for EsimQrCode component
 * @param {Object} order - Full order object
 * @returns {Object} QR code data for EsimQrCode
 */
export function buildQrCodeData(order) {
  if (!order) return null;
  
  const qrData = order.qrCode || {};
  
  return {
    // Use the field names EsimQrCode.jsx expects
    qr_code_url: getAppleInstallUrl(qrData),
    qr_code: getQrCodeValue(qrData),
    
    // Include all other useful fields
    iccid: getIccid(order),
    matching_id: qrData.matching_id || qrData.matchingId,
    activation_code: qrData.activation_code || qrData.activationCode,
    direct_apple_installation_url: getAppleInstallUrl(qrData)
  };
}

export default {
  mapAiraloSimData,
  mapPackageCountryData,
  mapPlanDetails,
  mapFirebaseOrder,
  getQrCodeValue,
  getQrCodeUrl,
  getAppleInstallUrl,
  getIccid,
  buildOrderDetailsForQrCode,
  buildQrCodeData
};



