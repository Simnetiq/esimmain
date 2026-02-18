/**
 * Newsletter Service - Supabase version
 */

import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

export const subscribeToNewsletter = async (subscriptionData) => {
  try {
    const supabase = getSupabase();

    // Check if email already exists
    const { data: existing } = await supabase
      .from('newsletter_subscriptions')
      .select('id, status')
      .eq('email', subscriptionData.email)
      .limit(1);

    if (existing && existing.length > 0) {
      const row = existing[0];
      if (row.status === 'unsubscribed') {
        const { error } = await supabase
          .from('newsletter_subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
            unsubscribed_at: null,
            source: subscriptionData.source || 'website'
          })
          .eq('id', row.id);
        if (error) throw error;
        return { success: true, id: row.id, message: 'Email reactivated' };
      }
      return { success: false, message: 'Email already subscribed' };
    }

    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .insert({
        email: subscriptionData.email || '',
        status: 'active',
        source: subscriptionData.source || 'website',
        tags: subscriptionData.tags || [],
        notes: subscriptionData.notes || ''
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    throw error;
  }
};

export const getNewsletterSubscriptions = async () => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .select('*')
      .order('subscribed_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({ id: row.id, ...row }));
  } catch (error) {
    console.error('Error getting newsletter subscriptions:', error);
    throw error;
  }
};

export const getNewsletterSubscriptionsByStatus = async (status) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .select('*')
      .eq('status', status)
      .order('subscribed_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({ id: row.id, ...row }));
  } catch (error) {
    console.error('Error getting newsletter subscriptions by status:', error);
    throw error;
  }
};

export const updateNewsletterSubscriptionStatus = async (subscriptionId, status, notes = '') => {
  try {
    const supabase = getSupabase();
    const updateData = { status, updated_at: new Date().toISOString() };
    if (status === 'unsubscribed') updateData.unsubscribed_at = new Date().toISOString();
    if (notes) updateData.notes = notes;

    const { error } = await supabase
      .from('newsletter_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating newsletter subscription status:', error);
    throw error;
  }
};

export const deleteNewsletterSubscription = async (subscriptionId) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('newsletter_subscriptions').delete().eq('id', subscriptionId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting newsletter subscription:', error);
    throw error;
  }
};

export const unsubscribeFromNewsletter = async (email) => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('newsletter_subscriptions')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (!data || data.length === 0) return { success: false, message: 'Email not found' };
    await updateNewsletterSubscriptionStatus(data[0].id, 'unsubscribed');
    return { success: true };
  } catch (error) {
    console.error('Error unsubscribing from newsletter:', error);
    throw error;
  }
};

export const getNewsletterStats = async () => {
  try {
    const allSubscriptions = await getNewsletterSubscriptions();
    return {
      total: allSubscriptions.length,
      active: allSubscriptions.filter(sub => sub.status === 'active').length,
      unsubscribed: allSubscriptions.filter(sub => sub.status === 'unsubscribed').length,
      bounced: allSubscriptions.filter(sub => sub.status === 'bounced').length
    };
  } catch (error) {
    console.error('Error getting newsletter stats:', error);
    throw error;
  }
};
