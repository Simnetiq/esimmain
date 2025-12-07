import { db } from '../firebase/config';
import { collection, doc, getDoc, setDoc, updateDoc, query, where, orderBy, limit, getDocs, serverTimestamp, increment, writeBatch, addDoc } from 'firebase/firestore';
import { configService } from './configService';

// Process referral when a user signs up with a referral code
export const processReferralUsage = async (referralCode, newUserId) => {
  try {
    
    // Check if user has already used a referral code
    const userDoc = await getDoc(doc(db, 'users', newUserId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.referralCodeUsed) {
        
        // Log attempted duplicate usage
        await configService.logPromocodeUsage(referralCode, newUserId, 'duplicate_attempt', {
          message: 'User attempted to use a second referral code',
          ip: userData.lastLoginIP || null
        });
        
        return { success: false, error: 'You have already used a referral code' };
      }
    }
    
    // Get the referral code document
    const referralDoc = await getDoc(doc(db, 'referralCodes', referralCode));
    
    if (!referralDoc.exists()) {
      
      // Log invalid code attempt
      await configService.logPromocodeUsage(referralCode, newUserId, 'invalid_code', {
        message: 'User attempted to use non-existent referral code',
        ip: userDoc.exists() ? userDoc.data().lastLoginIP || null : null
      });
      
      return { success: false, error: 'Referral code not found' };
    }
    
    const referralData = referralDoc.data();
    const referrerId = referralData.ownerId;
    
    if (!referrerId) {
      return { success: false, error: 'Invalid referral code' };
    }
    
    // Check if code is active
    if (!referralData.isActive) {
      
      // Log inactive code attempt
      await configService.logPromocodeUsage(referralCode, newUserId, 'inactive_code', {
        message: 'User attempted to use inactive referral code',
        ip: userDoc.exists() ? userDoc.data().lastLoginIP || null : null
      });
      
      return { success: false, error: 'Referral code is not active' };
    }
    
    // Check if code has expired
    const expiryDate = referralData.expiryDate;
    if (expiryDate && expiryDate.toDate() < new Date()) {
      
      // Log expired code attempt
      await configService.logPromocodeUsage(referralCode, newUserId, 'expired_code', {
        message: 'User attempted to use expired referral code',
        ip: userDoc.exists() ? userDoc.data().lastLoginIP || null : null
      });
      
      return { success: false, error: 'Referral code has expired' };
    }
    
    // Don't allow self-referral
    if (referrerId === newUserId) {
        return { success: false, error: 'Self-referral not allowed' };
    }
    
    // Use a transaction to ensure atomicity
    const batch = writeBatch(db);
    
    
    // Update referral code stats
    const referralCodeRef = doc(db, 'referralCodes', referralCode);
    batch.update(referralCodeRef, {
      usageCount: increment(1),
      lastUsed: serverTimestamp(),
    });
    
    // Note: No transaction is created for referral usage - only when the referred user makes a purchase
    
    await batch.commit();
    
    // Log successful referral usage
    await configService.logPromocodeUsage(referralCode, newUserId, 'used', {
      message: 'Referral code successfully applied',
      referrerId: referrerId,
      ip: userDoc.exists() ? userDoc.data().lastLoginIP || null : null
    });
    
    return { success: true };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get referral statistics for a user
export const getReferralStats = async (userId) => {
  try {
    // Get user's referral code
    const userDoc = await getDoc(doc(db, 'users', userId));
    const referralCode = userDoc.data()?.referralCode;
    
    if (!referralCode) {
      return {
        referralCode: null,
        usageCount: 0,
        recentUsages: [],
        totalEarnings: 0,
        expiryDate: null,
      };
    }
    
    // Get referral code stats
    const referralDoc = await getDoc(doc(db, 'referralCodes', referralCode));
    
    if (!referralDoc.exists()) {
      return {
        referralCode: referralCode,
        usageCount: 0,
        recentUsages: [],
        totalEarnings: 0,
        expiryDate: null,
      };
    }
    
    const referralData = referralDoc.data();
    
    // Get ALL referral_commission transactions to calculate total earnings
    const earningsSnapshot = await getDocs(
      query(
        collection(db, 'users', userId, 'transactions'),
        where('type', '==', 'deposit'),
        where('method', '==', 'referral_commission')
      )
    );
    
    // Calculate total earnings from all commission transactions
    let totalEarnings = 0;
    earningsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const amount = data.amount || 0;
      totalEarnings += amount;
    });
    
    // Get ALL withdrawal transactions (referral_balance usage)
    const withdrawalsSnapshot = await getDocs(
      query(
        collection(db, 'users', userId, 'transactions'),
        where('method', '==', 'referral_balance')
      )
    );
    
    // Calculate total withdrawals
    let totalWithdrawals = 0;
    withdrawalsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const amount = Math.abs(data.amount || 0); // Make sure it's positive for subtraction
      totalWithdrawals += amount;
    });
    
    // Available balance = Total earnings - Total withdrawals (like mobile app)
    const availableBalance = totalEarnings - totalWithdrawals;
    
    // Get recent usages for display (limit to 10)
    const recentUsages = earningsSnapshot.docs.slice(0, 10).map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));
    
    return {
      referralCode: referralCode,
      usageCount: referralData.usageCount || 0,
      recentUsages: recentUsages,
      totalEarnings: availableBalance, // Use available balance (earnings - withdrawals) like mobile app
      expiryDate: referralData.expiryDate?.toDate() || null,
      isActive: referralData.isActive || false,
    };
    
  } catch (error) {
    return {
      referralCode: null,
      usageCount: 0,
      recentUsages: [],
      totalEarnings: 0,
      expiryDate: null,
      error: error.message,
    };
  }
};

// Check if a referral code is valid
export const isValidReferralCode = async (code) => {
  try {
    const docRef = await getDoc(doc(db, 'referralCodes', code.toUpperCase()));
    
    if (!docRef.exists()) return false;
    
    const data = docRef.data();
    const isActive = data.isActive || false;
    
    // Check if code has expired
    const expiryDate = data.expiryDate;
    const isNotExpired = !expiryDate || expiryDate.toDate() > new Date();
    
    return isActive && isNotExpired;
  } catch (error) {
    return false;
  }
};

// Check if user has already used a referral code
export const hasUserUsedReferralCode = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    return userData.referralCodeUsed || false;
  } catch (error) {
    return false;
  }
};

// Generate a unique referral code
export const generateUniqueReferralCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isUnique = false;
  let attempts = 0;
  
  do {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[(Date.now() + i + attempts) % chars.length];
    }
    
    // Check if code already exists
    const existing = await getDoc(doc(db, 'referralCodes', code));
    isUnique = !existing.exists();
    attempts++;
    
    if (attempts > 10) {
      // Fallback to timestamp-based code
      code = `REF${Date.now() % 100000000}`;
      break;
    }
  } while (!isUnique);
  
  return code;
};

// Create a new referral code for a user
export const createReferralCode = async (userId, userEmail, customCode = null) => {
  try {
    let referralCode;
    
    if (customCode) {
      // Use custom code if provided
      referralCode = customCode.toUpperCase().replace(/[^A-Z0-9]/g, ''); // Clean and uppercase
      
      // Check if custom code already exists
      const existing = await getDoc(doc(db, 'referralCodes', referralCode));
      if (existing.exists()) {
        return { success: false, error: 'Referral code already exists. Please choose a different name.' };
      }
    } else {
      // Generate random code if no custom code provided
      referralCode = await generateUniqueReferralCode();
    }
    
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 2); // Exactly 2 months
    
    // Create referral code document
    await setDoc(doc(db, 'referralCodes', referralCode), {
      code: referralCode,
      ownerId: userId,
      ownerEmail: userEmail,
      createdAt: serverTimestamp(),
      expiryDate: expiryDate,
      isActive: true,
      usageCount: 0,
      totalEarnings: 0.0,
    });
    
    // Update user document with new code
    await updateDoc(doc(db, 'users', userId), {
      referralCode: referralCode,
      referralCodeExpiryDate: expiryDate,
      updatedAt: serverTimestamp(),
    });
    
    return { success: true, referralCode, expiryDate };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Update referral earnings (called when referred user makes a purchase)
export const updateReferralEarnings = async (referralCode, amount = 1.0) => {
  try {
    const referralCodeRef = doc(db, 'referralCodes', referralCode);
    await updateDoc(referralCodeRef, {
      totalEarnings: increment(amount),
      lastEarning: serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get all referral codes (for admin)
export const getAllReferralCodes = async () => {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'referralCodes'),
        orderBy('createdAt', 'desc')
      )
    );
    
    const referralCodes = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const ownerId = data.ownerId;
        
        // Calculate usage count from transactions (no earnings since no monetary reward)
        let actualUsageCount = 0;
        if (ownerId) {
          try {
            const usageSnapshot = await getDocs(
              query(
                collection(db, 'users', ownerId, 'transactions'),
                where('type', '==', 'referral_usage'),
                where('method', '==', 'referral')
              )
            );
            
            
            usageSnapshot.docs.forEach((transactionDoc) => {
              const transactionData = transactionDoc.data();
              // Only count transactions that match this specific referral code
              if (transactionData.referralCode === doc.id) {
                actualUsageCount += 1;
              }
            });
          } catch (error) {
          }
        }
        
        
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          expiryDate: data.expiryDate?.toDate() || null,
          totalEarnings: 0, // No monetary rewards
          usageCount: actualUsageCount, // Use actual count from transactions
        };
      })
    );
    
    return { success: true, referralCodes };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Nuke all referral data (for admin - completely delete all referral records)
export const nukeAllReferralData = async () => {
  try {
    const referralCodesResult = await getAllReferralCodes();
    if (!referralCodesResult.success) {
      throw new Error(referralCodesResult.error);
    }
    
    const referralCodes = referralCodesResult.referralCodes;
    const batch = writeBatch(db);
    let deletedCodes = 0;
    let deletedTransactions = 0;
    
    for (const code of referralCodes) {
      const ownerId = code.ownerId;
      
      // Delete all referral transactions for this code
      if (ownerId) {
        try {
          const earningsSnapshot = await getDocs(
            query(
              collection(db, 'users', ownerId, 'transactions'),
              where('type', '==', 'deposit'),
              where('method', '==', 'referral'),
              where('referralCode', '==', code.id)
            )
          );
          
          earningsSnapshot.docs.forEach(transactionDoc => {
            batch.delete(transactionDoc.ref);
            deletedTransactions++;
          });
        } catch (error) {
        }
      }
      
      // Delete the referral code document itself
      const referralCodeRef = doc(db, 'referralCodes', code.id);
      batch.delete(referralCodeRef);
      deletedCodes++;
      
    }
    
    // Also clear referral codes from user documents
    const usersSnapshot = await getDocs(collection(db, 'users'));
    usersSnapshot.docs.forEach(userDoc => {
      const userData = userDoc.data();
      if (userData.referralCode || userData.referralCodeUsed) {
        batch.update(userDoc.ref, {
          referralCode: null,
          referralCodeUsed: false,
          referralCodeExpiryDate: null,
        });
      }
    });
    
    if (deletedCodes > 0) {
      await batch.commit();
    }
    
    return { success: true, deletedCodes, deletedTransactions };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get referral usage statistics (for admin)
export const getReferralUsageStats = async () => {
  try {
    // Get all referral codes to calculate stats
    const referralCodesResult = await getAllReferralCodes();
    if (!referralCodesResult.success) {
      throw new Error(referralCodesResult.error);
    }
    
    const referralCodes = referralCodesResult.referralCodes;
    
    // Calculate statistics
    const totalUsages = referralCodes.reduce((sum, code) => sum + (code.usageCount || 0), 0);
    const uniqueReferrers = new Set(referralCodes.map(code => code.ownerId)).size;
    const totalEarnings = 0; // No monetary rewards in referral system
    
    return {
      success: true,
      stats: {
        totalUsages,
        uniqueReferrers,
        totalEarnings,
        recentUsages: referralCodes.slice(0, 10), // Last 10 codes
      }
    };
  } catch (error) {
        return { success: false, error: error.message };
  }
};

// Process transaction commission for referral code owners
export const processTransactionCommission = async (transactionData) => {
  try {
    
    const { userId, amount, transactionId, planId, planName } = transactionData;
    
    // Check if commission has already been processed for this transaction
    const existingCommissionQuery = query(
      collection(db, 'referralCommissions'),
      where('transactionId', '==', transactionId),
      where('referredUserId', '==', userId)
    );
    const existingCommissionSnapshot = await getDocs(existingCommissionQuery);
    
    if (!existingCommissionSnapshot.empty) {
      const existingCommission = existingCommissionSnapshot.docs[0].data();
      
      return { 
        success: true, 
        commission: existingCommission.commissionAmount,
        referrerId: existingCommission.referrerId,
        referralCode: existingCommission.referralCode,
        commissionId: existingCommissionSnapshot.docs[0].id,
        message: 'Commission already processed',
        duplicate: true
      };
    }
    
    // Get user data to find their referral code owner
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data();
    
    // The actual referral code is stored in 'referredBy' field
    // 'referralCodeUsed' is just a boolean flag
    const referralCodeUsed = userData.referredBy;
    
    if (!referralCodeUsed || typeof referralCodeUsed !== 'string') {
      return { success: true, commission: 0, message: 'No referral code used' };
    }
    
    // Get referral code owner
    const referralDoc = await getDoc(doc(db, 'referralCodes', referralCodeUsed));
    if (!referralDoc.exists()) {
      return { success: false, error: 'Referral code not found' };
    }
    
    const referralData = referralDoc.data();
    const referrerId = referralData.ownerId;
    
    // Get commission percentage from settings - try both paths
    let commissionPercentage;
    
    // First try settings/general (new path)
    const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
    if (settingsDoc.exists()) {
      const settings = settingsDoc.data();
      commissionPercentage = settings.referral?.transactionCommissionPercentage;
        }
    
    // If not found, try config/pricing (old path)
    let pricingDoc;
    if (!commissionPercentage && commissionPercentage !== 0) {
      pricingDoc = await getDoc(doc(db, 'config', 'pricing'));
      if (pricingDoc.exists()) {
        const pricingData = pricingDoc.data();
        commissionPercentage = pricingData.transaction_commission_percentage;
      }
    }
    
    if (!commissionPercentage && commissionPercentage !== 0) {
      return { success: false, error: 'Commission percentage not configured' };
    }
    
  
    
    // Calculate commission amount
    const commissionAmount = (amount * commissionPercentage) / 100;
    
    // Create commission record
    const commissionData = {
      referrerId,
      referredUserId: userId,
      referralCode: referralCodeUsed,
      transactionId,
      planId,
      planName,
      transactionAmount: amount,
      commissionPercentage,
      commissionAmount,
      status: 'pending', // pending, paid, cancelled
      createdAt: serverTimestamp(),
      processedAt: null
    };
    
    const commissionRef = await addDoc(collection(db, 'referralCommissions'), commissionData);
    
    // Update referrer's total earnings
    const referrerRef = doc(db, 'users', referrerId);
    await updateDoc(referrerRef, {
      totalCommissions: increment(commissionAmount),
      lastCommissionDate: serverTimestamp()
    });
    
    // Create transaction record in referrer's transactions subcollection
    const referrerTransactionRef = doc(collection(db, 'users', referrerId, 'transactions'));
    await setDoc(referrerTransactionRef, {
      type: 'deposit', // Positive transaction
      amount: commissionAmount,
      description: `Referral commission from ${referralCodeUsed}`,
      status: 'completed',
      method: 'referral_commission',
      referralCode: referralCodeUsed,
      referredUserId: userId,
      transactionId: transactionId,
      planId: planId,
      planName: planName,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    
    // Update referral code usage stats
    await updateDoc(doc(db, 'referralCodes', referralCodeUsed), {
      totalTransactions: increment(1),
      totalTransactionValue: increment(amount),
      totalCommissionsEarned: increment(commissionAmount),
      lastTransactionDate: serverTimestamp()
    });
    
    return {
      success: true,
      commission: commissionAmount,
      commissionId: commissionRef.id,
      referrerId,
      referralCode: referralCodeUsed
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get commission history for a referrer
export const getCommissionHistory = async (referrerId) => {
  try {
    
    const commissionsQuery = query(
      collection(db, 'referralCommissions'),
      where('referrerId', '==', referrerId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const commissionsSnapshot = await getDocs(commissionsQuery);
    const commissions = commissionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Calculate totals
    const totalCommissions = commissions.reduce((sum, commission) => sum + commission.commissionAmount, 0);
    const pendingCommissions = commissions
      .filter(c => c.status === 'pending')
      .reduce((sum, commission) => sum + commission.commissionAmount, 0);
    
    return {
      success: true,
      commissions,
      totalCommissions,
      pendingCommissions,
      totalTransactions: commissions.length
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
};
