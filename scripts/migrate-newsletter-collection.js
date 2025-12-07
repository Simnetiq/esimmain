/**
 * Migration script to move newsletter subscriptions from 'newsletter' to 'newsletter_subscriptions' collection
 * Run this script once to migrate existing data and ensure consistency
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where,
  serverTimestamp 
} = require('firebase/firestore');

// Firebase configuration - you may need to adjust this based on your setup
const firebaseConfig = {
  // Add your Firebase config here
  // This should match your existing Firebase configuration
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateNewsletterSubscriptions() {
  
  try {
    // Get all documents from the old 'newsletter' collection
    const oldNewsletterRef = collection(db, 'newsletter');
    const oldNewsletterSnapshot = await getDocs(oldNewsletterRef);
    
    if (oldNewsletterSnapshot.size === 0) {
      return;
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    // Process each document
    for (const doc of oldNewsletterSnapshot.docs) {
      const oldData = doc.data();
      const email = oldData.email;
      
      if (!email) {
        skippedCount++;
        continue;
      }
      
      // Check if email already exists in new collection
      const newCollectionRef = collection(db, 'newsletter_subscriptions');
      const existingQuery = query(newCollectionRef, where('email', '==', email));
      const existingSnapshot = await getDocs(existingQuery);
      
      if (existingSnapshot.size > 0) {
        skippedCount++;
        continue;
      }
      
      // Create new document in newsletter_subscriptions collection
      const newDocumentData = {
        email: email,
        status: 'active',
        source: 'migration', // Mark as migrated
        subscribedAt: oldData.timestamp || serverTimestamp(),
        updatedAt: serverTimestamp(),
        unsubscribedAt: null,
        tags: []
      };
      
      await addDoc(newCollectionRef, newDocumentData);
      migratedCount++;
    }
    
  } catch {
    throw error;
  }
}

async function deleteOldNewsletterCollection() {
  
  try {
    const oldNewsletterRef = collection(db, 'newsletter');
    const oldNewsletterSnapshot = await getDocs(oldNewsletterRef);
    
    
    // Note: You'll need to delete documents individually
    // This is a placeholder - you may want to use Firebase Admin SDK for bulk deletion
  } catch {
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateNewsletterSubscriptions()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      process.exit(1);
    });
}

module.exports = {
  migrateNewsletterSubscriptions,
  deleteOldNewsletterCollection
};
