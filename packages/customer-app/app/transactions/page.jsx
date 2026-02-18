'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, DollarSign, Calendar, Download, CreditCard } from 'lucide-react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { getSupabase } from '@esim/shared/lib/supabase';
import { formatPrice } from '@esim/shared/utils/priceUtils';

const TransactionsPage = () => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('earnings'); // earnings, withdrawals
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const loadTransactions = useCallback(async (loadMore = false) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      const supabase = getSupabase();
      let query = supabase
        .from('user_transactions')
        .select('*')
        .eq('user_id', currentUser.uid)
        .order('created_at', { ascending: false })
        .limit(20);

      if (filter === 'earnings') {
        query = query.eq('type', 'deposit');
      } else if (filter === 'withdrawals') {
        query = query.eq('type', 'purchase').eq('method', 'withdrawal');
      }

      if (loadMore && lastDoc) {
        query = query.lt('created_at', lastDoc);
      }

      const { data: newTransactions } = await query;
      const txs = (newTransactions || []).map(t => ({ ...t, createdAt: t.created_at, timestamp: t.created_at }));

      if (loadMore) {
        setTransactions(prev => [...prev, ...txs]);
      } else {
        setTransactions(txs);
      }

      setLastDoc(txs.length > 0 ? txs[txs.length - 1].created_at : null);
      setHasMore(txs.length === 20);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [currentUser, filter, lastDoc]);

  useEffect(() => {
    if (currentUser) {
      loadTransactions();
    }
  }, [currentUser, loadTransactions]);

  useEffect(() => {
    if (currentUser) {
      setLastDoc(null);
      setHasMore(true);
      loadTransactions();
    }
  }, [filter, currentUser, loadTransactions]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount, type) => {
    const prefix = type === 'deposit' ? '+' : '-';
    return `${prefix}${formatPrice(Math.abs(amount))}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = () => {
    return <DollarSign className="w-4 h-4" />;
  };

  const exportTransactions = () => {
    const csvContent = [
      ['Date', 'Type', 'Amount', 'Status', 'Description'],
      ...transactions.map(tx => [
        formatDate(tx.createdAt),
        tx.type,
        formatAmount(tx.amount, tx.type),
        tx.status,
        tx.description || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
                <p className="text-sm text-gray-600">View your affiliate earnings and withdrawals</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={exportTransactions}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button
                onClick={() => router.push('/add-bank-account')}
                className="flex items-center space-x-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                <span>Edit Payment Method</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'earnings', label: 'Earnings' },
              { key: 'withdrawals', label: 'Withdrawals' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transactions Yet</h3>
              <p className="text-gray-600">
                {filter === 'earnings' 
                  ? "You don't have any earnings yet. Start referring friends to earn!"
                  : "No withdrawals found."
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {transactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-full ${
                        transaction.type === 'earning' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {getTypeIcon(transaction.type)}
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {transaction.type === 'deposit' ? 'Referral Earnings' : 'Withdrawal Request'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {transaction.description || 'No description available'}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(transaction.createdAt)}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        transaction.type === 'deposit' ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {formatAmount(transaction.amount, transaction.type)}
                      </p>
                      {transaction.type === 'purchase' && transaction.method === 'withdrawal' && transaction.bankAccount && (
                        <p className="text-sm text-gray-500">
                          ****{transaction.bankAccount.accountNumber.slice(-4)}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && transactions.length > 0 && (
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => loadTransactions(true)}
                disabled={loading}
                className="w-full py-3 px-4 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More Transactions'}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TransactionsPage;
