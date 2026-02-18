/**
 * eSIM Service - Supabase version
 * 
 * ⛔ SECURITY NOTE:
 * Order creation functions are DISABLED.
 * eSIM orders are ONLY created by server-side webhooks after payment verification.
 * 
 * Most operations here call API endpoints (not direct DB access),
 * so the Supabase migration only affects getEsimQrCode which read from config.
 */

import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

export const esimService = {
  /**
   * ⛔ DISABLED FOR SECURITY
   */
  async createOrder() {
    throw new Error(
      'SECURITY: createOrder is disabled. eSIM orders are created automatically by webhooks after payment.'
    );
  },

  /**
   * ⛔ DISABLED FOR SECURITY
   */
  async createAiraloOrderV2() {
    throw new Error(
      'SECURITY: createAiraloOrderV2 is disabled. eSIM orders are created automatically by webhooks after payment.'
    );
  },

  /**
   * Get eSIM QR code - SAFE (read-only)
   */
  async getEsimQrCode(orderId, orderData = {}) {
    try {
      let apiKey = null;
      let baseUrl = null;
      const isTestMode = orderData.isTestMode || orderData.mode === 'sandbox';

      if (!isTestMode && isSupabaseAvailable()) {
        const supabase = getSupabase();
        const { data: configData } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'airalo')
          .single();

        if (configData?.value) {
          apiKey = configData.value.api_key;
          baseUrl = configData.value.base_url;
        }
      }

      const mockSimData = orderData.orderData?.sims?.[0] || orderData.sims?.[0];

      const response = await fetch('/api/airalo/qr-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          airaloOrderId: orderData.airaloOrderId || orderData.id,
          isTestMode,
          mockSimData,
          apiKey,
          baseUrl
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to get QR code');
      return result;
    } catch (error) {
      console.error('Error getting QR code:', error);
      throw error;
    }
  },

  async getEsimDetails(orderId) {
    try {
      const response = await fetch('/api/airalo/sim-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to get eSIM details');
      return result;
    } catch (error) {
      console.error('Error getting eSIM details:', error);
      throw error;
    }
  },

  async getEsimUsage(orderId) {
    try {
      const response = await fetch('/api/airalo/sim-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to get eSIM usage');
      return result;
    } catch (error) {
      console.error('Error getting eSIM usage:', error);
      throw error;
    }
  },

  async getEsimUsageByIccid(iccid) {
    try {
      const response = await fetch('/api/airalo/sim-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iccid })
      });
      const result = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to get eSIM usage',
          statusCode: result.statusCode || response.status,
          isUnsupported: result.isUnsupported || false
        };
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message || 'Failed to get eSIM usage', statusCode: 500 };
    }
  },

  async getEsimDetailsByIccid(iccid) {
    try {
      const response = await fetch('/api/airalo/sim-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iccid })
      });
      const result = await response.json();
      if (!response.ok) {
        if (!result.error?.includes('credentials')) {
          console.error('Error getting eSIM details:', result.error);
        }
        throw new Error(result.error || 'Failed to get eSIM details');
      }
      return result;
    } catch (error) {
      if (!error.message?.includes('credentials')) {
        console.error('Error getting eSIM details by ICCID:', error);
      }
      throw error;
    }
  },

  async fetchPlans(countryCode = null, limit = 100) {
    try {
      const params = new URLSearchParams();
      if (countryCode) params.append('country', countryCode);
      params.append('limit', limit.toString());
      const response = await fetch(`/api/airalo/plans?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch plans');
      return result;
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw error;
    }
  },

  async fetchCountries(limit = 100) {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      const response = await fetch(`/api/airalo/countries?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch countries');
      return result;
    } catch (error) {
      console.error('Error fetching countries:', error);
      throw error;
    }
  },

  async syncAllDataFromApi(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.countriesOnly) params.append('countries_only', 'true');
      if (options.includeTopup === false) params.append('include_topup', 'false');
      const url = `/api/sync-airalo${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to sync data');
      return result;
    } catch (error) {
      console.error('Error syncing data:', error);
      throw error;
    }
  },

  async updateEsimBrand(iccid, brandSettingsName = null) {
    try {
      const response = await fetch('/api/airalo/sim-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iccid, brand_settings_name: brandSettingsName })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update eSIM brand');
      return result;
    } catch (error) {
      console.error('Error updating eSIM brand:', error);
      throw error;
    }
  },

  async getEsimList(options = {}) {
    try {
      const response = await fetch('/api/airalo/sim-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iccid: options.iccid,
          created_at: options.createdAt,
          include: options.include || 'order,order.status',
          limit: options.limit || 100,
          page: options.page || 1
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to get eSIM list');
      return result;
    } catch (error) {
      console.error('Error getting eSIM list:', error);
      throw error;
    }
  },

  async getEsimPackageHistory(iccid) {
    try {
      const response = await fetch('/api/airalo/sim-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iccid })
      });
      const result = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to get package history',
          statusCode: result.statusCode || response.status,
          retryAfter: result.retryAfter
        };
      }
      return result;
    } catch (error) {
      console.error('Error getting eSIM package history:', error);
      return { success: false, error: error.message || 'Failed to get package history' };
    }
  }
};
