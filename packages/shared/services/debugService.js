import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

// Debug function to check referral transactions
export const debugReferralTransactions = async (userId) => {
  try {
    
    // Get user profile
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    
    // Get user's referral code
    const referralCode = userData?.referralCode;
    
    // Get referral code document
    if (referralCode) {
      const referralDoc = await getDoc(doc(db, 'referralCodes', referralCode));
      const referralData = referralDoc.data();
    }
    
    // Get all transactions for this user
    const transactionsSnapshot = await getDocs(
      collection(db, 'users', userId, 'transactions')
    );
    
    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    
    // Filter referral transactions
    const referralTransactions = transactions.filter(t => 
      t.method === 'referral' || 
      t.description?.includes('Referral earnings') ||
      t.description?.includes('referral')
    );
    
    
    // Get users who used this referral code
    if (referralCode) {
      const usersSnapshot = await getDocs(
        query(
          collection(db, 'users'),
          where('referredBy', '==', referralCode)
        )
      );
      
      const referredUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    }
    
    return {
      userProfile: userData,
      referralCode: referralCode,
      referralData: referralCode ? (await getDoc(doc(db, 'referralCodes', referralCode))).data() : null,
      allTransactions: transactions,
      referralTransactions: referralTransactions,
      referredUsers: referralCode ? (await getDocs(query(collection(db, 'users'), where('referredBy', '==', referralCode)))).docs.map(doc => ({ id: doc.id, ...doc.data() })) : []
    };
    
  } catch (error) {
    return { error: error.message };
  }
};

// Debug function to check all referral codes and their usage
export const debugAllReferralCodes = async () => {
  try {
    
    // Get all referral codes
    const referralCodesSnapshot = await getDocs(collection(db, 'referralCodes'));
    const referralCodes = referralCodesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    
    // Get all users who used referral codes
    const usersSnapshot = await getDocs(
      query(
        collection(db, 'users'),
        where('referredBy', '!=', null)
      )
    );
    
    const referredUsers = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    
    return {
      referralCodes: referralCodes,
      referredUsers: referredUsers
    };
    
  } catch (error) {
    return { error: error.message };
  }
};
