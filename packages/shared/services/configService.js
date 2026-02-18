/**
 * Configuration Service - Supabase version
 */

import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

class ConfigService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000;
  }

  async _getConfigValue(key) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data?.value || null;
    } catch (error) {
      return null;
    }
  }

  async getStripeMode() {
    try {
      const config = await this._getConfigValue('stripe');
      if (config?.mode) return config.mode;
      const savedMode = localStorage.getItem('esim_stripe_mode');
      return savedMode || 'test';
    } catch (error) {
      const savedMode = localStorage.getItem('esim_stripe_mode');
      return savedMode || 'test';
    }
  }

  async getDataPlansEnvironment() {
    try {
      const config = await this._getConfigValue('environment');
      if (config?.mode) return config.mode;
      const savedEnv = localStorage.getItem('esim_environment');
      return savedEnv || 'test';
    } catch (error) {
      const savedEnv = localStorage.getItem('esim_environment');
      return savedEnv || 'test';
    }
  }

  async getAiraloConfig() {
    try {
      const config = await this._getConfigValue('airalo');
      if (config?.api_key) {
        return {
          apiKey: config.api_key,
          environment: config.environment || 'sandbox',
          baseUrl: 'https://partners-api.airalo.com/v2'
        };
      }
      const savedKey = localStorage.getItem('airalo_api_key');
      const savedEnv = localStorage.getItem('airalo_environment') || 'test';
      if (savedKey) {
        return { apiKey: savedKey, environment: savedEnv, baseUrl: 'https://partners-api.airalo.com/v2' };
      }
      return { apiKey: null, environment: 'sandbox', baseUrl: 'https://sandbox-partners-api.airalo.com/v2' };
    } catch (error) {
      return { apiKey: null, environment: 'sandbox', baseUrl: 'https://sandbox-partners-api.airalo.com/v2' };
    }
  }

  async getStripePublishableKey(mode = 'test') {
    try {
      const envKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (envKey) return envKey;

      const config = await this._getConfigValue('stripe');
      if (config) {
        const liveKey = config.livePublishableKey || config.live_publishable_key;
        if (liveKey) return liveKey;
      }
      throw new Error('Stripe keys not configured. Please contact administrator.');
    } catch (error) {
      if (error.message?.includes('expired')) {
        this.logExpiredStripeKey('publishable', error);
      }
      throw new Error('Stripe keys not configured. Please contact administrator.');
    }
  }

  async getStripeSecretKey(mode = 'test') {
    try {
      if (mode === 'live' || mode === 'production') {
        const envKey = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
        if (envKey) return envKey;
      } else {
        const envKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
        if (envKey) return envKey;
      }

      const config = await this._getConfigValue('stripe');
      if (config) {
        if (mode === 'live' || mode === 'production') {
          const liveKey = config.liveSecretKey || config.live_secret_key;
          if (liveKey) return liveKey;
        } else {
          const testKey = config.testSecretKey || config.test_secret_key;
          if (testKey) return testKey;
        }
      }
      throw new Error('Stripe secret key not configured');
    } catch (error) {
      throw error;
    }
  }

  async logExpiredStripeKey(keyType = 'unknown', error = null) {
    try {
      const supabase = getSupabase();
      await supabase.from('application_logs').insert({
        type: 'stripe',
        level: 'error',
        message: `Expired Stripe ${keyType} key detected`,
        details: error ? `Error: ${error.message}` : 'Stripe key validation failed',
        metadata: {
          keyType,
          errorCode: error?.code || 'unknown',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
          url: typeof window !== 'undefined' ? window.location.href : 'server'
        }
      });
    } catch (logError) {}
  }

  async logPromocodeUsage(promocode, userId, action, details = {}) {
    try {
      const supabase = getSupabase();
      await supabase.from('application_logs').insert({
        type: 'promocode',
        level: action === 'used' ? 'success' : 'info',
        message: `Promocode "${promocode}" ${action}`,
        details: details.message || `Promocode ${action} by user`,
        user_id: userId,
        metadata: {
          promocode,
          action,
          discountAmount: details.discountAmount || null,
          originalAmount: details.originalAmount || null,
          finalAmount: details.finalAmount || null,
          planId: details.planId || null,
          country: details.country || null,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
          url: typeof window !== 'undefined' ? window.location.href : 'server',
          ip: details.ip || null
        }
      });
    } catch (logError) {}
  }

  async getOpenRouterConfig() {
    try {
      const config = await this._getConfigValue('openrouter');
      if (config?.api_key) {
        return {
          apiKey: config.api_key,
          model: config.model || 'openai/gpt-3.5-turbo',
          baseUrl: 'https://openrouter.ai/api/v1',
          maxTokens: config.max_tokens || 150,
          temperature: config.temperature || 0.7,
          siteName: config.site_name || 'Simnetiq',
          siteUrl: config.site_url || 'https://esim.Simnetiq.net'
        };
      }
      const envKey = process.env.OPENROUTER_API_KEY;
      if (envKey) {
        return {
          apiKey: envKey,
          model: process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo',
          baseUrl: 'https://openrouter.ai/api/v1',
          maxTokens: parseInt(process.env.OPENROUTER_MAX_TOKENS) || 150,
          temperature: parseFloat(process.env.OPENROUTER_TEMPERATURE) || 0.7,
          siteName: process.env.OPENROUTER_SITE_NAME || 'Simnetiq',
          siteUrl: process.env.OPENROUTER_SITE_URL || 'https://esim.Simnetiq.net'
        };
      }
      return {
        apiKey: null, model: 'openai/gpt-3.5-turbo', baseUrl: 'https://openrouter.ai/api/v1',
        maxTokens: 150, temperature: 0.7, siteName: 'Simnetiq', siteUrl: 'https://esim.Simnetiq.net'
      };
    } catch (error) {
      return {
        apiKey: null, model: 'openai/gpt-3.5-turbo', baseUrl: 'https://openrouter.ai/api/v1',
        maxTokens: 150, temperature: 0.7, siteName: 'Simnetiq', siteUrl: 'https://Simnetiq.com'
      };
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export const configService = new ConfigService();
