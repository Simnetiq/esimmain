'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  Trash2, 
  User
} from 'lucide-react';
import { 
  getBlacklistRecords, 
  searchBlacklistRecords,
  deleteBlacklistRecord
} from '@esim/shared/services/blacklistService';
import toast from 'react-hot-toast';

const BlacklistLogs = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const recordsData = await getBlacklistRecords();
      
      setRecords(recordsData.records);
    } catch {
      toast.error('Failed to load blacklist data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadData();
      return;
    }

    try {
      setLoading(true);
      const searchResults = await searchBlacklistRecords(searchTerm);
      setRecords(searchResults);
      setLastDoc(null);
      setHasMore(false);
    } catch {
      toast.error('Failed to search blacklist records');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recordId) => {
    if (!confirm('Are you sure you want to permanently delete this blacklist record?')) {
      return;
    }

    try {
      setActionLoading(true);
      await deleteBlacklistRecord(recordId);
      await loadData(); // Reload data
    } catch {
      toast.error('Failed to delete record');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const getReasonBadge = (reason) => {
    const reasonConfig = {
      account_blocked: { color: 'bg-red-100 text-red-800', label: 'Account Blocked' },
      payment_abuse: { color: 'bg-orange-100 text-orange-800', label: 'Payment Abuse' },
      policy_violation: { color: 'bg-purple-100 text-purple-800', label: 'Policy Violation' },
      old_version: { color: 'bg-blue-100 text-blue-800', label: 'Old Version' },
      manual_block: { color: 'bg-gray-100 text-gray-800', label: 'Manual Block' }
    };

    const config = reasonConfig[reason] || { color: 'bg-gray-100 text-gray-800', label: reason };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
        </div>
      </div>


      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by user ID, email, reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Blocked At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {record.userId}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.userEmail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getReasonBadge(record.reason)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(record.blockedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDelete(record.id)}
                      disabled={actionLoading}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {records.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No blacklist records</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No records match your search criteria.' : 'No users have been blacklisted yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlacklistLogs;
