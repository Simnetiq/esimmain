import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Default settings structure
const defaultSettings = {
  // Social Media Links
  socialMedia: {
    linkedin: '',
    facebook: '',
    twitter: '',
    instagram: '',
    youtube: '',
    tiktok: '',
    telegram: '',
    whatsapp: ''
  },
  
  // Contact Information
  contact: {
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    website: ''
  },
  
  // Company Information
  company: {
    name: '',
    description: '',
    founded: '',
    employees: '',
    industry: '',
    logo: ''
  },
  
  // Business Hours
  businessHours: {
    monday: { open: '09:00', close: '18:00', closed: false },
    tuesday: { open: '09:00', close: '18:00', closed: false },
    wednesday: { open: '09:00', close: '18:00', closed: false },
    thursday: { open: '09:00', close: '18:00', closed: false },
    friday: { open: '09:00', close: '18:00', closed: false },
    saturday: { open: '10:00', close: '16:00', closed: false },
    sunday: { open: '00:00', close: '00:00', closed: true }
  },
  
  // SEO Settings
  seo: {
    title: '',
    description: '',
    keywords: [],
    ogImage: '',
    favicon: ''
  },
  
  // App Settings
  app: {
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: false,
    maxFileSize: 10, // MB
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx']
  },
  
  // App Store Links
  appStore: {
    iosUrl: '',
    androidUrl: ''
  },
  
  // Discount Settings
  referral: {
    discountPercentage: 17,
    minimumPrice: 0.5
  },
  
  regular: {
    discountPercentage: 10,
    minimumPrice: 0.5
  },
  
  // Metadata
  updatedAt: serverTimestamp(),
  updatedBy: ''
};

// Get all settings
export const getSettings = async () => {
  try {
    const settingsRef = doc(db, 'settings', 'general');
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      return {
        id: settingsDoc.id,
        ...data,
        // Merge with defaults for any missing fields
        socialMedia: { ...defaultSettings.socialMedia, ...data.socialMedia },
        contact: { ...defaultSettings.contact, ...data.contact },
        company: { ...defaultSettings.company, ...data.company },
        businessHours: { ...defaultSettings.businessHours, ...data.businessHours },
        seo: { ...defaultSettings.seo, ...data.seo },
        app: { ...defaultSettings.app, ...data.app },
        appStore: { ...defaultSettings.appStore, ...data.appStore },
        referral: { ...defaultSettings.referral, ...data.referral },
        regular: { ...defaultSettings.regular, ...data.regular }
      };
    } else {
      // Return defaults if no settings exist
      return {
        id: 'general',
        ...defaultSettings
      };
    }
  } catch (error) {
    console.error('Error getting settings:', error);
    throw error;
  }
};

// Update settings
export const updateSettings = async (settingsData, userId) => {
  try {
    const settingsRef = doc(db, 'settings', 'general');
    
    const updateData = {
      ...settingsData,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    };
    
    await setDoc(settingsRef, updateData, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

// Update specific section of settings
export const updateSettingsSection = async (section, data, userId) => {
  try {
    const settingsRef = doc(db, 'settings', 'general');
    
    const updateData = {
      [section]: data,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    };
    
    await setDoc(settingsRef, updateData, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error updating settings section:', error);
    throw error;
  }
};

// Get social media links only
export const getSocialMediaLinks = async () => {
  try {
    const settings = await getSettings();
    return settings.socialMedia || defaultSettings.socialMedia;
  } catch (error) {
    console.error('Error getting social media links:', error);
    return defaultSettings.socialMedia;
  }
};

// Get contact information only
export const getContactInfo = async () => {
  try {
    const settings = await getSettings();
    return settings.contact || defaultSettings.contact;
  } catch (error) {
    console.error('Error getting contact info:', error);
    return defaultSettings.contact;
  }
};

// Get app store links only
export const getAppStoreLinks = async () => {
  try {
    const settings = await getSettings();
    return settings.appStore || defaultSettings.appStore;
  } catch (error) {
    console.error('Error getting app store links:', error);
    return defaultSettings.appStore;
  }
};

// Get company information only
export const getCompanyInfo = async () => {
  try {
    const settings = await getSettings();
    return settings.company || defaultSettings.company;
  } catch (error) {
    console.error('Error getting company info:', error);
    return defaultSettings.company;
  }
};

// Get referral settings only
export const getReferralSettings = async () => {
  try {
    const settings = await getSettings();
    const referralSettings = settings.referral || defaultSettings.referral;
    return referralSettings;
  } catch (error) {
    console.error('Error getting referral settings:', error);
    return defaultSettings.referral;
  }
};

// Get regular settings only
export const getRegularSettings = async () => {
  try {
    const settings = await getSettings();
    const regularSettings = settings.regular || { discountPercentage: 10, minimumPrice: 0.5 };
    return regularSettings;
  } catch (error) {
    console.error('Error getting regular settings:', error);
    return { discountPercentage: 10, minimumPrice: 0.5 };
  }
};

// Reset settings to defaults
export const resetSettingsToDefaults = async (userId) => {
  try {
    const settingsRef = doc(db, 'settings', 'general');
    
    const resetData = {
      ...defaultSettings,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
      resetAt: serverTimestamp()
    };
    
    await setDoc(settingsRef, resetData);
    return { success: true };
  } catch (error) {
    console.error('Error resetting settings:', error);
    throw error;
  }
};

// Validate settings data
export const validateSettings = (settings) => {
  const errors = {};
  
  // Validate email
  if (settings.contact?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contact.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // Validate phone
  if (settings.contact?.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(settings.contact.phone.replace(/[\s\-\(\)]/g, ''))) {
    errors.phone = 'Please enter a valid phone number';
  }
  
  // Validate URLs
  const urlFields = ['website', 'linkedin', 'facebook', 'twitter', 'instagram', 'youtube', 'tiktok'];
  urlFields.forEach(field => {
    const value = settings.socialMedia?.[field] || settings.contact?.[field];
    if (value && !/^https?:\/\/.+/.test(value)) {
      errors[field] = 'Please enter a valid URL starting with http:// or https://';
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
