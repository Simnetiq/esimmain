#!/usr/bin/env node

/**
 * Script to fix blog post ordering by ensuring all published posts have a publishedAt field
 * This script should be run once to migrate existing data
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, serverTimestamp } = require('firebase/firestore');

// Initialize Firebase (you may need to adjust this based on your config)
const firebaseConfig = {
  // Add your Firebase config here or import from your config file
  // This should match your existing Firebase configuration
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixMissingPublishedAt() {
  try {
    
    const q = query(
      collection(db, 'blog_posts'),
      where('status', '==', 'published'),
      where('publishedAt', '==', null)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.docs.length === 0) {
      return;
    }
    
    const batch = [];
    
    snapshot.docs.forEach(doc => {
      const postData = doc.data();
      
      // Set publishedAt to createdAt if it exists, otherwise use current timestamp
      const publishedAt = postData.createdAt || serverTimestamp();
      batch.push(updateDoc(doc.ref, { publishedAt }));
    });
    
    if (batch.length > 0) {
      await Promise.all(batch);
    }
    
  } catch (error) {
    process.exit(1);
  }
}

// Run the fix
fixMissingPublishedAt()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
  });
