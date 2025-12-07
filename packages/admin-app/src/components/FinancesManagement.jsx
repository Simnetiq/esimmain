'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { 
  getAllPromoCodes, 
  createPromoCode, 
  updatePromoCode, 
  deletePromoCode,
  togglePromoCode 
} from '@esim/shared/services/promoCodeService';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import {
  DollarSign,
  ShoppingCart,
  Tag,
  Plus,
  Edit2,
  Trash2,
  X,
  Calendar,
  Percent,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  MapPin,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const FinancesManagement = () => {
  const { currentUser } = useAuth();
  
  // Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    ordersByCountry: []
  });
  
  // Promo Codes State
  const [promoCodes, setPromoCodes] = useState([]);
  const [promoLoading, setPromoLoading] = useState(true);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [promoForm, setPromoForm] = useState({
    code: '',
    name: '',
    discountPercentage: '',
    countries: [],
    validFrom: '',
    validUntil: '',
    enabled: true
  });
  
  // Countries for selector
  const [countries, setCountries] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [countrySearch, setCountrySearch] = useState('');
  
  // Load data on mount
  useEffect(() => {
    loadOrders();
    loadPromoCodes();
    loadCountries();
  }, []);
  
  // Load orders and calculate stats
  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      
      setOrders(ordersData);
      
      // Calculate stats by country
      const countryMap = {};
      let totalRevenue = 0;
      
      ordersData.forEach(order => {
        if (order.status === 'completed' || order.paymentStatus === 'paid') {
          const amount = parseFloat(order.amount) || 0;
          totalRevenue += amount;
          
          // Extract country from order metadata or planName
          const country = order.country || order.metadata?.country || 'Unknown';
          if (!countryMap[country]) {
            countryMap[country] = { count: 0, revenue: 0 };
          }
          countryMap[country].count++;
          countryMap[country].revenue += amount;
        }
      });
      
      const ordersByCountry = Object.entries(countryMap)
        .map(([country, data]) => ({ country, ...data }))
        .sort((a, b) => b.revenue - a.revenue);
      
      setOrderStats({
        totalOrders: ordersData.length,
        totalRevenue,
        ordersByCountry
      });
      
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  };
  
  // Load promo codes
  const loadPromoCodes = async () => {
    try {
      setPromoLoading(true);
      const codes = await getAllPromoCodes();
      setPromoCodes(codes);
    } catch (error) {
      console.error('Error loading promo codes:', error);
      toast.error('Failed to load promo codes');
    } finally {
      setPromoLoading(false);
    }
  };
  
  // Load countries for selector
  const loadCountries = async () => {
    try {
      const countriesRef = collection(db, 'countries');
      const snapshot = await getDocs(countriesRef);
      const countriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        code: doc.data().code,
        name: doc.data().name
      })).sort((a, b) => a.name.localeCompare(b.name));
      setCountries(countriesData);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };
  
  // Handle promo form submit
  const handlePromoSubmit = async (e) => {
    e.preventDefault();
    
    if (!promoForm.code.trim()) {
      toast.error('Please enter a promo code');
      return;
    }
    
    if (!promoForm.discountPercentage || parseFloat(promoForm.discountPercentage) <= 0) {
      toast.error('Please enter a valid discount percentage');
      return;
    }
    
    try {
      const promoData = {
        ...promoForm,
        countries: selectedCountries.map(c => c.code),
        createdBy: currentUser?.uid
      };
      
      if (editingPromo) {
        const result = await updatePromoCode(editingPromo.id, promoData);
        if (result.success) {
          toast.success('Promo code updated successfully');
        } else {
          throw new Error(result.error);
        }
      } else {
        const result = await createPromoCode(promoData);
        if (result.success) {
          toast.success('Promo code created successfully');
        } else {
          throw new Error(result.error);
        }
      }
      
      resetPromoForm();
      loadPromoCodes();
    } catch (error) {
      toast.error(error.message || 'Failed to save promo code');
    }
  };
  
  // Handle promo delete
  const handleDeletePromo = async (promoId) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    
    try {
      const result = await deletePromoCode(promoId);
      if (result.success) {
        toast.success('Promo code deleted');
        loadPromoCodes();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error('Failed to delete promo code');
    }
  };
  
  // Handle promo toggle
  const handleTogglePromo = async (promo) => {
    try {
      const result = await togglePromoCode(promo.id, !promo.enabled);
      if (result.success) {
        toast.success(`Promo code ${promo.enabled ? 'disabled' : 'enabled'}`);
        loadPromoCodes();
      }
    } catch (error) {
      toast.error('Failed to toggle promo code');
    }
  };
  
  // Edit promo code
  const handleEditPromo = (promo) => {
    setEditingPromo(promo);
    setPromoForm({
      code: promo.code,
      name: promo.name || '',
      discountPercentage: promo.discountPercentage?.toString() || '',
      countries: promo.countries || [],
      validFrom: promo.validFrom ? promo.validFrom.toISOString().split('T')[0] : '',
      validUntil: promo.validUntil ? promo.validUntil.toISOString().split('T')[0] : '',
      enabled: promo.enabled
    });
    setSelectedCountries(
      countries.filter(c => promo.countries?.includes(c.code))
    );
    setShowPromoModal(true);
  };
  
  // Reset promo form
  const resetPromoForm = () => {
    setShowPromoModal(false);
    setEditingPromo(null);
    setPromoForm({
      code: '',
      name: '',
      discountPercentage: '',
      countries: [],
      validFrom: '',
      validUntil: '',
      enabled: true
    });
    setSelectedCountries([]);
    setCountrySearch('');
  };
  
  // Add country to selection
  const addCountry = (country) => {
    if (!selectedCountries.find(c => c.code === country.code)) {
      setSelectedCountries([...selectedCountries, country]);
    }
    setCountrySearch('');
  };
  
  // Remove country from selection
  const removeCountry = (countryCode) => {
    setSelectedCountries(selectedCountries.filter(c => c.code !== countryCode));
  };
  
  // Filter countries for search
  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) &&
    !selectedCountries.find(sc => sc.code === c.code)
  );
  
  // Check if promo is currently active
  const isPromoActive = (promo) => {
    if (!promo.enabled) return false;
    const now = new Date();
    const validFrom = promo.validFrom || new Date(0);
    const validUntil = promo.validUntil || new Date('2099-12-31');
    return now >= validFrom && now <= validUntil;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Finances</h2>
        <p className="text-gray-600 mt-1">Manage orders and promotional codes</p>
      </div>
      
      {/* Order Statistics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Order Statistics</h3>
              <p className="text-sm text-gray-600">Revenue by country</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://dashboard.stripe.com/acct_1SUc3SBebobjw5G7/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg transition-colors text-sm font-medium"
            >
              <span>Stripe</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href="https://app.partners.airalo.com/home"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors text-sm font-medium"
            >
              <span>Airalo</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={loadOrders}
              disabled={ordersLoading}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {ordersLoading ? '...' : orderStats.totalOrders}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {ordersLoading ? '...' : formatPrice(orderStats.totalRevenue)}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Orders by Country Table */}
        {ordersLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : orderStats.ordersByCountry.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No completed orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orderStats.ordersByCountry.slice(0, 10).map((item, index) => (
                  <tr key={item.country} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{item.country}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {item.count}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatPrice(item.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Promo Codes Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Promo Codes</h3>
              <p className="text-sm text-gray-600">Manage promotional discounts</p>
            </div>
          </div>
          <button
            onClick={() => setShowPromoModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Promo Code
          </button>
        </div>
        
        {/* Promo Codes List */}
        {promoLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : promoCodes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No promo codes yet</p>
            <p className="text-sm mt-1">Create your first promo code to offer discounts</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Countries</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Period</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uses</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {promoCodes.map((promo) => (
                  <tr key={promo.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <span className="text-sm font-mono font-bold text-gray-900">{promo.code}</span>
                        {promo.name && promo.name !== promo.code && (
                          <p className="text-xs text-gray-500">{promo.name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        <Percent className="w-3 h-3" />
                        {promo.discountPercentage}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {promo.countries && promo.countries.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {promo.countries.slice(0, 3).map(code => (
                            <span key={code} className="inline-flex px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              {code}
                            </span>
                          ))}
                          {promo.countries.length > 3 && (
                            <span className="text-xs text-gray-500">+{promo.countries.length - 3} more</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">All countries</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {promo.validFrom || promo.validUntil ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {promo.validFrom ? promo.validFrom.toLocaleDateString() : 'Start'} - {' '}
                            {promo.validUntil ? promo.validUntil.toLocaleDateString() : 'No end'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">No date limit</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        isPromoActive(promo)
                          ? 'bg-green-100 text-green-700'
                          : promo.enabled
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isPromoActive(promo) ? 'Active' : promo.enabled ? 'Scheduled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {promo.usageCount || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePromo(promo)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title={promo.enabled ? 'Disable' : 'Enable'}
                        >
                          {promo.enabled ? (
                            <ToggleRight className="w-5 h-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditPromo(promo)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePromo(promo.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Add/Edit Promo Modal */}
      {showPromoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPromo ? 'Edit Promo Code' : 'Create Promo Code'}
              </h3>
              <button
                onClick={resetPromoForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handlePromoSubmit} className="space-y-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Promo Code *
                </label>
                <input
                  type="text"
                  value={promoForm.code}
                  onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., LATINDECEMBER"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 font-mono uppercase"
                  required
                />
              </div>
              
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name (optional)
                </label>
                <input
                  type="text"
                  value={promoForm.name}
                  onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                  placeholder="e.g., Latin America December Sale"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              
              {/* Discount Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Percentage *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={promoForm.discountPercentage}
                    onChange={(e) => setPromoForm({ ...promoForm, discountPercentage: e.target.value })}
                    placeholder="e.g., 25"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    required
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                </div>
              </div>
              
              {/* Countries */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Countries (leave empty for all)
                </label>
                
                {/* Selected Countries */}
                {selectedCountries.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedCountries.map(country => (
                      <span 
                        key={country.code}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {country.name} ({country.code})
                        <button
                          type="button"
                          onClick={() => removeCountry(country.code)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Country Search */}
                <div className="relative">
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search countries..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  
                  {/* Country Dropdown */}
                  {countrySearch && filteredCountries.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredCountries.slice(0, 10).map(country => (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => addCountry(country)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm"
                        >
                          {country.name} ({country.code})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Valid Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid From
                  </label>
                  <input
                    type="date"
                    value={promoForm.validFrom}
                    onChange={(e) => setPromoForm({ ...promoForm, validFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={promoForm.validUntil}
                    onChange={(e) => setPromoForm({ ...promoForm, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>
              
              {/* Enabled */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="promo-enabled"
                  checked={promoForm.enabled}
                  onChange={(e) => setPromoForm({ ...promoForm, enabled: e.target.checked })}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                <label htmlFor="promo-enabled" className="text-sm text-gray-700">
                  Enable this promo code immediately
                </label>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {editingPromo ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={resetPromoForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancesManagement;

