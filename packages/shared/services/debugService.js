/**
 * Debug Service - Supabase version
 */

import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

export const debugReferralTransactions = async (userId) => {
  try {
    const supabase = getSupabase();

    // Get user profile
    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
    const referralCode = userData?.referral_code;

    // Get referral code document
    let referralData = null;
    if (referralCode) {
      const { data } = await supabase.from('referral_codes').select('*').eq('code', referralCode).single();
      referralData = data;
    }

    // Get all transactions for this user
    const { data: transactions } = await supabase
      .from('user_transactions')
      .select('*')
      .eq('user_id', userId);

    const allTransactions = transactions || [];

    // Filter referral transactions
    const referralTransactions = allTransactions.filter(t =>
      t.method === 'referral' ||
      t.description?.includes('Referral earnings') ||
      t.description?.includes('referral')
    );

    // Get users who used this referral code
    let referredUsers = [];
    if (referralCode) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email, referred_by, created_at')
        .eq('referred_by', referralCode);
      referredUsers = users || [];
    }

    return {
      userProfile: userData,
      referralCode,
      referralData,
      allTransactions,
      referralTransactions,
      referredUsers
    };
  } catch (error) {
    return { error: error.message };
  }
};

export const debugAllReferralCodes = async () => {
  try {
    const supabase = getSupabase();

    const { data: referralCodes } = await supabase.from('referral_codes').select('*');
    const { data: referredUsers } = await supabase
      .from('users')
      .select('id, email, referred_by, created_at')
      .not('referred_by', 'is', null);

    return {
      referralCodes: referralCodes || [],
      referredUsers: referredUsers || []
    };
  } catch (error) {
    return { error: error.message };
  }
};
