'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { getReferralStats, createReferralCode } from '@esim/shared/services/referralService';
import { getSupabase } from '@esim/shared/lib/supabase';
import toast from 'react-hot-toast';
import { formatPrice } from '@esim/shared/utils/priceUtils';
// Affiliate Components
import AffiliateHeader from '../../src/components/affiliate/AffiliateHeader';
import AffiliateStats from '../../src/components/affiliate/AffiliateStats';
import WithdrawalSection from '../../src/components/affiliate/WithdrawalSection';
import HowItWorks from '../../src/components/affiliate/HowItWorks';

const AffiliateProgramPage = () => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [referralStats, setReferralStats] = useState({
    referralCode: null,
    usageCount: 0,
    totalEarnings: 0,
    isActive: false
  });
  const [loadingReferralStats, setLoadingReferralStats] = useState(false);
  const [hasBankAccount, setHasBankAccount] = useState(false);
  const [checkingBankAccount, setCheckingBankAccount] = useState(false);

  const loadReferralStats = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoadingReferralStats(true);
      const stats = await getReferralStats(currentUser.id);

      if (stats.referralCode) {
        setReferralStats(stats);
      } else {
        // Create referral code if user doesn't have one
        const result = await createReferralCode(currentUser.id, currentUser.email);
        if (result.success) {
          // Reload stats after creating code
          const newStats = await getReferralStats(currentUser.id);
          setReferralStats(newStats);
        }
      }
    } catch (error) {
      console.error('Error loading referral stats:', error);
    } finally {
      setLoadingReferralStats(false);
    }
  }, [currentUser]);

  const checkBankAccount = useCallback(async () => {
    if (!currentUser) return;

    try {
      setCheckingBankAccount(true);
      const supabase = getSupabase();
      const { data: userData } = await supabase
        .from('users')
        .select('bank_account')
        .eq('id', currentUser.id)
        .single();
      
      if (userData?.bank_account) {
        setHasBankAccount(true);
      } else {
        setHasBankAccount(false);
      }
    } catch (error) {
      console.error('Error checking bank account:', error);
      setHasBankAccount(false);
    } finally {
      setCheckingBankAccount(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadReferralStats();
      checkBankAccount();
    }
  }, [currentUser, loadReferralStats, checkBankAccount]);


  const handleWithdrawClick = async () => {
    if (hasBankAccount) {
      // User has bank account - mark their referral transactions as paid
      try {
        const supabase = getSupabase();
        
        // Get user's unpaid referral transactions
        const { data: transactions } = await supabase
          .from('user_transactions')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('type', 'deposit')
          .eq('method', 'referral_commission')
          .eq('status', 'completed');

        if (!transactions || transactions.length === 0) {
          toast('No pending referral earnings to withdraw', { icon: 'ℹ️', duration: 3000 });
          return;
        }

        const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const minimumWithdrawal = 50;

        if (totalAmount < minimumWithdrawal) {
          toast.error(`Minimum withdrawal amount is ${formatPrice(minimumWithdrawal)}. You have ${formatPrice(totalAmount)} available.`, { duration: 5000 });
          return;
        }

        // Update transactions to mark as paid
        const txIds = transactions.map(t => t.id);
        const now = new Date().toISOString();
        
        await supabase
          .from('user_transactions')
          .update({ status: 'paid', paid_at: now, paid_by: 'user_request' })
          .in('id', txIds);

        const updatedCount = txIds.length;
        
        // Create a withdrawal record
        await supabase.from('user_transactions').insert({
          user_id: currentUser.id,
          type: 'purchase',
          amount: totalAmount,
          description: `Withdrawal of ${updatedCount} referral earnings`,
          status: 'completed',
          method: 'withdrawal',
          withdrawal_date: now,
          transaction_count: updatedCount,
          created_at: now,
        });
        
        toast.success(`Successfully withdrew ${formatPrice(totalAmount)} from ${updatedCount} referral earnings!`);
        
        // Reload referral stats to reflect changes
        loadReferralStats();
        
      } catch (error) {
        console.error('Error processing withdrawal:', error);
        toast.error('Failed to process withdrawal');
      }
    } else {
      // User doesn't have bank account - redirect to add bank account
      router.push('/add-bank-account');
    }
  };

  const handleEarningsClick = () => {
    router.push('/transactions');
  };


  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header Section */}
      <section className="bg-[var(--bg-primary)] py-8 mt-10">
        <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
          <div className="relative">
            <div className="absolute inset-px rounded-xl bg-[var(--bg-primary)]"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl border-2 border-[var(--card-border)]/50 shadow-xl shadow-[var(--card-border)]/50">
              <div className="px-8 pt-6 pb-6">
                <AffiliateHeader onBack={() => router.back()} />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <AffiliateStats 
        referralStats={referralStats}
        loadingReferralStats={loadingReferralStats}
        onEarningsClick={handleEarningsClick}
      />

      {/* Withdrawal Section */}
      <WithdrawalSection 
        hasBankAccount={hasBankAccount}
        checkingBankAccount={checkingBankAccount}
        referralStats={referralStats}
        onWithdrawClick={handleWithdrawClick}
      />

      {/* How It Works */}
      <HowItWorks />

      {/* Spacing after content */}
      <div className="h-20"></div>
    </div>
  );
};

export default AffiliateProgramPage;
