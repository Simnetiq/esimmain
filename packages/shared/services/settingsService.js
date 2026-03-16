/**
 * Settings Service - Supabase version
 */

import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

const defaultSettings = {
  socialMedia: { linkedin: '', facebook: '', twitter: '', instagram: '', youtube: '', tiktok: '', telegram: '', whatsapp: '' },
  contact: { email: '', phone: '', address: '', city: '', state: '', country: '', postalCode: '', website: '' },
  company: { name: '', description: '', founded: '', employees: '', industry: '', logo: '' },
  businessHours: {
    monday: { open: '09:00', close: '18:00', closed: false },
    tuesday: { open: '09:00', close: '18:00', closed: false },
    wednesday: { open: '09:00', close: '18:00', closed: false },
    thursday: { open: '09:00', close: '18:00', closed: false },
    friday: { open: '09:00', close: '18:00', closed: false },
    saturday: { open: '10:00', close: '16:00', closed: false },
    sunday: { open: '00:00', close: '00:00', closed: true }
  },
  seo: { title: '', description: '', keywords: [], ogImage: '', favicon: '' },
  app: { maintenanceMode: false, allowRegistration: true, requireEmailVerification: false, maxFileSize: 10, supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'] },
  appStore: { iosUrl: '', androidUrl: '' },
  referral: { discountPercentage: 17, minimumPrice: 0.5 },
  regular: { discountPercentage: 10, minimumPrice: 0.5 }
};

export const getSettings = async () => {
  try {
    const supabase = getSupabase();
    if (!supabase) return { id: 'general', ...defaultSettings };
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'settings_general')
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (data?.value) {
      const d = data.value;
      return {
        id: 'general',
        ...d,
        socialMedia: { ...defaultSettings.socialMedia, ...d.socialMedia },
        contact: { ...defaultSettings.contact, ...d.contact },
        company: { ...defaultSettings.company, ...d.company },
        businessHours: { ...defaultSettings.businessHours, ...d.businessHours },
        seo: { ...defaultSettings.seo, ...d.seo },
        app: { ...defaultSettings.app, ...d.app },
        appStore: { ...defaultSettings.appStore, ...d.appStore },
        referral: { ...defaultSettings.referral, ...d.referral },
        regular: { ...defaultSettings.regular, ...d.regular }
      };
    }
    return { id: 'general', ...defaultSettings };
  } catch {
    return { id: 'general', ...defaultSettings };
  }
};

export const updateSettings = async (settingsData, userId) => {
  try {
    const supabase = getSupabase();
    const updateData = { ...settingsData, updatedAt: new Date().toISOString(), updatedBy: userId };

    const { error } = await supabase
      .from('app_config')
      .upsert({ key: 'settings_general', value: updateData }, { onConflict: 'key' });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

export const updateSettingsSection = async (section, data, userId) => {
  try {
    const currentSettings = await getSettings();
    currentSettings[section] = data;
    currentSettings.updatedAt = new Date().toISOString();
    currentSettings.updatedBy = userId;
    delete currentSettings.id;

    const supabase = getSupabase();
    const { error } = await supabase
      .from('app_config')
      .upsert({ key: 'settings_general', value: currentSettings }, { onConflict: 'key' });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating settings section:', error);
    throw error;
  }
};

export const getSocialMediaLinks = async () => {
  try {
    const settings = await getSettings();
    return settings.socialMedia || defaultSettings.socialMedia;
  } catch (error) {
    console.error('Error getting social media links:', error);
    return defaultSettings.socialMedia;
  }
};

export const getContactInfo = async () => {
  try {
    const settings = await getSettings();
    return settings.contact || defaultSettings.contact;
  } catch (error) {
    console.error('Error getting contact info:', error);
    return defaultSettings.contact;
  }
};

export const getAppStoreLinks = async () => {
  try {
    const settings = await getSettings();
    return settings.appStore || defaultSettings.appStore;
  } catch (error) {
    console.error('Error getting app store links:', error);
    return defaultSettings.appStore;
  }
};

export const getCompanyInfo = async () => {
  try {
    const settings = await getSettings();
    return settings.company || defaultSettings.company;
  } catch (error) {
    console.error('Error getting company info:', error);
    return defaultSettings.company;
  }
};

export const getReferralSettings = async () => {
  try {
    const settings = await getSettings();
    return settings.referral || defaultSettings.referral;
  } catch {
    return defaultSettings.referral;
  }
};

export const getRegularSettings = async () => {
  try {
    const settings = await getSettings();
    return settings.regular || { discountPercentage: 10, minimumPrice: 0.5 };
  } catch {
    return { discountPercentage: 10, minimumPrice: 0.5 };
  }
};

export const resetSettingsToDefaults = async (userId) => {
  try {
    const supabase = getSupabase();
    const resetData = { ...defaultSettings, updatedAt: new Date().toISOString(), updatedBy: userId, resetAt: new Date().toISOString() };

    const { error } = await supabase
      .from('app_config')
      .upsert({ key: 'settings_general', value: resetData }, { onConflict: 'key' });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error resetting settings:', error);
    throw error;
  }
};

export const validateSettings = (settings) => {
  const errors = {};
  if (settings.contact?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contact.email)) {
    errors.email = 'Please enter a valid email address';
  }
  if (settings.contact?.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(settings.contact.phone.replace(/[\s\-\(\)]/g, ''))) {
    errors.phone = 'Please enter a valid phone number';
  }
  const urlFields = ['website', 'linkedin', 'facebook', 'twitter', 'instagram', 'youtube', 'tiktok'];
  urlFields.forEach(field => {
    const value = settings.socialMedia?.[field] || settings.contact?.[field];
    if (value && !/^https?:\/\/.+/.test(value)) {
      errors[field] = 'Please enter a valid URL starting with http:// or https://';
    }
  });
  return { isValid: Object.keys(errors).length === 0, errors };
};
