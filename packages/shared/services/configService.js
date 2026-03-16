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
      if (typeof window !== 'undefined') {
        const savedMode = localStorage.getItem('esim_stripe_mode');
        if (savedMode) return savedMode;
      }
      return process.env.STRIPE_MODE || 'test';
    } catch (error) {
      return process.env.STRIPE_MODE || 'test';
    }
  }

  async getDataPlansEnvironment() {
    try {
      const config = await this._getConfigValue('environment');
      if (config?.mode) return config.mode;
      if (typeof window !== 'undefined') {
        const savedEnv = localStorage.getItem('esim_environment');
        if (savedEnv) return savedEnv;
      }
      return process.env.AIRALO_MODE || 'test';
    } catch (error) {
      return process.env.AIRALO_MODE || 'test';
    }
  }

  async getAiraloConfig() {
    const envKey = process.env.AIRALO_CLIENT_SECRET;
    const envMode = process.env.AIRALO_MODE || 'sandbox';
    const envBaseUrl = process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com/v2';
    if (!envKey) {
      throw new Error('AIRALO_CLIENT_SECRET is not set in environment variables');
    }
    return { apiKey: envKey, environment: envMode, baseUrl: envBaseUrl };
  }

  async getStripePublishableKey(mode = 'test') {
    const envKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!envKey) {
      throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set in environment variables');
    }
    return envKey;
  }

  async getStripeSecretKey(mode = 'test') {
    if (typeof window !== 'undefined') {
      throw new Error('getStripeSecretKey must only be called on the server');
    }
    if (mode === 'live' || mode === 'production') {
      const envKey = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
      if (envKey) return envKey;
    } else {
      const envKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
      if (envKey) return envKey;
    }
    throw new Error('Stripe secret key not configured in environment variables');
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
    const envKey = process.env.OPENROUTER_API_KEY;
    if (!envKey) {
      throw new Error('OPENROUTER_API_KEY is not set in environment variables');
    }
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

  clearCache() {
    this.cache.clear();
  }
}

export const configService = new ConfigService();
