/**
 * Blacklist Service - Supabase version
 */

import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

const BLACKLIST_TABLE = 'fraud_blocklist';

export const getBlacklistRecords = async (pageSize = 50, offset = 0) => {
  try {
    const supabase = getSupabase();
    const { data, error, count } = await supabase
      .from(BLACKLIST_TABLE)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const records = (data || []).map(row => ({
      id: row.id,
      ...row,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
      blockedAt: row.blocked_at || row.created_at ? new Date(row.blocked_at || row.created_at) : new Date()
    }));

    return {
      records,
      lastDoc: null, // Not needed for Supabase pagination
      hasMore: (offset + pageSize) < (count || 0)
    };
  } catch (error) {
    console.error('Error fetching blacklist records:', error);
    throw error;
  }
};

export const getBlacklistRecordsByUserId = async (userId) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(BLACKLIST_TABLE)
      .select('*')
      .eq('userId', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      ...row,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
      blockedAt: row.blocked_at || row.created_at ? new Date(row.blocked_at || row.created_at) : new Date()
    }));
  } catch (error) {
    console.error('Error fetching blacklist records by user ID:', error);
    throw error;
  }
};

export const createBlacklistRecord = async (blacklistData) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(BLACKLIST_TABLE)
      .insert({
        ...blacklistData,
        blocked_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating blacklist record:', error);
    throw error;
  }
};

export const updateBlacklistRecord = async (recordId, updateData) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(BLACKLIST_TABLE)
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', recordId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating blacklist record:', error);
    throw error;
  }
};

export const removeFromBlacklist = async (recordId, reason = 'manual_removal') => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(BLACKLIST_TABLE)
      .update({
        status: 'removed',
        removed_at: new Date().toISOString(),
        removal_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing from blacklist:', error);
    throw error;
  }
};

export const deleteBlacklistRecord = async (recordId) => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from(BLACKLIST_TABLE).delete().eq('id', recordId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting blacklist record:', error);
    throw error;
  }
};

export const getBlacklistStats = async () => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from(BLACKLIST_TABLE).select('status, reason');

    if (error) throw error;

    const stats = { total: 0, active: 0, removed: 0, byReason: {}, byStatus: {} };

    (data || []).forEach(row => {
      stats.total++;
      const status = row.status || 'active';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      if (status === 'active') stats.active++;
      else if (status === 'removed') stats.removed++;
      const reason = row.reason || 'unknown';
      stats.byReason[reason] = (stats.byReason[reason] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error fetching blacklist stats:', error);
    throw error;
  }
};

export const searchBlacklistRecords = async (searchTerm) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(BLACKLIST_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || [])
      .filter(row => {
        const searchableText = [
          row.userId, row.userEmail, row.email, row.reason, row.status,
          JSON.stringify(row.metadata || {})
        ].join(' ').toLowerCase();
        return searchableText.includes(searchTerm.toLowerCase());
      })
      .map(row => ({
        id: row.id,
        ...row,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
        blockedAt: row.blocked_at || row.created_at ? new Date(row.blocked_at || row.created_at) : new Date()
      }));
  } catch (error) {
    console.error('Error searching blacklist records:', error);
    throw error;
  }
};
