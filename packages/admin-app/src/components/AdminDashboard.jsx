'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useAdmin } from '@esim/shared/contexts/AdminContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  MapPin,
  Database,
  FileText,
  MessageSquare,
  Mail,
  LogOut,
  Smartphone,
  Briefcase,
  ChevronDown,
  User,
  Shield,
  Users,
  DollarSign
} from 'lucide-react';
import AdminHome from './AdminHome';
import CountryManagement from './CountryManagement';
import FinancesManagement from './FinancesManagement';
import PlansManagement from './PlansManagement';
import BlogManagement from './BlogManagement';
import NotificationsManagement from './NotificationsManagement';
import ApplicationLogs from './ApplicationLogs';
import ContactRequestsManagement from './ContactRequestsManagement';
import NewsletterManagement from './NewsletterManagement';
import JobApplicationsManagement from './JobApplicationsManagement';
import UserManagement from './UserManagement';
import RegionManagement from './RegionManagement';




const AdminDashboard = () => {
  const { currentUser, logout } = useAuth();
  const { canManageCountries, canManagePlans, canManageConfig, canManageContactRequests, canManageNewsletter, canManageBlog } = useAdmin();
  const router = useRouter();

  // State Management
  const [activeTab, setActiveTab] = useState('home');
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  
  // Close user info when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserInfo && !event.target.closest('.user-info-container')) {
        setShowUserInfo(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserInfo]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully!');
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Error logging out: ' + error.message);
    }
  };



  // Error handling
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Please log in</h2>
          <p className="text-gray-600">You need to be logged in to access the admin dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="relative flex-1 flex flex-col">
        {/* Header Section */}
        <div className="relative z-0 border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              {/* Back to Dashboard Button */}
              
                
                <span className="font-medium">Simnetiq</span>
             

              {/* User Info */}
              <div className="relative user-info-container z-[100]">
                <button
                  onClick={() => setShowUserInfo(!showUserInfo)}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-semibold">
                      {(currentUser?.displayName || currentUser?.email || 'A').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">
                      {currentUser?.displayName || currentUser?.email || 'Admin'}
                    </p>
                    <p className="text-xs text-gray-500">Administrator</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserInfo ? 'rotate-180' : ''}`} />
                </button>

                {/* User Info Dropdown */}
                {showUserInfo && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-[200]">
                    <div className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-8 h-8 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {currentUser?.displayName || 'Admin User'}
                          </h3>
                          <p className="text-sm text-gray-600">{currentUser?.email}</p>
                        </div>
                      </div>

                      <div className="space-y-3 border-t border-gray-200 pt-4">
                        <div className="flex items-center gap-3 text-sm">
                          <Shield className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Role:</span>
                          <span className="font-medium text-gray-900">Administrator</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">User ID:</span>
                          <span className="font-mono text-xs text-gray-900">{currentUser?.uid?.substring(0, 12)}...</span>
                        </div>
                      </div>

                      <button
                        onClick={handleLogout}
                        className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="font-medium">Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Title */}
            <div className="mt-6">
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
           
            </div>
            </div>
          </div>

         {/* Navigation Tabs */}
         <div className="relative z-0 border-b border-gray-200">
           <div className="px-4 sm:px-6 lg:px-8">
             <div className="flex gap-1 overflow-x-auto">
              {/* Main Tabs */}
              {[
                { id: 'home', label: 'Home', icon: Database, permission: true },
                { id: 'users', label: 'Users', icon: Users, permission: true },
                { id: 'finances', label: 'Finances', icon: DollarSign, permission: canManageConfig },
                { id: 'regions', label: 'Regions', icon: MapPin, permission: canManageConfig },
                { id: 'country-management', label: 'Countries', icon: MapPin, permission: canManageCountries },
                { id: 'plans', label: 'Plans', icon: Smartphone, permission: canManagePlans },
                { id: 'blog', label: 'Blog', icon: FileText, permission: canManageBlog },
           ].filter(tab => tab.permission).map((tab) => {
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

            {/* Administration Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAdminDropdown(!showAdminDropdown)}
                   className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                     ['requests', 'newsletter', 'jobs', 'notifications', 'logs'].includes(activeTab)
                       ? 'border-gray-900 text-gray-900 font-medium'
                       : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                   <Database className="w-4 h-4" />
                   <span className="text-sm">Administration</span>
                   <ChevronDown className={`w-4 h-4 transition-transform ${showAdminDropdown ? 'rotate-180' : ''}`} />
                 </button>
               </div>
             </div>
           </div>
                </div>
              
        {/* Administration Dropdown Menu - Fixed Position */}
        {showAdminDropdown && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-[100]" 
              onClick={() => setShowAdminDropdown(false)}
            />
            {/* Dropdown */}
            <div className="fixed top-[180px] left-1/2 transform -translate-x-1/2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-[200]">
              <div className="py-2">
                  {[
                    { id: 'notifications', label: 'Notifications', icon: MessageSquare, permission: true },
                  { id: 'logs', label: 'Application Logs', icon: FileText, permission: canManageContactRequests },
                    { id: 'requests', label: 'Contact Requests', icon: Mail, permission: canManageContactRequests },
                    { id: 'newsletter', label: 'Newsletter', icon: Mail, permission: canManageNewsletter },
                    { id: 'jobs', label: 'Job Applications', icon: Briefcase, permission: canManageContactRequests },
                  ].filter(tab => tab.permission).map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                        setShowAdminDropdown(false);
                        }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                          activeTab === tab.id
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                      <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
            </div>
          </>
        )}

        {/* Main Content */}
        <div className="relative z-0 flex-1">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {/* Home Tab */}
            {activeTab === 'home' && (
              <AdminHome onNavigate={setActiveTab} />
            )}

            {/* Finances Tab */}
            {activeTab === 'finances' && canManageConfig && (
              <FinancesManagement />
            )}

            {/* Regions Tab */}
            {activeTab === 'regions' && canManageConfig && (
              <RegionManagement />
            )}

            {/* Country Management Tab */}
            {activeTab === 'country-management' && canManageCountries && (
              <CountryManagement />
            )}

            {/* Plans Management Tab */}
            {activeTab === 'plans' && canManagePlans && (
              <PlansManagement />
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <UserManagement />
            )}

            {/* Blog Management Tab */}
            {activeTab === 'blog' && canManageBlog && (
              <BlogManagement />
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <NotificationsManagement />
            )}

            {/* Application Logs Tab */}
            {activeTab === 'logs' && canManageContactRequests && (
              <ApplicationLogs />
            )}

            {/* Contact Requests Tab */}
            {activeTab === 'requests' && canManageContactRequests && (
              <ContactRequestsManagement />
            )}

            {/* Newsletter Tab */}
            {activeTab === 'newsletter' && canManageNewsletter && (
              <NewsletterManagement />
            )}

            {/* Jobs Tab */}
            {activeTab === 'jobs' && canManageContactRequests && (
              <JobApplicationsManagement />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
