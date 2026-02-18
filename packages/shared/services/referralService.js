/**
 * Referral Service - Supabase version
 */

import { getSupabase, isSupabaseAvailable } from '../lib/supabase';
import { configService } from './configService';

export const processReferralUsage = async (referralCode, newUserId) => {
  try {
    const supabase = getSupabase();

    // Check if user has already used a referral code
    const { data: userData } = await supabase
      .from('users')
      .select('referral_code_used, last_login_ip')
      .eq('id', newUserId)
      .single();

    if (userData?.referral_code_used) {
      await configService.logPromocodeUsage(referralCode, newUserId, 'duplicate_attempt', {
        message: 'User attempted to use a second referral code',
        ip: userData.last_login_ip || null
      });
      return { success: false, error: 'You have already used a referral code' };
    }

    // Get the referral code document
    const { data: referralData, error: refError } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', referralCode)
      .single();

    if (refError || !referralData) {
      await configService.logPromocodeUsage(referralCode, newUserId, 'invalid_code', {
        message: 'User attempted to use non-existent referral code',
        ip: userData?.last_login_ip || null
      });
      return { success: false, error: 'Referral code not found' };
    }

    const referrerId = referralData.owner_id;
    if (!referrerId) return { success: false, error: 'Invalid referral code' };

    if (!referralData.is_active) {
      await configService.logPromocodeUsage(referralCode, newUserId, 'inactive_code', {
        message: 'User attempted to use inactive referral code',
        ip: userData?.last_login_ip || null
      });
      return { success: false, error: 'Referral code is not active' };
    }

    if (referralData.expiry_date && new Date(referralData.expiry_date) < new Date()) {
      await configService.logPromocodeUsage(referralCode, newUserId, 'expired_code', {
        message: 'User attempted to use expired referral code',
        ip: userData?.last_login_ip || null
      });
      return { success: false, error: 'Referral code has expired' };
    }

    if (referrerId === newUserId) {
      return { success: false, error: 'Self-referral not allowed' };
    }

    // Update referral code stats
    await supabase
      .from('referral_codes')
      .update({
        usage_count: (referralData.usage_count || 0) + 1,
        last_used: new Date().toISOString()
      })
      .eq('code', referralCode);

    await configService.logPromocodeUsage(referralCode, newUserId, 'used', {
      message: 'Referral code successfully applied',
      referrerId,
      ip: userData?.last_login_ip || null
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getReferralStats = async (userId) => {
  try {
    const supabase = getSupabase();

    const { data: userData } = await supabase
      .from('users')
      .select('referral_code')
      .eq('id', userId)
      .single();

    const referralCode = userData?.referral_code;
    if (!referralCode) {
      return { referralCode: null, usageCount: 0, recentUsages: [], totalEarnings: 0, expiryDate: null };
    }

    const { data: referralData } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', referralCode)
      .single();

    if (!referralData) {
      return { referralCode, usageCount: 0, recentUsages: [], totalEarnings: 0, expiryDate: null };
    }

    // Get commission transactions
    const { data: earnings } = await supabase
      .from('user_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'deposit')
      .eq('method', 'referral_commission');

    let totalEarnings = 0;
    (earnings || []).forEach(t => { totalEarnings += t.amount || 0; });

    // Get withdrawals
    const { data: withdrawals } = await supabase
      .from('user_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('method', 'referral_balance');

    let totalWithdrawals = 0;
    (withdrawals || []).forEach(t => { totalWithdrawals += Math.abs(t.amount || 0); });

    const availableBalance = totalEarnings - totalWithdrawals;

    const recentUsages = (earnings || []).slice(0, 10).map(t => ({
      id: t.id,
      ...t,
      createdAt: t.created_at ? new Date(t.created_at) : new Date()
    }));

    return {
      referralCode,
      usageCount: referralData.usage_count || 0,
      recentUsages,
      totalEarnings: availableBalance,
      expiryDate: referralData.expiry_date ? new Date(referralData.expiry_date) : null,
      isActive: referralData.is_active || false
    };
  } catch (error) {
    return { referralCode: null, usageCount: 0, recentUsages: [], totalEarnings: 0, expiryDate: null, error: error.message };
  }
};

export const isValidReferralCode = async (code) => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('referral_codes')
      .select('is_active, expiry_date')
      .eq('code', code.toUpperCase())
      .single();

    if (!data) return false;
    const isNotExpired = !data.expiry_date || new Date(data.expiry_date) > new Date();
    return (data.is_active || false) && isNotExpired;
  } catch (error) {
    return false;
  }
};

export const hasUserUsedReferralCode = async (userId) => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('users')
      .select('referral_code_used')
      .eq('id', userId)
      .single();
    return data?.referral_code_used || false;
  } catch (error) {
    return false;
  }
};

export const generateUniqueReferralCode = async () => {
  const supabase = getSupabase();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isUnique = false;
  let attempts = 0;

  do {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[(Date.now() + i + attempts) % chars.length];
    }
    const { data } = await supabase.from('referral_codes').select('code').eq('code', code).limit(1);
    isUnique = !data || data.length === 0;
    attempts++;
    if (attempts > 10) {
      code = `REF${Date.now() % 100000000}`;
      break;
    }
  } while (!isUnique);

  return code;
};

export const createReferralCode = async (userId, userEmail, customCode = null) => {
  try {
    const supabase = getSupabase();
    let referralCode;

    if (customCode) {
      referralCode = customCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const { data: existing } = await supabase.from('referral_codes').select('code').eq('code', referralCode).limit(1);
      if (existing && existing.length > 0) {
        return { success: false, error: 'Referral code already exists. Please choose a different name.' };
      }
    } else {
      referralCode = await generateUniqueReferralCode();
    }

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 2);

    await supabase.from('referral_codes').insert({
      code: referralCode,
      owner_id: userId,
      owner_email: userEmail,
      expiry_date: expiryDate.toISOString(),
      is_active: true,
      usage_count: 0,
      total_earnings: 0.0
    });

    await supabase.from('users').update({
      referral_code: referralCode,
      referral_code_expiry_date: expiryDate.toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', userId);

    return { success: true, referralCode, expiryDate };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateReferralEarnings = async (referralCode, amount = 1.0) => {
  try {
    const supabase = getSupabase();
    const { data: current } = await supabase
      .from('referral_codes')
      .select('total_earnings')
      .eq('code', referralCode)
      .single();

    await supabase.from('referral_codes').update({
      total_earnings: (current?.total_earnings || 0) + amount,
      last_earning: new Date().toISOString()
    }).eq('code', referralCode);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAllReferralCodes = async () => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('referral_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const referralCodes = (data || []).map(row => ({
      id: row.code,
      code: row.code,
      ownerId: row.owner_id,
      ownerEmail: row.owner_email,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      expiryDate: row.expiry_date ? new Date(row.expiry_date) : null,
      isActive: row.is_active,
      usageCount: row.usage_count || 0,
      totalEarnings: 0
    }));

    return { success: true, referralCodes };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const nukeAllReferralData = async () => {
  try {
    const supabase = getSupabase();

    // Delete all referral commissions
    await supabase.from('referral_commissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Delete related user transactions
    await supabase.from('user_transactions').delete().eq('method', 'referral_commission');
    await supabase.from('user_transactions').delete().eq('method', 'referral_balance');

    // Delete all referral codes
    const { data: codes } = await supabase.from('referral_codes').select('code');
    if (codes && codes.length > 0) {
      await supabase.from('referral_codes').delete().neq('code', '');
    }

    // Clear referral fields from users
    await supabase.from('users').update({
      referral_code: null,
      referral_code_used: false,
      referral_code_expiry_date: null
    }).neq('id', '00000000-0000-0000-0000-000000000000');

    return { success: true, deletedCodes: codes?.length || 0, deletedTransactions: 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getReferralUsageStats = async () => {
  try {
    const referralCodesResult = await getAllReferralCodes();
    if (!referralCodesResult.success) throw new Error(referralCodesResult.error);

    const referralCodes = referralCodesResult.referralCodes;
    const totalUsages = referralCodes.reduce((sum, code) => sum + (code.usageCount || 0), 0);
    const uniqueReferrers = new Set(referralCodes.map(code => code.ownerId)).size;

    return {
      success: true,
      stats: { totalUsages, uniqueReferrers, totalEarnings: 0, recentUsages: referralCodes.slice(0, 10) }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const processTransactionCommission = async (transactionData) => {
  try {
    const supabase = getSupabase();
    const { userId, amount, transactionId, planId, planName } = transactionData;

    // Check for duplicate
    const { data: existing } = await supabase
      .from('referral_commissions')
      .select('id, commission_amount, referrer_id, referral_code')
      .eq('transaction_id', transactionId)
      .eq('referred_user_id', userId)
      .limit(1);

    if (existing && existing.length > 0) {
      return {
        success: true, commission: existing[0].commission_amount,
        referrerId: existing[0].referrer_id, referralCode: existing[0].referral_code,
        commissionId: existing[0].id, message: 'Commission already processed', duplicate: true
      };
    }

    // Get user's referral code
    const { data: userData } = await supabase
      .from('users')
      .select('referred_by')
      .eq('id', userId)
      .single();

    const referralCodeUsed = userData?.referred_by;
    if (!referralCodeUsed || typeof referralCodeUsed !== 'string') {
      return { success: true, commission: 0, message: 'No referral code used' };
    }

    const { data: referralData } = await supabase
      .from('referral_codes')
      .select('owner_id')
      .eq('code', referralCodeUsed)
      .single();

    if (!referralData) return { success: false, error: 'Referral code not found' };

    const referrerId = referralData.owner_id;

    // Get commission percentage from settings
    const { data: settingsData } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'settings_general')
      .single();

    let commissionPercentage = settingsData?.value?.referral?.transactionCommissionPercentage;

    if (!commissionPercentage && commissionPercentage !== 0) {
      const { data: pricingData } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'pricing')
        .single();
      commissionPercentage = pricingData?.value?.transaction_commission_percentage;
    }

    if (!commissionPercentage && commissionPercentage !== 0) {
      return { success: false, error: 'Commission percentage not configured' };
    }

    const commissionAmount = (amount * commissionPercentage) / 100;

    // Create commission record
    const { data: commissionRecord, error: commError } = await supabase
      .from('referral_commissions')
      .insert({
        referrer_id: referrerId,
        referred_user_id: userId,
        referral_code: referralCodeUsed,
        transaction_id: transactionId,
        plan_id: planId,
        plan_name: planName,
        transaction_amount: amount,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        status: 'pending'
      })
      .select('id')
      .single();

    if (commError) throw commError;

    // Update referrer's total commissions
    const { data: referrerData } = await supabase
      .from('users')
      .select('total_commissions')
      .eq('id', referrerId)
      .single();

    await supabase.from('users').update({
      total_commissions: (referrerData?.total_commissions || 0) + commissionAmount,
      last_commission_date: new Date().toISOString()
    }).eq('id', referrerId);

    // Create transaction record
    await supabase.from('user_transactions').insert({
      user_id: referrerId,
      type: 'deposit',
      amount: commissionAmount,
      description: `Referral commission from ${referralCodeUsed}`,
      status: 'completed',
      method: 'referral_commission',
      referral_code: referralCodeUsed,
      referred_user_id: userId,
      transaction_id: transactionId,
      plan_id: planId,
      plan_name: planName
    });

    // Update referral code stats
    const { data: codeData } = await supabase
      .from('referral_codes')
      .select('total_transactions, total_transaction_value, total_commissions_earned')
      .eq('code', referralCodeUsed)
      .single();

    await supabase.from('referral_codes').update({
      total_transactions: (codeData?.total_transactions || 0) + 1,
      total_transaction_value: (codeData?.total_transaction_value || 0) + amount,
      total_commissions_earned: (codeData?.total_commissions_earned || 0) + commissionAmount,
      last_transaction_date: new Date().toISOString()
    }).eq('code', referralCodeUsed);

    return {
      success: true, commission: commissionAmount,
      commissionId: commissionRecord.id, referrerId, referralCode: referralCodeUsed
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getCommissionHistory = async (referrerId) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('referral_commissions')
      .select('*')
      .eq('referrer_id', referrerId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const commissions = data || [];
    const totalCommissions = commissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
    const pendingCommissions = commissions
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    return {
      success: true, commissions, totalCommissions,
      pendingCommissions, totalTransactions: commissions.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
