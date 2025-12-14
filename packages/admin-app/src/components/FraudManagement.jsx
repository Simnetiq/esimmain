'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { 
  ShieldX, 
  ShieldCheck, 
  Clock, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Mail,
  Globe,
  User,
  Calendar,
  Ban,
  Unlock,
  Eye,
  MessageSquare,
  RefreshCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

const FraudManagement = () => {
  // State
  const [activeTab, setActiveTab] = useState('blocked'); // blocked, payments, appeals, warnings
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedPayments, setBlockedPayments] = useState([]);
  const [pendingAppeals, setPendingAppeals] = useState([]);
  const [fraudWarnings, setFraudWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState({
    totalBlocked: 0,
    blockedPayments24h: 0,
    pendingAppeals: 0,
    unviewedWarnings: 0
  });
  const [syncing, setSyncing] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load blocked users from fraudSignals
      const blockedQuery = query(
        collection(db, 'fraudSignals'),
        where('blocked', '==', true),
        limit(100)
      );
      const blockedSnap = await getDocs(blockedQuery);
      const blocked = blockedSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        blockedAt: doc.data().blockedAt?.toDate?.() || null,
        blockExpiresAt: doc.data().blockExpiresAt?.toDate?.() || null,
        lastAttemptAt: doc.data().lastAttemptAt?.toDate?.() || null
      }));
      setBlockedUsers(blocked);

      // Load blocked payments
      const paymentsQuery = query(
        collection(db, 'fraud_blocked_payments'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const paymentsSnap = await getDocs(paymentsQuery);
      const payments = paymentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null
      }));
      setBlockedPayments(payments);

      // Load pending appeals
      const appealsQuery = query(
        collection(db, 'fraud_appeals'),
        where('status', '==', 'pending'),
        limit(50)
      );
      const appealsSnap = await getDocs(appealsQuery);
      const appeals = appealsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null
      }));
      setPendingAppeals(appeals);

      // Load fraud warnings
      const warningsQuery = query(
        collection(db, 'fraud_warnings'),
        where('reviewed', '==', false),
        limit(50)
      );
      const warningsSnap = await getDocs(warningsQuery);
      const warnings = warningsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null
      }));
      setFraudWarnings(warnings);

      // Calculate stats
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recentPayments = payments.filter(p => p.createdAt && p.createdAt > last24h);

      setStats({
        totalBlocked: blocked.length,
        blockedPayments24h: recentPayments.length,
        pendingAppeals: appeals.length,
        unviewedWarnings: warnings.length
      });

    } catch (error) {
      console.error('Error loading fraud data:', error);
      toast.error('Failed to load fraud data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unblock user
  const handleUnblockUser = async (user) => {
    if (!window.confirm(`Unblock user ${user.email || user.userId}?`)) return;

    try {
      const userRef = doc(db, 'fraudSignals', user.id);
      await updateDoc(userRef, {
        blocked: false,
        blockType: null,
        blockExpiresAt: null,
        unblockedAt: serverTimestamp(),
        unblockedBy: 'admin'
      });

      toast.success('User unblocked successfully');
      loadData();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to unblock user');
    }
  };

  // Block user permanently
  const handleBlockPermanent = async (user) => {
    if (!window.confirm(`Permanently block user ${user.email || user.userId}?`)) return;

    try {
      const userRef = doc(db, 'fraudSignals', user.id);
      await updateDoc(userRef, {
        blocked: true,
        blockType: 'permanent',
        blockExpiresAt: null,
        blockedAt: serverTimestamp(),
        blockReason: 'Permanently blocked by admin'
      });

      toast.success('User permanently blocked');
      loadData();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block user');
    }
  };

  // Resolve appeal
  const handleResolveAppeal = async (appeal, resolution) => {
    try {
      const appealRef = doc(db, 'fraud_appeals', appeal.id);
      await updateDoc(appealRef, {
        status: 'resolved',
        resolution,
        resolvedAt: serverTimestamp(),
        resolvedBy: 'admin'
      });

      // If approved, unblock the user
      if (resolution === 'approved') {
        const userQuery = query(
          collection(db, 'fraudSignals'),
          where('userId', '==', appeal.userId)
        );
        const userSnap = await getDocs(userQuery);
        
        if (!userSnap.empty) {
          await updateDoc(userSnap.docs[0].ref, {
            blocked: false,
            blockType: null,
            unblockedAt: serverTimestamp(),
            unblockedBy: 'admin_appeal'
          });
        }
      }

      toast.success(`Appeal ${resolution}`);
      loadData();
    } catch (error) {
      console.error('Error resolving appeal:', error);
      toast.error('Failed to resolve appeal');
    }
  };

  // Mark warning as reviewed
  const handleMarkWarningReviewed = async (warning, action) => {
    try {
      const warningRef = doc(db, 'fraud_warnings', warning.id);
      await updateDoc(warningRef, {
        reviewed: true,
        reviewedAt: serverTimestamp(),
        reviewedBy: 'admin',
        action
      });

      toast.success('Warning marked as reviewed');
      loadData();
    } catch (error) {
      console.error('Error updating warning:', error);
      toast.error('Failed to update warning');
    }
  };

  // Sync to Stripe Radar
  const handleSyncToRadar = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/sync-radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Synced ${data.synced} cards to Stripe Radar`);
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing to Radar:', error);
      toast.error('Failed to sync to Stripe Radar');
    } finally {
      setSyncing(false);
    }
  };

  // Filter data based on search
  const filteredBlockedUsers = blockedUsers.filter(user => 
    !searchTerm || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.userId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayments = blockedPayments.filter(payment =>
    !searchTerm ||
    payment.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.cardLast4?.includes(searchTerm) ||
    payment.userId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  // Get block status badge
  const getBlockBadge = (user) => {
    if (user.blockType === 'permanent') {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Permanent</span>;
    }
    if (user.blockType === 'temporary') {
      const isExpired = user.blockExpiresAt && new Date() > user.blockExpiresAt;
      if (isExpired) {
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">Expired</span>;
      }
      return <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Temporary</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">Unknown</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fraud Management</h2>
          <p className="text-gray-600 mt-1">Monitor and manage blocked users, payments, and appeals</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncToRadar}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {syncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCcw className="w-4 h-4" />
            )}
            Sync to Stripe Radar
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          className="bg-white rounded-lg p-5 cursor-pointer hover:shadow-lg transition-all"
          style={{ border: '2px solid #ef4444' }}
          onClick={() => setActiveTab('blocked')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <ShieldX className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBlocked}</p>
              <p className="text-sm font-medium text-gray-600">Blocked Users</p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-lg p-5 cursor-pointer hover:shadow-lg transition-all"
          style={{ border: '2px solid #f97316' }}
          onClick={() => setActiveTab('payments')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.blockedPayments24h}</p>
              <p className="text-sm font-medium text-gray-600">Blocked (24h)</p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-lg p-5 cursor-pointer hover:shadow-lg transition-all"
          style={{ border: '2px solid #3b82f6' }}
          onClick={() => setActiveTab('appeals')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingAppeals}</p>
              <p className="text-sm font-medium text-gray-600">Pending Appeals</p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-lg p-5 cursor-pointer hover:shadow-lg transition-all"
          style={{ border: '2px solid #eab308' }}
          onClick={() => setActiveTab('warnings')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.unviewedWarnings}</p>
              <p className="text-sm font-medium text-gray-600">Fraud Warnings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {[
            { id: 'blocked', label: 'Blocked Users', icon: ShieldX, count: stats.totalBlocked },
            { id: 'payments', label: 'Blocked Payments', icon: CreditCard, count: blockedPayments.length },
            { id: 'appeals', label: 'Appeals', icon: MessageSquare, count: stats.pendingAppeals },
            { id: 'warnings', label: 'Warnings', icon: AlertTriangle, count: stats.unviewedWarnings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{tab.label}</span>
                {tab.count > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by email, user ID, or card..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-600 mt-2">Loading fraud data...</p>
        </div>
      ) : (
        <>
          {/* Blocked Users Tab */}
          {activeTab === 'blocked' && (
            <div className="space-y-4">
              {filteredBlockedUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-green-400" />
                  <p>No blocked users found</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blocked At</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredBlockedUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{user.email || 'No email'}</p>
                              <p className="text-xs text-gray-500 font-mono">{user.userId || user.id}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {getBlockBadge(user)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-red-600">{user.attempts || 0}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDate(user.blockedAt)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {user.blockType === 'permanent' ? 'Never' : formatDate(user.blockExpiresAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUnblockUser(user)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Unblock"
                              >
                                <Unlock className="w-4 h-4" />
                              </button>
                              {user.blockType !== 'permanent' && (
                                <button
                                  onClick={() => handleBlockPermanent(user)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Block Permanently"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
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
          )}

          {/* Blocked Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              {filteredPayments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No blocked payments found</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Card</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{payment.email || 'No email'}</p>
                              <p className="text-xs text-gray-500 font-mono">{payment.userId || 'Guest'}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {payment.cardBrand || 'Card'} ****{payment.cardLast4 || '????'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{payment.blockReason || 'Unknown'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              payment.riskLevel === 'highest' ? 'bg-red-100 text-red-700' :
                              payment.riskLevel === 'high' ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {payment.riskLevel || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-gray-400" />
                              <span className={`text-sm ${payment.isHighRiskRegion ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                {payment.countryCode || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDate(payment.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Appeals Tab */}
          {activeTab === 'appeals' && (
            <div className="space-y-4">
              {pendingAppeals.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                  <p>No pending appeals</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingAppeals.map((appeal) => (
                    <div key={appeal.id} className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <User className="w-5 h-5 text-gray-400" />
                            <span className="font-medium text-gray-900">{appeal.email || appeal.userId}</span>
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">Pending</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                            <Mail className="w-4 h-4" />
                            <span>Contact: {appeal.contactEmail}</span>
                            <Calendar className="w-4 h-4 ml-4" />
                            <span>{formatDate(appeal.createdAt)}</span>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-700 font-medium mb-1">Reason:</p>
                            <p className="text-sm text-gray-600">{appeal.reason}</p>
                            {appeal.additionalInfo && (
                              <>
                                <p className="text-sm text-gray-700 font-medium mt-3 mb-1">Additional Info:</p>
                                <p className="text-sm text-gray-600">{appeal.additionalInfo}</p>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleResolveAppeal(appeal, 'approved')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleResolveAppeal(appeal, 'rejected')}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Warnings Tab */}
          {activeTab === 'warnings' && (
            <div className="space-y-4">
              {fraudWarnings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-green-400" />
                  <p>No unreviewed fraud warnings</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fraudWarnings.map((warning) => (
                    <div key={warning.id} className="bg-white rounded-lg border-2 border-yellow-200 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                            <span className="font-medium text-gray-900">Early Fraud Warning</span>
                            {warning.actionable && (
                              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">Actionable</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                            <div>
                              <span className="text-gray-500">Order ID:</span>
                              <span className="ml-2 font-mono text-gray-900">{warning.orderId || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Fraud Type:</span>
                              <span className="ml-2 text-gray-900">{warning.fraudType || 'Unknown'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">User:</span>
                              <span className="ml-2 text-gray-900">{warning.email || warning.userId || 'Unknown'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Card:</span>
                              <span className="ml-2 text-gray-900">{warning.cardBrand} ****{warning.cardLast4}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleMarkWarningReviewed(warning, 'refunded')}
                            className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            Refund
                          </button>
                          <button
                            onClick={() => handleMarkWarningReviewed(warning, 'ignored')}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Ignore
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">User ID</label>
                    <p className="font-mono text-sm text-gray-900">{selectedUser.userId || selectedUser.id}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <p className="text-gray-900">{selectedUser.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Block Type</label>
                    <p>{getBlockBadge(selectedUser)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Attempts</label>
                    <p className="text-red-600 font-semibold">{selectedUser.attempts || 0}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Blocked At</label>
                    <p className="text-gray-900">{formatDate(selectedUser.blockedAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Expires At</label>
                    <p className="text-gray-900">
                      {selectedUser.blockType === 'permanent' ? 'Never' : formatDate(selectedUser.blockExpiresAt)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500">Block Reason</label>
                  <p className="text-gray-900">{selectedUser.blockReason || 'N/A'}</p>
                </div>

                {selectedUser.cardFingerprints?.length > 0 && (
                  <div>
                    <label className="text-sm text-gray-500">Card Fingerprints</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedUser.cardFingerprints.map((fp, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                          {fp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedUser.ips?.length > 0 && (
                  <div>
                    <label className="text-sm text-gray-500">IP Addresses</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedUser.ips.map((ip, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                          {ip}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => {
                    handleUnblockUser(selectedUser);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Unblock User
                </button>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FraudManagement;
