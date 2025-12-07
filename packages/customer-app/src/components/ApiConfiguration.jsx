'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { 
  Globe, 
  RefreshCw, 
  Save,
  CheckCircle,
  AlertTriangle,
  Database,
  Smartphone,
  Brain,
  Eye,
  EyeOff,
  Zap,

} from 'lucide-react';
import toast from 'react-hot-toast';

const ApiConfiguration = () => {
  const { currentUser } = useAuth();

  // RoamJet API State
  const [roamjetApiKey, setRoamjetApiKey] = useState('');
  const [roamjetBaseUrl, setRoamjetBaseUrl] = useState('https://sandbox.roamjet.net');
  const [loading, setLoading] = useState(false);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Ready to sync data from RoamJet API');

  // Coinbase Commerce State
  const [coinbaseApiKey, setCoinbaseApiKey] = useState('');
  const [coinbaseWebhookSecret, setCoinbaseWebhookSecret] = useState('');
  const [savingCoinbase, setSavingCoinbase] = useState(false);

  // OpenAI State
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [savingOpenai, setSavingOpenai] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  // Show/Hide states for sensitive keys
  const [showRoamjetKey, setShowRoamjetKey] = useState(false);
  const [showCoinbaseKey, setShowCoinbaseKey] = useState(false);
  const [showCoinbaseSecret, setShowCoinbaseSecret] = useState(false);

  // Load configuration on component mount
  useEffect(() => {
    if (currentUser) {
      loadRoamjetApiKey();
      loadCoinbaseConfig();
      loadOpenaiConfig();
    }
  }, [currentUser]);

  // Load RoamJet API Key
  const loadRoamjetApiKey = async () => {
    try {
      const configRef = doc(db, 'config', 'roamjet');
      const configDoc = await getDoc(configRef);
      if (configDoc.exists()) {
        const configData = configDoc.data();
        if (configData.api_key) {
          setRoamjetApiKey(configData.api_key);
        }
        if (configData.base_url) {
          setRoamjetBaseUrl(configData.base_url);
        }
      }
    } catch {
    }
  };

  // Load Coinbase Commerce Config
  const loadCoinbaseConfig = async () => {
    try {
      const configRef = doc(db, 'config', 'coinbase');
      const configDoc = await getDoc(configRef);
      if (configDoc.exists()) {
        const configData = configDoc.data();
        if (configData.api_key) {
          setCoinbaseApiKey(configData.api_key);
        }
        if (configData.webhook_secret) {
          setCoinbaseWebhookSecret(configData.webhook_secret);
        }
      }
    } catch {
    }
  };

  // Load OpenAI Config
  const loadOpenaiConfig = async () => {
    try {
      const configRef = doc(db, 'config', 'openai');
      const configDoc = await getDoc(configRef);
      if (configDoc.exists()) {
        const configData = configDoc.data();
        if (configData.api_key) {
          setOpenaiApiKey(configData.api_key);
        }
      }
    } catch {
    }
  };

  // Save RoamJet Credentials
  const saveRoamjetCredentials = async () => {
    try {
      if (!roamjetApiKey.trim()) {
        toast.error('Please enter a valid RoamJet API Key');
        return;
      }

      setLoading(true);
      
      const configRef = doc(db, 'config', 'roamjet');
      await setDoc(configRef, {
        api_key: roamjetApiKey,
        base_url: roamjetBaseUrl,
        updated_at: serverTimestamp(),
        updated_by: currentUser?.uid || 'admin'
      }, { merge: true });
      
      toast.success('RoamJet API credentials saved successfully!');
    } catch {
      toast.error('Failed to save RoamJet API credentials');
    } finally {
      setLoading(false);
    }
  };

  // Save Coinbase Commerce Config
  const saveCoinbaseConfig = async () => {
    try {
      if (!coinbaseApiKey.trim()) {
        toast.error('Please enter a valid Coinbase API Key');
        return;
      }

      setSavingCoinbase(true);
      
      const configRef = doc(db, 'config', 'coinbase');
      await setDoc(configRef, {
        api_key: coinbaseApiKey,
        webhook_secret: coinbaseWebhookSecret,
        updated_at: serverTimestamp(),
        updated_by: currentUser?.uid || 'admin'
      }, { merge: true });
      
      toast.success('Coinbase Commerce configuration saved successfully!');
    } catch {
      toast.error('Failed to save Coinbase Commerce configuration');
    } finally {
      setSavingCoinbase(false);
    }
  };

  // Save OpenAI Config
  const saveOpenaiConfig = async () => {
    try {
      if (!openaiApiKey.trim()) {
        toast.error('Please enter a valid OpenAI API Key');
        return;
      }

      setSavingOpenai(true);
      
      const configRef = doc(db, 'config', 'openai');
      await setDoc(configRef, {
        api_key: openaiApiKey,
        updated_at: serverTimestamp(),
        updated_by: currentUser?.uid || 'admin'
      }, { merge: true });
      
      toast.success('OpenAI configuration saved successfully!');
    } catch {
      toast.error('Failed to save OpenAI configuration');
    } finally {
      setSavingOpenai(false);
    }
  };

  // Sync Countries from RoamJet
  const syncCountries = async () => {
    // Confirm before syncing
    const confirmed = window.confirm(
      '⚠️ Sync Countries from RoamJet?\n\n' +
      'This will:\n' +
      '✅ Add new countries from RoamJet\n' +
      '✅ Update country names and codes\n' +
      '✅ PRESERVE your translations and images\n\n' +
      'Your custom translations and photos will NOT be deleted.\n\n' +
      'Continue?'
    );
    
    if (!confirmed) return;
    
    try {
      setCountriesLoading(true);
      setSyncStatus('Syncing countries from RoamJet API...');
      
      const response = await fetch('/api/sync-roamjet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ countries_only: true })
      });

      const result = await response.json();
      
      if (result.success) {
        const count = result.total_synced || 0;
        toast.success(`Successfully synced ${count} countries from RoamJet API`);
        setSyncStatus(`✅ Synced ${count} countries successfully (translations & images preserved)`);
      } else {
        throw new Error(result.error || 'Failed to sync countries');
      }
    } catch {
      toast.error('Failed to sync countries');
      setSyncStatus('Failed to sync countries');
    } finally {
      setCountriesLoading(false);
    }
  };

  // Sync Plans from RoamJet
  const syncPlans = async () => {
    // Confirm before syncing
    const confirmed = window.confirm(
      '⚠️ Sync eSIM Plans from RoamJet?\n\n' +
      'This will:\n' +
      '✅ Add new eSIM plans for ALL countries\n' +
      '✅ Update plan prices and details\n' +
      '✅ Apply your markup percentage\n\n' +
      'Note: This fetches plans for all countries that have them.\n\n' +
      'Continue?'
    );
    
    if (!confirmed) return;
    
    try {
      setPlansLoading(true);
      setSyncStatus('Syncing plans from RoamJet API...');
      
      const response = await fetch('/api/sync-roamjet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      const result = await response.json();
      
      if (result.success) {
        const count = result.total_synced || 0;
        toast.success(`Successfully synced ${count} plans from RoamJet API`);
        setSyncStatus(`✅ Synced ${count} plans successfully for all countries`);
      } else {
        throw new Error(result.error || 'Failed to sync plans');
      }
    } catch {
      toast.error('Failed to sync plans');
      setSyncStatus('Failed to sync plans');
    } finally {
      setPlansLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">API Configuration</h2>
        <p className="text-gray-600 mt-1">Manage your third-party API integrations</p>
      </div>

      {/* Row 1: RoamJet API & Coinbase Commerce */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RoamJet API Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">RoamJet API</h3>
              <p className="text-sm text-gray-600">eSIM provider integration</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showRoamjetKey ? "text" : "password"}
                  value={roamjetApiKey}
                  onChange={(e) => setRoamjetApiKey(e.target.value)}
                  placeholder="rjapi_jlhz2bt56hcgkkcm9qlicpvzm6rpwkk"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowRoamjetKey(!showRoamjetKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showRoamjetKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm font-mono"
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> RoamJet API works the same as Airalo API. Use the sandbox URL for testing and production URL for live orders.
              </p>
            </div>
            
            <button
              onClick={saveRoamjetCredentials}
              disabled={loading || !roamjetApiKey.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors text-sm"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save RoamJet Credentials
            </button>
          </div>
        </div>

        {/* Coinbase Commerce Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Coinbase Commerce</h3>
              <p className="text-sm text-gray-600">Cryptocurrency payment integration</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showCoinbaseKey ? "text" : "password"}
                  value={coinbaseApiKey}
                  onChange={(e) => setCoinbaseApiKey(e.target.value)}
                  placeholder="Your Coinbase Commerce API Key"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCoinbaseKey(!showCoinbaseKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCoinbaseKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook Secret
              </label>
              <div className="relative">
                <input
                  type={showCoinbaseSecret ? "text" : "password"}
                  value={coinbaseWebhookSecret}
                  onChange={(e) => setCoinbaseWebhookSecret(e.target.value)}
                  placeholder="Your Coinbase Commerce Webhook Secret"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCoinbaseSecret(!showCoinbaseSecret)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCoinbaseSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                <strong>Crypto Payments:</strong> Currently accepting BTC (Bitcoin) and USDC (USD Coin) via Coinbase Commerce.
              </p>
            </div>
            
            <button
              onClick={saveCoinbaseConfig}
              disabled={savingCoinbase || !coinbaseApiKey.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors text-sm"
            >
              {savingCoinbase ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Coinbase Configuration
            </button>
          </div>
        </div>
      </div>

      {/* Data Synchronization */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Data Synchronization</h3>
            <p className="text-sm text-gray-600">Sync countries and plans from RoamJet</p>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm">
            {syncStatus.includes('✅') ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : syncStatus.includes('❌') ? (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            ) : (
              <Zap className="w-5 h-5 text-gray-400" />
            )}
            <span className="text-gray-700">{syncStatus}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sync Countries */}
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Sync Countries</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Fetch all countries from RoamJet API and save to Firestore
            </p>
            <div className="border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-green-800">
                <strong>Safe:</strong> Preserves your translations & images
                <br />
                <strong>Note:</strong> This will fetch countries from RoamJet API and save to Firestore.
                
                
              </p>
            </div>
            <button
              onClick={syncCountries}
              disabled={countriesLoading || !roamjetApiKey.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm"
            >
              {countriesLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  Sync Countries
                </>
              )}
            </button>
          </div>

          {/* Sync Plans */}
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Sync Plans</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Fetch all eSIM plans from RoamJet API and save to Firestore
            </p>
            <div className="border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                Syncs plans for <strong>all countries</strong> with available plans
                <br />
                <strong>Note:</strong> This will fetch plans for all countries that have them.
                
              </p>
            </div>
            <button
              onClick={syncPlans}
              disabled={plansLoading || !roamjetApiKey.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors text-sm"
            >
              {plansLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  Sync Plans
                </>
              )}
            </button>
          </div>
        </div>

       
      </div>

      {/* OpenAI Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">OpenAI API</h3>
            <p className="text-sm text-gray-600">AI-powered blog content generation</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showOpenaiKey ? "text" : "password"}
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-800">
              <strong>AI Features:</strong> OpenAI will be used to generate blog post content, summaries, and SEO-optimized descriptions.
            </p>
          </div>
          
          <button
            onClick={saveOpenaiConfig}
            disabled={savingOpenai || !openaiApiKey.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors text-sm"
          >
            {savingOpenai ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save OpenAI Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiConfiguration;

