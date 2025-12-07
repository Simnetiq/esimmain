'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { getSettings, updateSettingsSection, validateSettings } from '@esim/shared/services/settingsService';
import { motion } from 'framer-motion';
import { 
  Link, 
  Phone, 
  Clock, 
  Smartphone,
  Save,
  Linkedin,
  Facebook,
  Instagram,
  Youtube,
  Mail,
  Building,
  MapPin,
  Apple,
  Play
} from 'lucide-react';
import toast from 'react-hot-toast';

const LinksManagement = () => {
  const { currentUser } = useAuth();

  // State Management
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('social');
  const [settingsFormData, setSettingsFormData] = useState({
    socialMedia: {},
    contact: {},
    businessHours: {},
    appStore: {}
  });
  const [settingsErrors, setSettingsErrors] = useState({});
  
  // Business Hours Modal Management
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false);
  const [businessHoursData, setBusinessHoursData] = useState({
    monday: { open: '', close: '', closed: false },
    tuesday: { open: '', close: '', closed: false },
    wednesday: { open: '', close: '', closed: false },
    thursday: { open: '', close: '', closed: false },
    friday: { open: '', close: '', closed: false },
    saturday: { open: '', close: '', closed: false },
    sunday: { open: '', close: '', closed: false }
  });

  // Load data on component mount
  useEffect(() => {
    if (currentUser) {
      loadSettings();
    }
  }, [currentUser]);

  // Settings Management Functions
  const loadSettings = async () => {
    try {
      setSettingsLoading(true);
      const settingsData = await getSettings();
      setSettings(settingsData);
      setSettingsFormData({
        socialMedia: settingsData.socialMedia || {},
        contact: settingsData.contact || {},
        businessHours: settingsData.businessHours || {},
        appStore: settingsData.appStore || {}
      });
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSettingsInputChange = (section, field, value) => {
    setSettingsFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    
    // Clear error for this field
    if (settingsErrors[field]) {
      setSettingsErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSaveSettings = async (section) => {
    try {
      setSettingsLoading(true);
      
      // Validate the data
      const validation = validateSettings({ [section]: settingsFormData[section] });
      if (!validation.isValid) {
        setSettingsErrors(validation.errors);
        toast.error('Please fix the validation errors');
        return;
      }
      
      await updateSettingsSection(section, settingsFormData[section], currentUser?.uid);
      toast.success(`${section} settings updated successfully!`);
      await loadSettings();
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Business Hours Functions
  const handleOpenBusinessHoursModal = () => {
    const existingHours = settings?.businessHours || {};
    setBusinessHoursData({
      monday: existingHours.monday || { open: '', close: '', closed: false },
      tuesday: existingHours.tuesday || { open: '', close: '', closed: false },
      wednesday: existingHours.wednesday || { open: '', close: '', closed: false },
      thursday: existingHours.thursday || { open: '', close: '', closed: false },
      friday: existingHours.friday || { open: '', close: '', closed: false },
      saturday: existingHours.saturday || { open: '', close: '', closed: false },
      sunday: existingHours.sunday || { open: '', close: '', closed: false }
    });
    setShowBusinessHoursModal(true);
  };

  const handleBusinessHoursChange = (day, field, value) => {
    setBusinessHoursData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleSaveBusinessHours = async () => {
    try {
      setSettingsLoading(true);
      await updateSettingsSection('businessHours', businessHoursData, currentUser?.uid);
      toast.success('Business hours updated successfully!');
      setShowBusinessHoursModal(false);
      await loadSettings();
    } catch {
      toast.error('Failed to save business hours');
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Website Links</h2>
            <p className="text-gray-600">Manage social media links, contact information, and company details</p>
          </div>
          <div className="flex space-x-3">
          </div>
        </div>
      </div>

      {/* Links Tabs */}
      <div className="bg-white rounded-xl shadow-lg p-1">
        <nav className="flex space-x-1">
          {[
            { id: 'social', label: 'Social Media', icon: Link },
            { id: 'contact', label: 'Contact Info', icon: Phone },
            { id: 'hours', label: 'Business Hours', icon: Clock },
            { id: 'appstore', label: 'App Store Links', icon: Smartphone }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeSettingsTab === tab.id
                    ? 'bg-black text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Links Content */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {settingsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading links...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Social Media Tab */}
            {activeSettingsTab === 'social' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Social Media Links</h3>
                  <button
                    onClick={() => handleSaveSettings('socialMedia')}
                    disabled={settingsLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Social Media
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Linkedin className="w-4 h-4 inline mr-2" />
                      LinkedIn URL
                    </label>
                    <input
                      type="url"
                      value={settingsFormData.socialMedia.linkedin || ''}
                      onChange={(e) => handleSettingsInputChange('socialMedia', 'linkedin', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://linkedin.com/company/yourcompany"
                    />
                    {settingsErrors.linkedin && (
                      <p className="text-red-500 text-sm mt-1">{settingsErrors.linkedin}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Facebook className="w-4 h-4 inline mr-2" />
                      Facebook URL
                    </label>
                    <input
                      type="url"
                      value={settingsFormData.socialMedia.facebook || ''}
                      onChange={(e) => handleSettingsInputChange('socialMedia', 'facebook', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://facebook.com/yourcompany"
                    />
                    {settingsErrors.facebook && (
                      <p className="text-red-500 text-sm mt-1">{settingsErrors.facebook}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Instagram className="w-4 h-4 inline mr-2" />
                      Instagram URL
                    </label>
                    <input
                      type="url"
                      value={settingsFormData.socialMedia.instagram || ''}
                      onChange={(e) => handleSettingsInputChange('socialMedia', 'instagram', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://instagram.com/yourcompany"
                    />
                    {settingsErrors.instagram && (
                      <p className="text-red-500 text-sm mt-1">{settingsErrors.instagram}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Youtube className="w-4 h-4 inline mr-2" />
                      YouTube URL
                    </label>
                    <input
                      type="url"
                      value={settingsFormData.socialMedia.youtube || ''}
                      onChange={(e) => handleSettingsInputChange('socialMedia', 'youtube', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://youtube.com/c/yourcompany"
                    />
                    {settingsErrors.youtube && (
                      <p className="text-red-500 text-sm mt-1">{settingsErrors.youtube}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Contact Information Tab */}
            {activeSettingsTab === 'contact' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Contact Information</h3>
                  <button
                    onClick={() => handleSaveSettings('contact')}
                    disabled={settingsLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Contact Info
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={settingsFormData.contact.email || ''}
                      onChange={(e) => handleSettingsInputChange('contact', 'email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="contact@yourcompany.com"
                    />
                    {settingsErrors.email && (
                      <p className="text-red-500 text-sm mt-1">{settingsErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={settingsFormData.contact.phone || ''}
                      onChange={(e) => handleSettingsInputChange('contact', 'phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+1 (555) 123-4567"
                    />
                    {settingsErrors.phone && (
                      <p className="text-red-500 text-sm mt-1">{settingsErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building className="w-4 h-4 inline mr-2" />
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={settingsFormData.contact.companyName || ''}
                      onChange={(e) => handleSettingsInputChange('contact', 'companyName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your Company Name"
                    />
                    {settingsErrors.companyName && (
                      <p className="text-red-500 text-sm mt-1">{settingsErrors.companyName}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Address
                    </label>
                    <input
                      type="text"
                      value={settingsFormData.contact.address || ''}
                      onChange={(e) => handleSettingsInputChange('contact', 'address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="123 Main Street, City, State 12345"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Business Hours Tab */}
            {activeSettingsTab === 'hours' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Business Hours</h3>
                  <button
                    onClick={handleOpenBusinessHoursModal}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Manage Hours
                  </button>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Current Business Hours</h4>
                  <div className="space-y-2">
                    {settings?.businessHours ? (
                      Object.entries(settings.businessHours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                          <span className="font-medium capitalize">{day}</span>
                          <span className="text-gray-600">
                            {hours.closed ? 'Closed' : `${hours.open || '--'} - ${hours.close || '--'}`}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No business hours set. Click &quot;Manage Hours&quot; to add them.</p>
                    )}
                  </div>
                </div>
              </div>
            )}


            {/* App Store Links Tab */}
            {activeSettingsTab === 'appstore' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">App Store Links</h3>
                  <button
                    onClick={() => handleSaveSettings('appStore')}
                    disabled={settingsLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save App Store Links
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* iOS App Store */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mr-4">
                        <Apple className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">iOS App Store</h4>
                        <p className="text-sm text-gray-600">Apple App Store link</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        App Store URL
                      </label>
                      <input
                        type="url"
                        value={settingsFormData.appStore?.iosUrl || ''}
                        onChange={(e) => handleSettingsInputChange('appStore', 'iosUrl', e.target.value)}
                        placeholder="https://apps.apple.com/app/your-app"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Google Play Store */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mr-4">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Google Play Store</h4>
                        <p className="text-sm text-gray-600">Android app link</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Play Store URL
                      </label>
                      <input
                        type="url"
                        value={settingsFormData.appStore?.androidUrl || ''}
                        onChange={(e) => handleSettingsInputChange('appStore', 'androidUrl', e.target.value)}
                        placeholder="https://play.google.com/store/apps/details?id=your.app"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Business Hours Modal */}
      {showBusinessHoursModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">Manage Business Hours</h3>
              <button
                onClick={() => setShowBusinessHoursModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {Object.entries(businessHoursData).map(([day, hours]) => (
                  <div key={day} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                    <div className="w-24">
                      <span className="font-medium capitalize">{day}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={hours.closed}
                        onChange={(e) => handleBusinessHoursChange(day, 'closed', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">Closed</span>
                    </div>
                    
                    {!hours.closed && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={hours.open}
                          onChange={(e) => handleBusinessHoursChange(day, 'open', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={hours.close}
                          onChange={(e) => handleBusinessHoursChange(day, 'close', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowBusinessHoursModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBusinessHours}
                disabled={settingsLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center"
              >
                {settingsLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Business Hours
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LinksManagement;
