/**
 * Check Blog Data Script
 * 
 * This script shows you what's actually in your blog collections
 * to help diagnose issues.
 * 
 * Usage:
 * node scripts/check-blog-data.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkBlogData() {
  console.log('🔍 Checking blog data...\n');  // eslint-disable-line no-console

  try {
    // Check blog_posts_base
    console.log('📦 Checking blog_posts_base collection...'); // eslint-disable-line no-console
    const baseSnapshot = await db.collection('blog_posts_base').limit(5).get();
    
    if (baseSnapshot.empty) {
      console.log('❌ No documents in blog_posts_base!'); // eslint-disable-line no-console
      console.log('   You need to run the migration script first.'); // eslint-disable-line no-console
    } else {
      console.log(`✅ Found ${baseSnapshot.size} base posts (showing first 5):\n`);
      baseSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   ID: ${doc.id}`);
        console.log(`   Author: ${data.author}`);
        console.log(`   Category: ${data.category}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Base Slug: ${data.baseSlug}`);
        console.log(`   Featured Image: ${data.featuredImage ? 'Yes' : 'No'}`);
        console.log('');
      });
    }

    // Check blog_posts_translations
    console.log('\n📖 Checking blog_posts_translations collection...');
    const translationsSnapshot = await db.collection('blog_posts_translations').limit(10).get();
    
    if (translationsSnapshot.empty) {
      console.log('❌ No documents in blog_posts_translations!');
      console.log('   You need to run the migration script first.');
    } else {
      console.log(`✅ Found ${translationsSnapshot.size} translations (showing first 10):\n`);
      translationsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   ID: ${doc.id}`);
        console.log(`   Post ID: ${data.postId}`);
        console.log(`   Language: ${data.language}`);
        console.log(`   Title: ${data.title}`);
        console.log(`   Slug: ${data.slug}`);
        console.log(`   Content length: ${data.content ? data.content.length : 0} chars`);
        console.log('');
      });
    }

    // Check for a specific slug
    console.log('\n🔎 Testing slug lookup...');
    const testSlug = 'hello-world'; // Change this to your actual slug
    console.log(`   Looking for slug: "${testSlug}"`);
    
    const slugQuery = await db.collection('blog_posts_translations')
      .where('slug', '==', testSlug)
      .limit(1)
      .get();
    
    if (slugQuery.empty) {
      console.log(`   ❌ No translation found with slug "${testSlug}"`);
      console.log('   \n   Available slugs:');
      const allSlugs = await db.collection('blog_posts_translations').limit(20).get();
      allSlugs.docs.forEach(doc => {
        const data = doc.data();
        console.log(`      - ${data.slug} (${data.language})`);
      });
    } else {
      const doc = slugQuery.docs[0];
      const data = doc.data();
      console.log(`   ✅ Found translation!`);
      console.log(`      Translation ID: ${doc.id}`);
      console.log(`      Post ID: ${data.postId}`);
      console.log(`      Language: ${data.language}`);
      console.log(`      Title: ${data.title}`);
      
      // Check if base post exists
      const baseDoc = await db.collection('blog_posts_base').doc(data.postId).get();
      if (baseDoc.exists()) {
        console.log(`      ✅ Base post exists`);
        const baseData = baseDoc.data();
        console.log(`         Author: ${baseData.author}`);
        console.log(`         Category: ${baseData.category}`);
        console.log(`         Status: ${baseData.status}`);
      } else {
        console.log(`      ❌ Base post NOT found! This is a problem.`);
      }
    }

    console.log('\n✨ Data check complete!');

  } catch (error) {
    console.error('\n❌ Data check failed:', error);
    throw error;
  }
}

// Run check
checkBlogData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });


