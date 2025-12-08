/**
 * API Service for eSIM operations
 * 
 * ⛔ SECURITY NOTE:
 * The createOrder function is DISABLED.
 * eSIM orders are ONLY created by server-side webhooks after payment verification.
 * 
 * This prevents attackers from creating free eSIMs by calling the API directly.
 * 
 * FIELD NAMING CONVENTION:
 * All API responses return BOTH snake_case and camelCase for compatibility:
 * - qr_code / qrCode - LPA string for QR generation
 * - qr_code_url / qrCodeUrl - URL to QR image
 * - direct_apple_installation_url / directAppleInstallationUrl - Apple install link
 * - matching_id / matchingId - Matching ID for activation
 * - country_code / countryCode - Country ISO code
 * - country_region / countryName - Country/region display name
 */

export const apiService = {
  /**
   * ⛔ DISABLED FOR SECURITY
   * eSIM orders should ONLY be created by webhooks after payment verification.
   * DO NOT call this function from client-side code.
   * 
   * @deprecated Use webhooks instead
   */
  async createOrder() {
    throw new Error(
      'SECURITY: createOrder is disabled. eSIM orders are created automatically by webhooks after payment.'
    );
  },

  /**
   * Get QR code for an eSIM order
   * This is safe - it only reads existing data from Firebase
   * Returns both snake_case and camelCase field names for compatibility
   */
  async getQrCode(orderId, orderData = {}) {
    const { esimService } = await import('./esimService');
    return esimService.getEsimQrCode(orderId, orderData);
  },

  /**
   * Get SIM usage data by ICCID
   * This is safe - read-only operation
   * Returns normalized data with consistent field names
   */
  async getSimUsage(iccid) {
    const response = await fetch('/api/airalo/sim-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iccid }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get SIM usage');
    }

    return await response.json();
  },

  /**
   * Get SIM details by ICCID
   * This is safe - read-only operation
   * Returns both snake_case and camelCase field names for compatibility
   */
  async getSimDetails(iccid) {
    const response = await fetch('/api/airalo/sim-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iccid }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get SIM details');
    }

    return await response.json();
  },

  /**
   * Helper: Get QR code value from various data structures
   * Handles both snake_case and camelCase field names
   */
  getQrCodeValue(data) {
    if (!data) return null;
    if (typeof data === 'string') return data;
    return data.qr_code || data.qrCode || data.lpa || data.qrcode || null;
  },

  /**
   * Helper: Get Apple install URL from various data structures
   */
  getAppleInstallUrl(data) {
    if (!data) return null;
    return data.direct_apple_installation_url || 
           data.directAppleInstallationUrl ||
           data.qr_code_url ||
           data.qrCodeUrl ||
           null;
  },

  /**
   * Helper: Get ICCID from various data structures
   */
  getIccid(data) {
    if (!data) return null;
    return data.iccid || 
           data.qrCode?.iccid ||
           data.airaloOrderData?.sims?.[0]?.iccid ||
           data.orderData?.sims?.[0]?.iccid ||
           null;
  },

  /**
   * Helper: Get country info from various data structures (both formats)
   */
  getCountryInfo(data) {
    if (!data) return { code: null, name: null, isRegional: false };
    
    const code = data.country_code || data.countryCode || null;
    const name = data.country_region || data.countryName || data.country_name || null;
    const isRegional = data.is_regional || data.isRegional || false;
    
    return { code, name, isRegional };
  }
};
