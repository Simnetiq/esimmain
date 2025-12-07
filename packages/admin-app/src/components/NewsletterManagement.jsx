'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { getNewsletterSubscriptions, updateNewsletterSubscriptionStatus, deleteNewsletterSubscription, getNewsletterStats } from '@esim/shared/services/newsletterService';
import {
  Search,
  Mail
} from 'lucide-react';
import toast from 'react-hot-toast';

const NewsletterManagement = () => {
  const { currentUser } = useAuth();

  // State Management
  const [newsletterSubscriptions, setNewsletterSubscriptions] = useState([]);
  const [filteredNewsletterSubscriptions, setFilteredNewsletterSubscriptions] = useState([]);
  const [newsletterSearchTerm, setNewsletterSearchTerm] = useState('');
  const [newsletterStatusFilter, setNewsletterStatusFilter] = useState('all');
  const [newsletterStats, setNewsletterStats] = useState({ total: 0, active: 0, unsubscribed: 0, bounced: 0 });
  const [loading, setLoading] = useState(false);

  // Newsletter Management Functions
  const loadNewsletterSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const subscriptions = await getNewsletterSubscriptions();
      const stats = await getNewsletterStats();
      setNewsletterSubscriptions(subscriptions);
      setFilteredNewsletterSubscriptions(subscriptions);
      setNewsletterStats(stats);
    } catch {
      toast.error('Failed to load newsletter subscriptions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    if (currentUser) {
      loadNewsletterSubscriptions();
    }
  }, [currentUser, loadNewsletterSubscriptions]);

  // Filter newsletter subscriptions based on search and status
  useEffect(() => {
    let filtered = newsletterSubscriptions.filter(subscription => 
      subscription.email?.toLowerCase().includes(newsletterSearchTerm.toLowerCase()) ||
      subscription.source?.toLowerCase().includes(newsletterSearchTerm.toLowerCase())
    );
    
    if (newsletterStatusFilter !== 'all') {
      filtered = filtered.filter(subscription => subscription.status === newsletterStatusFilter);
    }
    
    setFilteredNewsletterSubscriptions(filtered);
  }, [newsletterSubscriptions, newsletterSearchTerm, newsletterStatusFilter]);

  const handleUpdateNewsletterStatus = async (subscriptionId, newStatus) => {
    try {
      setLoading(true);
      await updateNewsletterSubscriptionStatus(subscriptionId, newStatus);
      toast.success(`Subscription status updated to ${newStatus}`);
      await loadNewsletterSubscriptions();
    } catch {
      toast.error('Failed to update newsletter status');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNewsletterSubscription = async (subscriptionId, subscriberEmail) => {
    if (!window.confirm(`Delete newsletter subscription for ${subscriberEmail}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteNewsletterSubscription(subscriptionId);
      toast.success('Newsletter subscription deleted successfully');
      await loadNewsletterSubscriptions();
    } catch (error) {
      console.error('❌ Error deleting newsletter subscription:', error);
      toast.error(`Error deleting newsletter subscription: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Newsletter Subscriptions</h2>
        <p className="text-gray-600 mt-1">Manage email subscribers and mailing lists</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search subscribers by email or source..."
            value={newsletterSearchTerm}
            onChange={(e) => setNewsletterSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <select
          value={newsletterStatusFilter}
          onChange={(e) => setNewsletterStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="bounced">Bounced</option>
        </select>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">Loading newsletter subscriptions...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subscribed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredNewsletterSubscriptions.length > 0 ? (
                  filteredNewsletterSubscriptions.map((subscription) => (
                    <tr key={subscription.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {subscription.email?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {subscription.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          subscription.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : subscription.status === 'unsubscribed'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {subscription.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {subscription.source || 'website'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {subscription.subscribedAt ? new Date(subscription.subscribedAt.toDate()).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <select
                            value={subscription.status || 'active'}
                            onChange={(e) => handleUpdateNewsletterStatus(subscription.id, e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="active">Active</option>
                            <option value="unsubscribed">Unsubscribed</option>
                            <option value="bounced">Bounced</option>
                          </select>
                          <button
                            onClick={() => handleDeleteNewsletterSubscription(subscription.id, subscription.email)}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs transition-colors"
                            title="Delete subscription"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <Mail className="w-10 h-10 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No newsletter subscriptions found</h3>
                      <p className="text-gray-600">
                        {newsletterSearchTerm ? 'Try adjusting your search terms' : 'Subscribers will appear here'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsletterManagement;
