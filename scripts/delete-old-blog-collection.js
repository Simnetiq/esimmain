/**
 * Helper Script: Delete Old Blog Posts Collection
 * 
 * This script deletes the old blog_posts collection after successful migration.
 * Only run this after verifying that the migration was successful!
 * 
 * Usage:
 * node scripts/delete-old-blog-collection.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');
const readline = require('readline');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function deleteOldBlogCollection() {
  console.log('⚠️  WARNING: This will permanently delete the old blog_posts collection!');
  console.log('   Make sure you have verified the migration was successful.\n');

  // Get count of documents
  const snapshot = await db.collection('blog_posts').get();
  console.log(`📚 Found ${snapshot.size} documents in blog_posts collection.\n`);

  if (snapshot.empty) {
    console.log('✅ Collection is already empty or does not exist.');
    rl.close();
    return;
  }

  // Ask for confirmation
  const answer = await askQuestion('Are you sure you want to delete the old blog_posts collection? (yes/no): ');

  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Deletion cancelled.');
    rl.close();
    return;
  }

  // Double confirmation
  const doubleCheck = await askQuestion('Type "DELETE" to confirm: ');

  if (doubleCheck !== 'DELETE') {
    console.log('❌ Deletion cancelled.');
    rl.close();
    return;
  }

  console.log('\n🗑️  Deleting old blog_posts collection...\n');

  try {
    // Delete in batches
    const batchSize = 100;
    let deletedCount = 0;

    while (true) {
      const snapshot = await db.collection('blog_posts').limit(batchSize).get();
      
      if (snapshot.empty) {
        break;
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      deletedCount += snapshot.size;
      console.log(`   Deleted ${deletedCount} documents...`);
    }

    console.log('\n✅ Successfully deleted old blog_posts collection!');
    console.log(`   Total documents deleted: ${deletedCount}`);

  } catch (error) {
    console.error('\n❌ Error deleting collection:', error);
    throw error;
  } finally {
    rl.close();
  }
}

// Run deletion
deleteOldBlogCollection()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });


