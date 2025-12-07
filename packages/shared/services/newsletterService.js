import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Newsletter subscription data structure
const createNewsletterSubscription = (subscriptionData) => {
  return {
    email: subscriptionData.email || '',
    status: 'active', // active, unsubscribed, bounced
    source: subscriptionData.source || 'website', // website, admin, api
    subscribedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    unsubscribedAt: null,
    tags: subscriptionData.tags || [],
    notes: subscriptionData.notes || ''
  };
};

// Subscribe to newsletter
export const subscribeToNewsletter = async (subscriptionData) => {
  try {
    // Check if email already exists
    const existingQuery = query(
      collection(db, 'newsletter_subscriptions'),
      where('email', '==', subscriptionData.email)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      // Update existing subscription to active if it was unsubscribed
      const existingDoc = existingSnapshot.docs[0];
      const existingData = existingDoc.data();
      
      if (existingData.status === 'unsubscribed') {
        await updateDoc(doc(db, 'newsletter_subscriptions', existingDoc.id), {
          status: 'active',
          updatedAt: serverTimestamp(),
          unsubscribedAt: null,
          source: subscriptionData.source || 'website'
        });
        return { success: true, id: existingDoc.id, message: 'Email reactivated' };
      } else {
        return { success: false, message: 'Email already subscribed' };
      }
    }
    
    // Create new subscription
    const subscription = createNewsletterSubscription(subscriptionData);
    const docRef = await addDoc(collection(db, 'newsletter_subscriptions'), subscription);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    throw error;
  }
};

// Get all newsletter subscriptions
export const getNewsletterSubscriptions = async () => {
  try {
    const q = query(
      collection(db, 'newsletter_subscriptions'),
      orderBy('subscribedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting newsletter subscriptions:', error);
    throw error;
  }
};

// Get subscriptions by status
export const getNewsletterSubscriptionsByStatus = async (status) => {
  try {
    const q = query(
      collection(db, 'newsletter_subscriptions'),
      where('status', '==', status),
      orderBy('subscribedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting newsletter subscriptions by status:', error);
    throw error;
  }
};

// Update subscription status
export const updateNewsletterSubscriptionStatus = async (subscriptionId, status, notes = '') => {
  try {
    const subscriptionRef = doc(db, 'newsletter_subscriptions', subscriptionId);
    const updateData = {
      status,
      updatedAt: serverTimestamp()
    };
    
    if (status === 'unsubscribed') {
      updateData.unsubscribedAt = serverTimestamp();
    }
    
    if (notes) {
      updateData.notes = notes;
    }
    
    await updateDoc(subscriptionRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating newsletter subscription status:', error);
    throw error;
  }
};

// Delete newsletter subscription
export const deleteNewsletterSubscription = async (subscriptionId) => {
  try {
    await deleteDoc(doc(db, 'newsletter_subscriptions', subscriptionId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting newsletter subscription:', error);
    throw error;
  }
};

// Unsubscribe from newsletter
export const unsubscribeFromNewsletter = async (email) => {
  try {
    const q = query(
      collection(db, 'newsletter_subscriptions'),
      where('email', '==', email)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, message: 'Email not found' };
    }
    
    const doc = querySnapshot.docs[0];
    await updateNewsletterSubscriptionStatus(doc.id, 'unsubscribed');
    return { success: true };
  } catch (error) {
    console.error('Error unsubscribing from newsletter:', error);
    throw error;
  }
};

// Get subscription statistics
export const getNewsletterStats = async () => {
  try {
    const allSubscriptions = await getNewsletterSubscriptions();
    
    const stats = {
      total: allSubscriptions.length,
      active: allSubscriptions.filter(sub => sub.status === 'active').length,
      unsubscribed: allSubscriptions.filter(sub => sub.status === 'unsubscribed').length,
      bounced: allSubscriptions.filter(sub => sub.status === 'bounced').length
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting newsletter stats:', error);
    throw error;
  }
};
