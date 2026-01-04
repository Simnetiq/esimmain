'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Smartphone,
  Edit3,
  Trash2,
  Search,
  DollarSign,
  Calendar,
  Database,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { formatPrice, formatPriceNumber } from '@esim/shared/utils/priceUtils';
import {
  fetchCountryPlansWithRegional,
  updatePlanPrice as updatePlanPriceService,
  deletePlan as deletePlanService
} from '../services/planService';

const TariffManagement = ({ 
  countryCode, 
  countryName, 
  onBack,
  onSyncPrices 
}) => {
  const { currentUser } = useAuth();
  
  // State Management
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Price editing state
  const [editingPrices, setEditingPrices] = useState({});
  const [pendingPriceChanges, setPendingPriceChanges] = useState({});

  // Load all plans for this country from Supabase
  const loadCountryPlans = useCallback(async () => {
    try {
      setLoading(true);

      const plansData = await fetchCountryPlansWithRegional(countryCode);
      setPlans(plansData);

    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [countryCode]);

  // Load plans for this country
  useEffect(() => {
    if (countryCode) {
      loadCountryPlans();
    }
  }, [countryCode, loadCountryPlans]);

  // Filter plans based on search term
  useEffect(() => {
    let filtered = [...plans];

    if (searchTerm.trim()) {
      filtered = filtered.filter(plan => 
        plan.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.operator?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.slug?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPlans(filtered);
  }, [plans, searchTerm]);

  // Update plan price in Supabase
  const updatePlanPrice = async (planId, newPrice) => {
    try {
      setLoading(true);
      await updatePlanPriceService(planId, newPrice, currentUser?.uid);

      toast.success(`Price updated to ${formatPrice(newPrice)}!`);
      await loadCountryPlans();
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Failed to update price');
    } finally {
      setLoading(false);
    }
  };

  // Price editing handlers
  const handlePriceChange = (planId, newPrice) => {
    setPendingPriceChanges(prev => ({
      ...prev,
      [planId]: parseFloat(newPrice) || 0
    }));
  };

  const savePriceChange = async (planId) => {
    const newPrice = pendingPriceChanges[planId];
    if (newPrice !== undefined) {
      await updatePlanPrice(planId, newPrice);
      setEditingPrices(prev => ({ ...prev, [planId]: false }));
      setPendingPriceChanges(prev => ({ ...prev, [planId]: undefined }));
    }
  };

  const cancelPriceChange = (planId) => {
    setEditingPrices(prev => ({ ...prev, [planId]: false }));
    setPendingPriceChanges(prev => ({ ...prev, [planId]: undefined }));
  };

  const startEditingPrice = (planId) => {
    setEditingPrices(prev => ({ ...prev, [planId]: true }));
  };

  // Delete plan from Supabase
  const deletePlan = async (planId, planName) => {
    if (!window.confirm(`Are you sure you want to delete "${planName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await deletePlanService(planId);
      toast.success(`Plan "${planName}" deleted successfully!`);
      await loadCountryPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {countryName} ({countryCode}) - Tariffs
              </h2>
              <p className="text-gray-600 mt-1">
                Manage pricing and plans for this country
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => onSyncPrices(countryCode)}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Sync from Airalo
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search plans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data & Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPlans.length > 0 ? (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Smartphone className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {plan.name || plan.title || 'Unnamed Plan'}
                          </div>
                          {(plan.operator || plan.brand) && (
                            <div className="text-sm text-gray-500">
                              {plan.operator || plan.brand}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 font-mono">
                            {plan.slug || plan.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center gap-1 mb-1">
                          <Database className="w-3 h-3 text-gray-400" />
                          {plan.data === 'Unlimited' || plan.data === -1 || plan.capacity === -1 ? 
                            'Unlimited' : 
                            `${plan.data || plan.capacity || 0} ${plan.data_unit || 'GB'}`
                          }
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {plan.validity || plan.period || 0} {plan.validity_unit || 'days'}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {editingPrices[plan.id] ? (
                          <input
                            type="number"
                            value={pendingPriceChanges[plan.id] !== undefined ? pendingPriceChanges[plan.id] : (plan.price || 0)}
                            onChange={(e) => handlePriceChange(plan.id, e.target.value)}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            step="0.01"
                            min="0"
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => startEditingPrice(plan.id)}
                            className="flex items-center gap-1 px-2 py-1 text-sm text-gray-900 cursor-pointer hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <DollarSign className="w-3 h-3" />
                            {formatPriceNumber(plan.price || 0)}
                          </div>
                        )}
                        {editingPrices[plan.id] && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => savePriceChange(plan.id)}
                              disabled={loading}
                              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => cancelPriceChange(plan.id)}
                              disabled={loading}
                              className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        plan.source === 'airalo' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {plan.source || 'Manual'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditingPrice(plan.id)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit price"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => deletePlan(plan.id, plan.name || plan.title || 'Unnamed Plan')}
                          disabled={loading}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <Smartphone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No plans found</p>
                      <p className="text-sm">
                        {searchTerm ? 'Try adjusting your search terms' : 'No plans available for this country'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TariffManagement;
