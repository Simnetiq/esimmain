import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  orderBy, 
  limit,
  startAfter,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

const BLACKLIST_COLLECTION = 'blacklist';

/**
 * Get all blacklist records with pagination
 */
export const getBlacklistRecords = async (pageSize = 50, lastDoc = null) => {
  try {
    let q = query(
      collection(db, BLACKLIST_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const records = [];
    
    snapshot.forEach((doc) => {
      records.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        blockedAt: doc.data().blockedAt?.toDate?.() || new Date(),
      });
    });

    return {
      records,
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: snapshot.docs.length === pageSize
    };
  } catch (error) {
    console.error('Error fetching blacklist records:', error);
    throw error;
  }
};

/**
 * Get blacklist records by user ID
 */
export const getBlacklistRecordsByUserId = async (userId) => {
  try {
    const q = query(
      collection(db, BLACKLIST_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const records = [];
    
    snapshot.forEach((doc) => {
      records.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        blockedAt: doc.data().blockedAt?.toDate?.() || new Date(),
      });
    });

    return records;
  } catch (error) {
    console.error('Error fetching blacklist records by user ID:', error);
    throw error;
  }
};

/**
 * Create a new blacklist record
 */
export const createBlacklistRecord = async (blacklistData) => {
  try {
    const docRef = await addDoc(collection(db, BLACKLIST_COLLECTION), {
      ...blacklistData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      blockedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating blacklist record:', error);
    throw error;
  }
};

/**
 * Update a blacklist record
 */
export const updateBlacklistRecord = async (recordId, updateData) => {
  try {
    const docRef = doc(db, BLACKLIST_COLLECTION, recordId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('Error updating blacklist record:', error);
    throw error;
  }
};

/**
 * Remove user from blacklist (unblock)
 */
export const removeFromBlacklist = async (recordId, reason = 'manual_removal') => {
  try {
    const docRef = doc(db, BLACKLIST_COLLECTION, recordId);
    await updateDoc(docRef, {
      status: 'removed',
      removedAt: serverTimestamp(),
      removalReason: reason,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('Error removing from blacklist:', error);
    throw error;
  }
};

/**
 * Delete a blacklist record permanently
 */
export const deleteBlacklistRecord = async (recordId) => {
  try {
    const docRef = doc(db, BLACKLIST_COLLECTION, recordId);
    await deleteDoc(docRef);

    return true;
  } catch (error) {
    console.error('Error deleting blacklist record:', error);
    throw error;
  }
};

/**
 * Get blacklist statistics
 */
export const getBlacklistStats = async () => {
  try {
    const q = query(collection(db, BLACKLIST_COLLECTION));
    const snapshot = await getDocs(q);
    
    const stats = {
      total: 0,
      active: 0,
      removed: 0,
      byReason: {},
      byStatus: {},
    };

    snapshot.forEach((doc) => {
      const data = doc.data();
      stats.total++;
      
      const status = data.status || 'active';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      
      if (status === 'active') {
        stats.active++;
      } else if (status === 'removed') {
        stats.removed++;
      }

      const reason = data.reason || 'unknown';
      stats.byReason[reason] = (stats.byReason[reason] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error fetching blacklist stats:', error);
    throw error;
  }
};

/**
 * Search blacklist records
 */
export const searchBlacklistRecords = async (searchTerm) => {
  try {
    const q = query(
      collection(db, BLACKLIST_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const records = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const searchableText = [
        data.userId,
        data.userEmail,
        data.reason,
        data.status,
        data.blockedFrom || '',
        JSON.stringify(data.additionalData || {})
      ].join(' ').toLowerCase();

      if (searchableText.includes(searchTerm.toLowerCase())) {
        records.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          blockedAt: data.blockedAt?.toDate?.() || new Date(),
        });
      }
    });

    return records;
  } catch (error) {
    console.error('Error searching blacklist records:', error);
    throw error;
  }
};
