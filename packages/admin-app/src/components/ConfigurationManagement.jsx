'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import supabase from '../lib/supabase';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Globe, 
  RefreshCw, 
  Trash2, 
  Download,
  Database,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  
  Save,
  CreditCard,
  Brain,
  Play
} from 'lucide-react';
import toast from 'react-hot-toast';

const ConfigurationManagement = () => {
  const { currentUser } = useAuth();

  // State Management

  const [roamjetApiKey, setRoamjetApiKey] = useState('');
  const [roamjetBaseUrl, setRoamjetBaseUrl] = useState('https://sandbox.roamjet.net');
  const [loading, setLoading] = useState(false);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Price Configuration
  const [markupPercentage, setMarkupPercentage] = useState(17);
  const [regularDiscountPercentage, setRegularDiscountPercentage] = useState(10);
  const [transactionCommissionPercentage, setTransactionCommissionPercentage] = useState(5);

  // Stripe Configuration
  const [stripeConfig, setStripeConfig] = useState({
    livePublishableKey: ''
  });
  const [savingStripe, setSavingStripe] = useState(false);

  // Version Configuration
  const [versionConfig, setVersionConfig] = useState({
    min_required_version: '1.0.0'
  });
  const [savingVersion, setSavingVersion] = useState(false);

  // OpenRouter Configuration
  const [openRouterConfig, setOpenRouterConfig] = useState({
    api_key: '',
    model: 'openai/gpt-3.5-turbo',
    max_tokens: 150,
    temperature: 0.7,
    site_name: 'Simnetiq',
    site_url: 'https://esim.simnetiq.shop'
  });
  const [savingOpenRouter, setSavingOpenRouter] = useState(false);

  // Notification Automation
  const [testingNotification, setTestingNotification] = useState(false);
  const [lastNotificationResult, setLastNotificationResult] = useState(null);

  // Load configuration on component mount
  useEffect(() => {
    if (currentUser) {
      loadSavedConfig();
      loadRoamjetApiKey();
      loadMarkupPercentage();
      loadVersionConfig();
      loadStripeConfig();
      loadOpenRouterConfig();
    }
  }, [currentUser]);

  // Configuration Functions
  const loadSavedConfig = async () => {
    try {
      // Admin config loaded from app_config table
    } catch {
    }
  };

  const loadRoamjetApiKey = async () => {
    try {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'roamjet')
        .maybeSingle();
      
      if (data?.value) {
        if (data.value.api_key) setRoamjetApiKey(data.value.api_key);
        if (data.value.base_url) setRoamjetBaseUrl(data.value.base_url);
        return;
      }
      
      // Fallback to localStorage
      const storedApiKey = localStorage.getItem('roamjet_api_key');
      const storedBaseUrl = localStorage.getItem('roamjet_base_url');
      if (storedApiKey) setRoamjetApiKey(storedApiKey);
      if (storedBaseUrl) setRoamjetBaseUrl(storedBaseUrl);
    } catch {
    }
  };

  const loadMarkupPercentage = async () => {
    try {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'pricing')
        .maybeSingle();
      
      if (data?.value) {
        setMarkupPercentage(data.value.markup_percentage || 17);
        setRegularDiscountPercentage(data.value.regular_discount_percentage || 10);
        setTransactionCommissionPercentage(data.value.transaction_commission_percentage || 5);
      }
    } catch {
    }
  };

  const saveRoamjetCredentials = async () => {
    try {
      if (!roamjetApiKey.trim()) {
        toast.error('Please enter a valid RoamJet API Key');
        return;
      }
      
      localStorage.setItem('roamjet_api_key', roamjetApiKey);
      localStorage.setItem('roamjet_base_url', roamjetBaseUrl);
      
      await supabase.from('app_config').upsert({
        key: 'roamjet',
        value: {
          api_key: roamjetApiKey,
          base_url: roamjetBaseUrl,
          updated_by: currentUser?.id || 'admin'
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      
      toast.success('RoamJet API credentials saved successfully!');
    } catch {
      toast.error('Failed to save RoamJet API credentials');
    }
  };

  const saveMarkupPercentage = async () => {
    try {
      setLoading(true);
      
      await supabase.from('app_config').upsert({
        key: 'pricing',
        value: {
          markup_percentage: markupPercentage,
          regular_discount_percentage: regularDiscountPercentage,
          transaction_commission_percentage: transactionCommissionPercentage,
          updated_by: currentUser?.id || 'admin'
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      
      await supabase.from('app_config').upsert({
        key: 'settings_general',
        value: {
          referral: {
            discountPercentage: markupPercentage,
            minimumPrice: 0.5,
            transactionCommissionPercentage: transactionCommissionPercentage
          },
          regular: {
            discountPercentage: regularDiscountPercentage,
            minimumPrice: 0.5
          },
          updatedBy: currentUser?.id || 'admin'
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      
      toast.success(`Settings updated: Referral ${markupPercentage}%, Regular ${regularDiscountPercentage}%, Commission ${transactionCommissionPercentage}%`);
    } catch {
      toast.error('Failed to save markup percentage');
    } finally {
      setLoading(false);
    }
  };

  const syncCountriesFromAiralo = async () => {
    try {
      setCountriesLoading(true);
      setSyncStatus('Syncing countries from Airalo API...');

      // Call the same API as plans but with countries_only parameter
      const response = await fetch('/api/sync-airalo?countries_only=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      
      if (result.success) {
        const count = result.details?.countries_synced || 0;
        setSyncStatus(`Successfully synced ${count} countries from Airalo API`);
        toast.success(`Successfully synced ${count} countries from Airalo API`);
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
      } catch {
      toast.error('Failed to sync countries');
    } finally {
      setCountriesLoading(false);
    }
  };

  const syncAllDataFromAiralo = async () => {
    try {
      setPlansLoading(true);
      setSyncStatus('Syncing plans from Airalo API...');

      // Call the Next.js API endpoint instead of Firebase function
      const response = await fetch('/api/sync-airalo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();

      if (result.success) {
        toast.success(`Successfully synced plans: ${result.total_synced} items`);
        setSyncStatus(`Successfully synced ${result.total_synced} plans from Airalo API`);
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch {
      toast.error('Failed to sync data');
    } finally {
      setPlansLoading(false);
    }
  };

  const deleteAllCountries = async () => {
    if (!window.confirm('Are you sure you want to delete ALL countries and plans? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      
      // Delete all countries
      await supabase.from('countries').delete().neq('id', '');
      
      // Delete all plans
      await supabase.from('dataplans').delete().neq('id', '');

      toast.success('All data has been reset successfully!');
    } catch {
      toast.error('Failed to reset data');
    } finally {
      setIsDeleting(false);
    }
  };

  // Version Configuration Functions
  const loadVersionConfig = async () => {
    try {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'version')
        .maybeSingle();
      
      if (data?.value) {
        setVersionConfig(prev => ({
          ...prev,
          ...data.value
        }));
      }
    } catch {
      toast.error('Failed to load version config');
    }
  };

  const saveVersionConfig = async () => {
    try {
      setSavingVersion(true);
      
      // Validate version format
      if (!isValidVersion(versionConfig.min_required_version)) {
        toast.error('Invalid version format (use numbers like 1, 1.0, or 1.0.0)');
        return;
      }

      await supabase.from('app_config').upsert({
        key: 'version',
        value: {
          min_required_version: versionConfig.min_required_version,
          last_updated: new Date().toISOString(),
          last_updated_by: currentUser?.email || 'admin'
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      
      toast.success('Version configuration saved successfully!');
    } catch {
      toast.error('Failed to save version config');
    } finally {
      setSavingVersion(false);
    }
  };

  // Validate version format (allow simple numbers like "1" or "1.0" or "1.0.0")
  const isValidVersion = (version) => {
    const versionRegex = /^\d+(\.\d+)*$/;
    return versionRegex.test(version);
  };

  // Handle version input changes
  const handleVersionInputChange = (field, value) => {
    setVersionConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Stripe Configuration Functions
  const loadStripeConfig = async () => {
    try {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'stripe')
        .maybeSingle();
      
      if (data?.value) {
        setStripeConfig(prev => ({
          ...prev,
          livePublishableKey: data.value.livePublishableKey || data.value.live_publishable_key || ''
        }));
      }
    } catch {
      toast.error('Error loading Stripe configuration');
    }
  };

  const saveStripeConfig = async () => {
    try {
      setSavingStripe(true);
      
      // Validate key
      if (!stripeConfig.livePublishableKey.trim()) {
        toast.error('Please enter the live publishable key');
        return;
      }

      if (!stripeConfig.livePublishableKey.startsWith('pk_live_')) {
        toast.error('Live publishable key must start with pk_live_');
        return;
      }

      await supabase.from('app_config').upsert({
        key: 'stripe',
        value: {
          livePublishableKey: stripeConfig.livePublishableKey.trim(),
          updated_by: currentUser?.id || 'admin'
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      
      toast.success('Stripe configuration saved successfully!');
    } catch {
      toast.error('Failed to save Stripe configuration');
    } finally {
      setSavingStripe(false);
    }
  };

  const handleStripeConfigChange = (field, value) => {
    setStripeConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // OpenRouter Configuration Functions
  const loadOpenRouterConfig = async () => {
    try {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'openrouter')
        .maybeSingle();
      
      if (data?.value) {
        setOpenRouterConfig(prev => ({
          ...prev,
          api_key: data.value.api_key || '',
          model: data.value.model || 'openai/gpt-3.5-turbo',
          max_tokens: data.value.max_tokens || 150,
          temperature: data.value.temperature || 0.7,
          site_name: data.value.site_name || 'Simnetiq',
          site_url: data.value.site_url || 'https://esim.simnetiq.shop'
        }));
      }
    } catch {
      toast.error('Failed to load OpenRouter configuration');
    }
  };

  const saveOpenRouterConfig = async () => {
    try {
      setSavingOpenRouter(true);
      
      // Validate API key
      if (!openRouterConfig.api_key.trim()) {
        toast.error('Please enter your OpenRouter API key');
        return;
      }

      if (!openRouterConfig.api_key.startsWith('sk-or-v1-')) {
        toast.error('OpenRouter API key should start with sk-or-v1-');
        return;
      }

      await supabase.from('app_config').upsert({
        key: 'openrouter',
        value: {
          api_key: openRouterConfig.api_key.trim(),
          model: openRouterConfig.model,
          max_tokens: parseInt(openRouterConfig.max_tokens) || 150,
          temperature: parseFloat(openRouterConfig.temperature) || 0.7,
          site_name: openRouterConfig.site_name || 'Simnetiq',
          site_url: openRouterConfig.site_url || 'https://simnetiq.shop',
          updated_by: currentUser?.id || 'admin'
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      
      toast.success('OpenRouter configuration saved successfully!');
    } catch {
      toast.error('Failed to save OpenRouter configuration');
    } finally {
      setSavingOpenRouter(false);
    }
  };

  const handleOpenRouterConfigChange = (field, value) => {
    setOpenRouterConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Test daily notification manually
  const testDailyNotification = async () => {
    try {
      setTestingNotification(true);
      setLastNotificationResult(null);
      
      toast.loading('Testing AI notification generation...', { id: 'test-notification' });
      
      const response = await fetch('/api/cron/daily-notification', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setLastNotificationResult(result);
        toast.success(`✅ Notification sent to ${result.stats?.success || 0} users!`, { id: 'test-notification' });
      } else {
        throw new Error(result.error || 'Failed to send test notification');
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`, { id: 'test-notification' });
      setLastNotificationResult({ error: error.message });
    } finally {
      setTestingNotification(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Sync */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Download className="text-green-600 mr-2" />
            Data Synchronization
          </h2>
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">API Endpoint:</div>
            <div className="text-sm font-mono text-blue-600 break-all">
              https://partners-api.airalo.com/v2
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={syncCountriesFromAiralo}
                disabled={countriesLoading || plansLoading}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center"
              >
                {countriesLoading ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Globe className="w-5 h-5 mr-2" />}
                Sync Countries Only
              </button>
              
              <button
                onClick={syncAllDataFromAiralo}
                disabled={countriesLoading || plansLoading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center"
              >
                {plansLoading ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
                Sync Plans Only
              </button>
            </div>
          </div>
        </div>

        {/* RoamJet API Configuration */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Globe className="text-blue-600 mr-2" />
            RoamJet API Configuration
          </h2>
          <div className="space-y-4">
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="text"
                value={roamjetApiKey}
                onChange={(e) => setRoamjetApiKey(e.target.value)}
                placeholder="rjapi_jlhz2bt56hcgkkcm9qlicpvzm6rpwkk"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base URL
              </label>
              <input
                type="text"
                value={roamjetBaseUrl}
                onChange={(e) => setRoamjetBaseUrl(e.target.value)}
                placeholder="https://sandbox.roamjet.net"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> RoamJet API works the same as Airalo API. Use the sandbox URL for testing and production URL for live orders.
              </p>
            </div>
            
            <div className="mt-4">
              <button
                onClick={saveRoamjetCredentials}
                disabled={loading || !roamjetApiKey.trim()}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center"
              >
                {loading ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Globe className="w-5 h-5 mr-2" />}
                Save RoamJet Credentials
              </button>
            </div>
          </div>
        </div>

        {/* Stripe Configuration */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <CreditCard className="text-green-600 mr-2" />
            Stripe Configuration
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Live Publishable Key
              </label>
              <input
                type="text"
                value={stripeConfig.livePublishableKey}
                onChange={(e) => handleStripeConfigChange('livePublishableKey', e.target.value)}
                placeholder="pk_live_..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter your Stripe live publishable key (starts with pk_live_)
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <button
                onClick={saveStripeConfig}
                disabled={savingStripe}
                className="flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors"
              >
                {savingStripe ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {savingStripe ? 'Saving...' : 'Save Stripe Key'}
              </button>
            </div>
          </div>
        </div>

        {/* OpenRouter AI & Automated Notifications */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Brain className="text-purple-600 mr-2" />
            AI Notifications (OpenRouter)
          </h2>
          
          <div className="space-y-4">
            {/* API Key Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenRouter API Key
              </label>
              <input
                type="text"
                value={openRouterConfig.api_key}
                onChange={(e) => handleOpenRouterConfigChange('api_key', e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your free API key at{' '}
                <a 
                  href="https://openrouter.ai/keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline font-medium"
                >
                  openrouter.ai/keys
                </a>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={saveOpenRouterConfig}
                disabled={savingOpenRouter || !openRouterConfig.api_key.trim()}
                className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
              >
                {savingOpenRouter ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {savingOpenRouter ? 'Saving...' : 'Save Configuration'}
              </button>

              <button
                onClick={testDailyNotification}
                disabled={testingNotification || !openRouterConfig.api_key}
                className="flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
              >
                {testingNotification ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Campaign
                  </>
                )}
              </button>
            </div>

            {/* Last Test Result */}
            {lastNotificationResult && (
              <div className={`border rounded-lg p-4 ${
                lastNotificationResult.error 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <h3 className="text-sm font-semibold mb-2 flex items-center">
                  {lastNotificationResult.error ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                      <span className="text-red-900">Test Failed</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      <span className="text-green-900">Test Successful!</span>
                    </>
                  )}
                </h3>
                {lastNotificationResult.error ? (
                  <p className="text-sm text-red-700">{lastNotificationResult.error}</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="bg-white rounded p-3 border border-green-200">
                      <p className="font-semibold text-green-900 mb-1">
                        {lastNotificationResult.generated?.title || 'Generated Message'}
                      </p>
                      <p className="text-green-800">
                        {lastNotificationResult.generated?.body || 'No message generated'}
                      </p>
                    </div>
                    <div className="text-green-700">
                      <div>✅ Sent: {lastNotificationResult.stats?.success || 0} users</div>
                      {lastNotificationResult.stats?.failed > 0 && (
                        <div>❌ Failed: {lastNotificationResult.stats.failed} users</div>
                      )}
                      <div className="text-xs text-green-600 mt-1">
                        {lastNotificationResult.timestamp}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Setup Instructions */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">
                ⚙️ Cron Setup
              </h3>
              <p className="text-xs text-gray-600 mb-2">
                <strong>Vercel:</strong> Auto-enabled via vercel.json (deploy to activate)
              </p>
              <p className="text-xs text-gray-600 mb-2">
                <strong>Other platforms:</strong> Schedule daily POST to:
              </p>
              <code className="block bg-white p-2 rounded text-xs break-all border">
                https://simnetiq.shop/api/cron/daily-notification
              </code>
              <p className="text-xs text-gray-500 mt-2">
                Use <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">cron-job.org</a> (free) or GitHub Actions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Price Configuration */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Settings className="text-blue-600 mr-2" />
          Price Configuration
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Configure referral program discount percentage.
        </p>
        
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Referral Program Discount</h3>
            <p className="text-sm text-gray-600 mb-3">
              Set the discount percentage applied to original prices for users with referral codes.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={markupPercentage}
                  onChange={(e) => setMarkupPercentage(parseFloat(e.target.value) || 0)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <span className="text-sm text-gray-600">%</span>
              </div>
              <div className="text-sm text-gray-600">
                Example: $10 original → ${(10 * (100 - markupPercentage) / 100).toFixed(2)} discounted
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Regular/Basic Discount</h3>
            <p className="text-sm text-gray-600 mb-3">
              Set the discount percentage applied to original prices for all regular users.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={regularDiscountPercentage}
                  onChange={(e) => setRegularDiscountPercentage(parseFloat(e.target.value) || 0)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <span className="text-sm text-gray-600">%</span>
              </div>
              <div className="text-sm text-gray-600">
                Example: $10 original → ${(10 * (100 - regularDiscountPercentage) / 100).toFixed(2)} discounted
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Transaction Commission</h3>
            <p className="text-sm text-gray-600 mb-3">
              Set the commission percentage that referral code owners earn from each transaction made by their referred users.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={transactionCommissionPercentage}
                  onChange={(e) => setTransactionCommissionPercentage(parseFloat(e.target.value) || 0)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <span className="text-sm text-gray-600">%</span>
              </div>
              <div className="text-sm text-gray-600">
                Example: $10 transaction → ${(10 * transactionCommissionPercentage / 100).toFixed(2)} commission earned
              </div>
            </div>
          </div>

          <div className="text-center pt-4">
            <button
              onClick={saveMarkupPercentage}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Save All Discount Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Database Management */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Database className="text-gray-600 mr-2" />
          Database Management
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Manage your database content and sync fresh data from Airalo.
        </p>
        
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Reset All Data</h3>
            <p className="text-sm text-gray-600 mb-3">
              This will remove all countries and their associated plans from the database. 
              Fresh data can then be synced from Airalo. This action cannot be undone.
            </p>
            <button
              onClick={deleteAllCountries}
              disabled={loading || isDeleting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center"
            >
              {isDeleting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 mr-2"
                >
                  <Trash2 className="w-5 h-5" />
                </motion.div>
              ) : (
                <Trash2 className="w-5 h-5 mr-2" />
              )}
              {isDeleting ? 'Resetting...' : 'Reset All Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Version Management */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Smartphone className="text-blue-600 mr-2" />
          App Version Management
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Control app version requirements and update notifications for the Flutter mobile app.
        </p>
        
        <div className="max-w-md">
          {/* Minimum Required Version */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Required Version
            </label>
            <input
              type="text"
              value={versionConfig.min_required_version}
              onChange={(e) => handleVersionInputChange('min_required_version', e.target.value)}
              placeholder="1"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Apps below this version will be blocked (format: 1, 1.0, or 1.0.0)
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={saveVersionConfig}
            disabled={savingVersion}
            className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            {savingVersion ? 'Saving...' : 'Save Version Configuration'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfigurationManagement;
