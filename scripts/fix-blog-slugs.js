/**
 * Fix Blog Slugs Script
 * 
 * This script fixes slug formatting in blog_posts_translations collection.
 * English posts should have simple slugs (e.g., "hello-world")
 * Other languages should have language suffix (e.g., "hello-world-es")
 * 
 * Usage:
 * node scripts/fix-blog-slugs.js
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

// Generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim('-'); // Remove leading/trailing hyphens
}

async function fixBlogSlugs() {
  console.log('🔧 Starting blog slug fix...\n');

  try {
    // Get all translations
    const translationsSnapshot = await db.collection('blog_posts_translations').get();
    
    if (translationsSnapshot.empty) {
      console.log('❌ No translations found.');
      return;
    }

    console.log(`📚 Found ${translationsSnapshot.size} translations to check.\n`);

    let fixedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Process each translation
    for (const translationDoc of translationsSnapshot.docs) {
      const translationData = translationDoc.data();
      const translationId = translationDoc.id;
      const language = translationData.language;
      const currentSlug = translationData.slug;
      const title = translationData.title;

      try {
        console.log(`\n📝 Checking translation: ${translationId}`);
        console.log(`   Language: ${language}`);
        console.log(`   Title: ${title}`);
        console.log(`   Current slug: ${currentSlug}`);

        // Get the base post to find the baseSlug
        const postId = translationData.postId;
        const basePostDoc = await db.collection('blog_posts_base').doc(postId).get();
        
        if (!basePostDoc.exists()) {
          console.log(`   ❌ Base post not found for postId: ${postId}`);
          errors.push({ translationId, error: 'Base post not found' });
          continue;
        }

        const basePostData = basePostDoc.data();
        const baseSlug = basePostData.baseSlug;

        if (!baseSlug) {
          console.log(`   ⚠️  Base post has no baseSlug, generating from title`);
          const generatedBaseSlug = generateSlug(title);
          
          // Update base post with baseSlug
          await db.collection('blog_posts_base').doc(postId).update({
            baseSlug: generatedBaseSlug
          });
          
          console.log(`   ✨ Set baseSlug on base post: ${generatedBaseSlug}`);
        }

        // All translations should use the same baseSlug (language is in URL path)
        const correctSlug = baseSlug || generateSlug(title);

        console.log(`   Expected slug: ${correctSlug} (same for all languages)`);

        // Check if slug needs fixing
        if (currentSlug === correctSlug) {
          console.log(`   ✅ Slug is correct, skipping`);
          skippedCount++;
          continue;
        }

        // Update the slug to match baseSlug
        await db.collection('blog_posts_translations').doc(translationId).update({
          slug: correctSlug,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`   ✨ Updated slug: ${currentSlug} → ${correctSlug}`);
        fixedCount++;

      } catch (error) {
        console.error(`   ❌ Error fixing translation ${translationId}:`, error.message);
        errors.push({ translationId, error: error.message });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Slug Fix Summary');
    console.log('='.repeat(60));
    console.log(`✨ Fixed: ${fixedCount} slugs`);
    console.log(`✅ Skipped (already correct): ${skippedCount} slugs`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log(`📚 Total processed: ${translationsSnapshot.size} translations`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(({ translationId, error }) => {
        console.log(`   - Translation ${translationId}: ${error}`);
      });
    }

    console.log('\n✨ Slug fix complete!');
    console.log('\n💡 Test your blog posts now (all use same slug):');
    console.log('   - English: http://localhost:3000/blog/hello-world');
    console.log('   - Spanish: http://localhost:3000/es/blog/hello-world');
    console.log('   - Russian: http://localhost:3000/ru/blog/hello-world');
    console.log('   - French: http://localhost:3000/fr/blog/hello-world');

  } catch (error) {
    console.error('\n❌ Slug fix failed:', error);
    throw error;
  }
}

// Run fix
fixBlogSlugs()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

