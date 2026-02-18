'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import supabase from '../lib/supabase';
import { motion } from 'framer-motion';
import { 
  FileText, 
  AlertTriangle,
  CreditCard,
  Globe,
  Smartphone,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ApplicationLogs = () => {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to get user email by ID
  const getUserEmailById = async (userId) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('email, actual_email')
        .eq('id', userId)
        .single();
      if (data) {
        return data.actual_email || data.email || userId;
      }
      return userId;
    } catch {
      return userId;
    }
  };

  const loadLogs = useCallback(async (loadMore = false) => {
    try {
      setLoading(true);
      
      // Load from Supabase tables
      const [appLogsResult, blacklistResult, referralResult] = await Promise.all([
        supabase
          .from('application_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50),
        supabase
          .from('fraud_signals')
          .select('*')
          .eq('blocked', true)
          .limit(100),
        supabase
          .from('referral_usages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      const applicationLogs = (appLogsResult.data || []).map(row => ({
        ...row,
        timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
        source: 'application_logs'
      }));

      const blacklistLogs = await Promise.all(
        (blacklistResult.data || []).map(async (row) => {
          const timestamp = new Date(row.created_at || row.blocked_at || row.updated_at || new Date());
          let userEmail = row.user_email;
          if (!userEmail && row.user_id) {
            userEmail = await getUserEmailById(row.user_id);
          }
          return {
            ...row,
            timestamp,
            source: 'blacklist',
            type: 'blacklist',
            level: 'warning',
            message: row.description || `User blocked: ${row.reason || 'unknown reason'}`,
            details: null,
            userId: row.user_id,
            userEmail,
            metadata: {
              reason: row.reason,
              status: row.status,
              source: row.source,
              blockedAt: row.blocked_at,
            }
          };
        })
      );

      const referralUsageLogs = await Promise.all(
        (referralResult.data || []).map(async (row) => {
          const referrerEmail = await getUserEmailById(row.referrer_id);
          const referredUserEmail = await getUserEmailById(row.referred_user_id);
          return {
            ...row,
            timestamp: row.created_at ? new Date(row.created_at) : new Date(),
            source: 'referralUsages',
            type: 'promocode',
            level: 'success',
            message: `Referral code "${row.referral_code}" used by ${referrerEmail}`,
            details: null,
            userId: row.referred_user_id,
            userEmail: referredUserEmail,
            metadata: {
              referralCode: row.referral_code,
              referrerId: row.referrer_id,
              referrerEmail,
              referredUserId: row.referred_user_id,
              referredUserEmail,
              status: row.status
            }
          };
        })
      );

      // Combine and sort by timestamp
      const allLogs = [...applicationLogs, ...blacklistLogs, ...referralUsageLogs]
        .sort((a, b) => b.timestamp - a.timestamp);

      if (loadMore) {
        setLogs(prev => [...prev, ...allLogs]);
      } else {
        setLogs(allLogs);
      }

      // Set pagination
      setHasMore((appLogsResult.data || []).length === 50);
    } catch {
      toast.error('Failed to load application logs');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load logs on component mount
  useEffect(() => {
    if (currentUser) {
      loadLogs();
    }
  }, [currentUser, loadLogs]);

  // Filter logs based on search term
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      log.userEmail?.toLowerCase().includes(searchLower) ||
      log.userId?.toLowerCase().includes(searchLower) ||
      log.message?.toLowerCase().includes(searchLower) ||
      log.details?.toLowerCase().includes(searchLower) ||
      (log.metadata?.referrerEmail && log.metadata.referrerEmail.toLowerCase().includes(searchLower)) ||
      (log.metadata?.referredUserEmail && log.metadata.referredUserEmail.toLowerCase().includes(searchLower))
    );
  });

  const getLogIcon = (type) => {
    switch (type) {
      case 'system':
        return <CreditCard className="w-4 h-4 text-red-500" />;
      case 'promocode':
        return <Smartphone className="w-4 h-4 text-purple-500" />;
      case 'blacklist':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };


  const getLogLevelColor = (level) => {
    switch (level) {
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp);
  };


  return (
    <div className="space-y-8">
      {/* Header with CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Application Logs</h2>
          <p className="text-gray-600 mt-1">Monitor system activity and user actions • {filteredLogs.length} of {logs.length} logs</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by user email, user ID, or message..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Logs List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        
        <div className="divide-y divide-gray-200">
          {loading && logs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600 text-sm">Loading application logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try adjusting your search terms' : 'No activity recorded yet'}
              </p>
            </div>
          ) : (
                filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 border-l-4 ${getLogLevelColor(log.level)}`}
              >
                <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex items-center space-x-2">
                        {getLogIcon(log.type)}
                      </div>
                    
                    <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              log.type === 'blacklist' ? 'bg-orange-100 text-orange-800' :
                              log.type === 'promocode' ? 'bg-purple-100 text-purple-800' :
                              log.type === 'system' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {log.type?.toUpperCase() || 'SYSTEM'}
                            </span>
                          </div>
                      
                      <p className="text-gray-900 font-medium mb-1">
                        {log.message}
                      </p>
                      
                      {log.details && (
                        <p className="text-gray-600 text-sm mb-2">
                          {log.details}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <span>{formatTimestamp(log.timestamp)}</span>
                        </div>
                        
                        {log.userId && (
                          <div className="flex items-center space-x-1">
                            <span>User: {log.userEmail || log.userId}</span>
                          </div>
                        )}
                        
                        {log.ip && (
                          <div className="flex items-center space-x-1">
                            <Globe className="w-3 h-3" />
                            <span>IP: {log.ip}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Load More Button */}
        {hasMore && !loading && (
          <div className="p-4 text-center border-t border-gray-200">
            <button
              onClick={() => loadLogs(true)}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
            >
              Load More Logs
            </button>
          </div>
        )}

        {loading && logs.length > 0 && (
          <div className="p-4 text-center border-t border-gray-200">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationLogs;
