/**
 * API Service for eSIM operations
 * 
 * ⛔ SECURITY NOTE:
 * The createOrder function is DISABLED.
 * eSIM orders are ONLY created by server-side webhooks after payment verification.
 * 
 * This prevents attackers from creating free eSIMs by calling the API directly.
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
   */
  async getQrCode(orderId, orderData = {}) {
    const { esimService } = await import('./esimService');
    return esimService.getEsimQrCode(orderId, orderData);
  },

  /**
   * Get SIM usage data by ICCID
   * This is safe - read-only operation
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
  }
};
