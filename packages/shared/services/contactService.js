/**
 * Contact Service - Supabase version
 */

import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

const createContactRequestData = (requestData) => ({
  name: requestData.name || '',
  email: requestData.email || '',
  message: requestData.message || '',
  type: requestData.type || 'contact',
  agreement_accepted: requestData.agreementAccepted || false,
  agreement_text: requestData.agreementText || '',
  status: 'new',
  priority: 'medium',
  resolved_at: null,
  assigned_to: null,
  notes: []
});

export const createContactRequest = async (requestData) => {
  try {
    const supabase = getSupabase();
    const contactRequest = createContactRequestData(requestData);
    const { data, error } = await supabase
      .from('contact_requests')
      .insert(contactRequest)
      .select('id')
      .single();
    if (error) throw error;
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error creating contact request:', error);
    throw error;
  }
};

export const getContactRequests = async () => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('contact_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({ id: row.id, ...row }));
  } catch (error) {
    console.error('Error getting contact requests:', error);
    throw error;
  }
};

export const getContactRequestsByStatus = async (status) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('contact_requests')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({ id: row.id, ...row }));
  } catch (error) {
    console.error('Error getting contact requests by status:', error);
    throw error;
  }
};

export const updateContactRequestStatus = async (requestId, status, notes = '') => {
  try {
    const supabase = getSupabase();
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };
    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = new Date().toISOString();
    }
    if (notes) {
      updateData.notes = [notes];
    }
    const { error } = await supabase
      .from('contact_requests')
      .update(updateData)
      .eq('id', requestId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating contact request status:', error);
    throw error;
  }
};

export const deleteContactRequest = async (requestId) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('contact_requests').delete().eq('id', requestId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting contact request:', error);
    throw error;
  }
};

export const addNoteToContactRequest = async (requestId, note) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('contact_requests')
      .update({
        notes: [note],
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error adding note to contact request:', error);
    throw error;
  }
};
