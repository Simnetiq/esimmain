'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import {
  Search,
  Users,
  Globe,
  Smartphone,
  Monitor,
  Apple
} from 'lucide-react';
import toast from 'react-hot-toast';

// Helper to get platform icon and label based on order data
const getPlatformInfo = (platform, userAgent, hasOrders) => {
  // Check if it's a native app based on userAgent
  const isNativeApp = userAgent?.includes('eSIMMobile') || 
                      userAgent?.includes('SimnetiqApp') ||
                      userAgent?.includes('CFNetwork'); // iOS native indicator
  
  if (platform === 'ios') {
    if (isNativeApp) {
      return { icon: Apple, label: 'iOS App', color: 'text-gray-900 bg-gray-100' };
    }
    return { icon: Globe, label: 'Mobile Web (iOS)', color: 'text-gray-700 bg-gray-50' };
  }
  
  if (platform === 'android') {
    if (isNativeApp) {
      return { icon: Smartphone, label: 'Android App', color: 'text-green-700 bg-green-100' };
    }
    return { icon: Globe, label: 'Mobile Web (Android)', color: 'text-green-700 bg-green-50' };
  }
  
  if (platform === 'web') {
    return { icon: Monitor, label: 'Web', color: 'text-indigo-700 bg-indigo-100' };
  }
  
  // No platform detected
  if (hasOrders === false) {
    return { icon: Users, label: 'No orders', color: 'text-gray-400 bg-gray-50' };
  }
  
  return { icon: Globe, label: 'Unknown', color: 'text-gray-500 bg-gray-100' };
};

const UserManagement = () => {
  const { currentUser } = useAuth();

  // State Management
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Load data on component mount
  useEffect(() => {
    if (currentUser) {
      loadUsersFromFirestore();
    }
  }, [currentUser]);

  // Filter users based on search and platform
  useEffect(() => {
    let filtered = users.filter(user => 
      user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.id?.toLowerCase().includes(userSearchTerm.toLowerCase())
    );
    
    // Apply platform filter
    if (platformFilter !== 'all') {
      filtered = filtered.filter(user => {
        if (platformFilter === 'ios') return user.detectedPlatform === 'ios';
        if (platformFilter === 'android') return user.detectedPlatform === 'android';
        if (platformFilter === 'web') return user.detectedPlatform === 'web';
        if (platformFilter === 'unknown') return !user.detectedPlatform;
        return true;
      });
    }
    
    setFilteredUsers(filtered);
  }, [users, userSearchTerm, platformFilter]);

  // User Management Functions
  const loadUsersFromFirestore = async () => {
    try {
      setLoading(true);
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Load all orders once to extract platform info
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const allOrders = ordersSnapshot.docs.map(doc => doc.data());
      
      // Group orders by userId and find the earliest order for each user
      const userFirstOrders = {};
      allOrders.forEach(order => {
        const userId = order.userId;
        if (!userId) return;
        
        const orderDate = order.createdAt?.seconds || 0;
        
        if (!userFirstOrders[userId] || orderDate < userFirstOrders[userId].createdAt?.seconds) {
          userFirstOrders[userId] = order;
        }
      });
      
      // Merge platform info into users
      const usersWithPlatform = usersData.map(user => {
        const firstOrder = userFirstOrders[user.id];
        if (firstOrder) {
          return {
            ...user,
            detectedPlatform: firstOrder.platform || null,
            detectedUserAgent: firstOrder.security?.userAgent || null,
            firstOrderDate: firstOrder.createdAt,
            hasOrders: true
          };
        }
        return { ...user, detectedPlatform: null, detectedUserAgent: null, hasOrders: false };
      });
      
      setUsers(usersWithPlatform);
      setFilteredUsers(usersWithPlatform);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <p className="text-gray-600 mt-1">Manage users and their permissions • {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Search Bar and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search users by email, role, or user ID..."
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        
        {/* Platform Filter */}
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="all">All Platforms</option>
          <option value="ios">iOS App</option>
          <option value="android">Android App</option>
          <option value="web">Web</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">
              {userSearchTerm ? 'Try adjusting your search terms' : 'No users in the system'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signup Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    onClick={() => window.location.href = `/user/${user.id}`}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.email || 'No email'}
                          </div>
                          <div className="text-sm text-gray-500">
                            User ID: {user.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' || user.role === 'super_admin'
                          ? 'bg-red-100 text-red-800'
                          : user.role === 'moderator'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const platformInfo = getPlatformInfo(user.detectedPlatform, user.detectedUserAgent, user.hasOrders);
                        const IconComponent = platformInfo.icon;
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${platformInfo.color}`}>
                            <IconComponent className="w-3.5 h-3.5" />
                            {platformInfo.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className="text-blue-600 text-xs">
                        Click to view →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default UserManagement;
