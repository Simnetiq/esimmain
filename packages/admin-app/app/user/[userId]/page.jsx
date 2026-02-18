'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdmin } from '@esim/shared/contexts/AdminContext';
import supabase from '../../../src/lib/supabase';
import { getAllReferralCodes, createReferralCode } from '@esim/shared/services/referralService';
import { 
  ArrowLeft, 
  User, 
  Gift, 
  DollarSign, 
  Activity, 
  TrendingUp,
  Trash2,
  Plus,
  Copy,
  Smartphone,
  Edit,
  X,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice } from '@esim/shared/utils/priceUtils';

const UserDetailsPage = () => {
  const { userId } = useParams();
  const router = useRouter();
  const { isAdmin, canManageAdmins } = useAdmin();
  
  const [user, setUser] = useState(null);
  const [referralCodes, setReferralCodes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showReferralCodeModal, setShowReferralCodeModal] = useState(false);
  const [customReferralName, setCustomReferralName] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedEmail, setEditedEmail] = useState('');
  const [esimOrders, setEsimOrders] = useState([]);
  const [loadingEsims, setLoadingEsims] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEsim, setSelectedEsim] = useState(null);
  
  useEffect(() => {
    if (!isAdmin && !canManageAdmins) {
      router.push('/');
    }
  }, [isAdmin, canManageAdmins, router]);

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        toast.error('User not found');
        router.push('/');
        return;
      }

      const userObj = {
        ...userData,
        createdAt: userData.created_at ? new Date(userData.created_at) : null
      };
      setUser(userObj);
      setEditedEmail(userData.email || '');

      // Load referral codes
      const codesResult = await getAllReferralCodes();
      if (codesResult.success) {
        const userCodes = codesResult.referralCodes.filter(code => code.ownerId === userId);
        setReferralCodes(userCodes);
      }

      // Load transactions (user_transactions or a transactions table)
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setTransactions((transactionsData || []).map(t => ({
        ...t,
        id: t.id,
        createdAt: t.created_at ? new Date(t.created_at) : null
      })));

      // Load eSIMs from esims table
      let esimsData = [];
      try {
        const { data: userEsims } = await supabase
          .from('esims')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        esimsData = (userEsims || []).map(e => ({
          ...e,
          id: e.id,
          createdAt: e.created_at ? new Date(e.created_at) : null,
          activationDate: e.activation_date ? new Date(e.activation_date) : null,
          expiryDate: e.expiry_date ? new Date(e.expiry_date) : null
        }));
      } catch (e) {
        console.log('No esims or error:', e);
      }

      // Also fetch from orders by email
      if (userData.email) {
        try {
          const { data: globalOrders } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_email', userData.email);

          const mappedOrders = (globalOrders || []).map(o => ({
            ...o,
            id: o.id,
            createdAt: o.created_at ? new Date(o.created_at) : null,
            activationDate: o.activation_date ? new Date(o.activation_date) : null,
            expiryDate: o.expiry_date ? new Date(o.expiry_date) : null
          }));
          
          const existingIds = new Set(esimsData.map(e => e.id));
          const newOrders = mappedOrders.filter(o => !existingIds.has(o.id));
          esimsData = [...esimsData, ...newOrders];
          esimsData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        } catch (e) {
          console.log('Error fetching global orders:', e);
        }
      }
      
      setEsimOrders(esimsData);

    } catch {
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  const loadEsimOrders = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      setLoadingEsims(true);
      
      let esimsData = [];
      try {
        const { data: userEsims } = await supabase
          .from('esims')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        esimsData = (userEsims || []).map(e => ({
          ...e,
          id: e.id,
          createdAt: e.created_at ? new Date(e.created_at) : null,
          activationDate: e.activation_date ? new Date(e.activation_date) : null,
          expiryDate: e.expiry_date ? new Date(e.expiry_date) : null
        }));
      } catch (e) {
        console.log('No esims or error:', e);
      }

      try {
        const { data: globalOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_email', user.email);

        const mappedOrders = (globalOrders || []).map(o => ({
          ...o,
          id: o.id,
          createdAt: o.created_at ? new Date(o.created_at) : null,
          activationDate: o.activation_date ? new Date(o.activation_date) : null,
          expiryDate: o.expiry_date ? new Date(o.expiry_date) : null
        }));
        
        const existingIds = new Set(esimsData.map(e => e.id));
        const newOrders = mappedOrders.filter(o => !existingIds.has(o.id));
        esimsData = [...esimsData, ...newOrders];
        esimsData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      } catch (e) {
        console.log('Error fetching global orders:', e);
      }
      
      setEsimOrders(esimsData);
    } catch {
      toast.error('Failed to load eSIMs');
    } finally {
      setLoadingEsims(false);
    }
  }, [userId, user?.email]);

  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId, loadUserData]);

  const handleUpdateEmail = async () => {
    if (!editedEmail || editedEmail === user.email) {
      setIsEditingEmail(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ email: editedEmail, actual_email: editedEmail })
        .eq('id', userId);

      if (error) throw error;
      
      setUser({ ...user, email: editedEmail });
      setIsEditingEmail(false);
      toast.success('Email updated successfully');
    } catch {
      toast.error('Failed to update email');
    }
  };

  const handleGenerateReferralCode = async () => {
    try {
      const result = await createReferralCode(userId, user.email, customReferralName);
      if (result.success) {
        toast.success(`Generated referral code: ${result.referralCode}`);
        setShowReferralCodeModal(false);
        setCustomReferralName('');
        await loadUserData();
      } else {
        toast.error(result.error || 'Failed to generate referral code');
      }
    } catch {
      toast.error('Failed to generate referral code');
    }
  };

  const handleDeleteEsim = async () => {
    if (!selectedEsim) return;

    let deletedFromEsims = false;
    let deletedFromOrders = false;

    try {
      const { error } = await supabase.from('esims').delete().eq('id', selectedEsim.id);
      if (!error) deletedFromEsims = true;
    } catch (e) {
      console.log('Not in esims or error:', e);
    }
    
    try {
      const { error } = await supabase.from('orders').delete().eq('id', selectedEsim.id);
      if (!error) deletedFromOrders = true;
    } catch (e) {
      console.log('Not in orders or error:', e);
    }
    
    if (deletedFromEsims || deletedFromOrders) {
      toast.success('eSIM deleted successfully');
      setShowDeleteModal(false);
      setSelectedEsim(null);
      await loadEsimOrders();
    } else {
      toast.error('Failed to delete eSIM');
      setShowDeleteModal(false);
      setSelectedEsim(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">User not found</h2>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800"
          >
            Return to Admin
          </button>
        </div>
      </div>
    );
  }

  const totalSpent = esimOrders
    .reduce((sum, esim) => sum + (esim.amount || esim.price || 0), 0);
  
  const totalWithdrawals = transactions
    .filter(t => t.type === 'withdrawal' || t.method === 'withdrawal')
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
  
  const referralEarnings = transactions
    .filter(t => t.method === 'referral')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Admin</span>
              </button>
            </div>
            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
              user.role === 'admin' || user.role === 'super_admin'
                ? 'bg-red-100 text-red-800'
                : user.role === 'moderator'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {user.role || 'user'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
        {/* User Profile Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-3xl font-medium text-gray-700">
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {isEditingEmail ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={editedEmail}
                      onChange={(e) => setEditedEmail(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                    <button
                      onClick={handleUpdateEmail}
                      className="p-1 text-green-600 hover:text-green-700"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingEmail(false);
                        setEditedEmail(user.email);
                      }}
                      className="p-1 text-red-600 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-900">{user.email}</h2>
                    <button
                      onClick={() => setIsEditingEmail(true)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-600">User ID: {user.id}</p>
              <p className="text-sm text-gray-500">
                Joined: {user.createdAt ? user.createdAt.toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{formatPrice(totalSpent)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">eSIM Orders</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{esimOrders.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Referral Earnings</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{formatPrice(referralEarnings)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Gift className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Withdrawals</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{formatPrice(totalWithdrawals)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'esims', label: 'eSIMs', icon: Smartphone },
              { id: 'referrals', label: 'Referrals', icon: Gift },
              { id: 'transactions', label: 'Transactions', icon: Activity }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-gray-900 text-gray-900 font-medium'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">User Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-sm font-medium text-gray-900">{user.email || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">User ID</p>
                    <p className="text-sm font-medium text-gray-900 font-mono">{user.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Role</p>
                    <p className="text-sm font-medium text-gray-900">{user.role || 'user'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Joined Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {user.createdAt ? user.createdAt.toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'esims' && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {loadingEsims ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : esimOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No eSIMs Found</h3>
                  <p className="text-gray-500">This user hasn&apos;t purchased any eSIMs yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {esimOrders.map((esim) => (
                        <tr key={esim.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {esim.packageName || esim.planName || esim.package_name || esim.plan_name || 'Unknown Plan'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {esim.dataAmount || esim.data_amount} • {esim.validity}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              esim.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : esim.status === 'deactivated'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {esim.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPrice(esim.amount || esim.price || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {esim.createdAt ? esim.createdAt.toLocaleDateString() : 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                setSelectedEsim(esim);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'referrals' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Referral Codes</h3>
                <button
                  onClick={() => setShowReferralCodeModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Generate Code
                </button>
              </div>

              {referralCodes.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                  <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Referral Codes</h3>
                  <p className="text-gray-500">Generate a referral code for this user.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {referralCodes.map((code) => (
                    <div key={code.id} className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-gray-900 font-mono">{code.code}</h4>
                        <button
                          onClick={() => copyToClipboard(code.code)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Usage Count:</span>
                          <span className="font-medium text-gray-900">{code.usageCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created:</span>
                          <span className="font-medium text-gray-900">
                            {code.createdAt ? new Date(code.createdAt).toLocaleDateString() : 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions</h3>
                  <p className="text-gray-500">This user hasn&apos;t made any transactions yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {transaction.type || transaction.method || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatPrice(Math.abs(transaction.amount || 0))}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.method || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.createdAt ? transaction.createdAt.toLocaleDateString() : 'Unknown'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Generate Referral Code Modal */}
      {showReferralCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Generate Referral Code</h3>
              <button
                onClick={() => {
                  setShowReferralCodeModal(false);
                  setCustomReferralName('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Name (Optional)
                </label>
                <input
                  type="text"
                  value={customReferralName}
                  onChange={(e) => setCustomReferralName(e.target.value)}
                  placeholder="e.g., SUMMER2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to generate a random code
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleGenerateReferralCode}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Generate
                </button>
                <button
                  onClick={() => {
                    setShowReferralCodeModal(false);
                    setCustomReferralName('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete eSIM Modal */}
      {showDeleteModal && selectedEsim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete eSIM</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedEsim(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete this eSIM?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                <strong>{selectedEsim.packageName || selectedEsim.planName || selectedEsim.package_name || selectedEsim.plan_name}</strong>
              </p>
              <p className="text-sm text-red-600 mt-2 font-medium">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteEsim}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete eSIM
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedEsim(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetailsPage;
