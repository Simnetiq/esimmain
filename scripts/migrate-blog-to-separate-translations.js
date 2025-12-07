/**
 * Migration Script: Convert Blog Posts to Separate Translation Documents
 * 
 * This script migrates blog posts from the old structure (single document with embedded translations)
 * to the new structure (separate base document + individual translation documents).
 * 
 * Old Structure:
 * - Collection: blog_posts
 * - Document contains: all base data + translations object with all languages
 * 
 * New Structure:
 * - Collection: blog_posts_base (shared data: featuredImage, author, category, tags, status, etc.)
 * - Collection: blog_posts_translations (language-specific: title, slug, content, seoTitle, seoDescription)
 * 
 * Usage:
 * node scripts/migrate-blog-to-separate-translations.js
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

async function migrateBlogPosts() {
  console.log('🚀 Starting blog post migration...\n');

  try {
    // Get all existing blog posts
    const postsSnapshot = await db.collection('blog_posts').get();
    
    if (postsSnapshot.empty) {
      console.log('❌ No blog posts found to migrate.');
      return;
    }

    console.log(`📚 Found ${postsSnapshot.size} blog posts to migrate.\n`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process each post
    for (const postDoc of postsSnapshot.docs) {
      const postData = postDoc.data();
      const postId = postDoc.id;
      
      try {
        console.log(`\n📝 Migrating post: ${postId}`);
        console.log(`   Title: ${postData.title || 'Untitled'}`);

        // Create base post document
        const basePostData = {
          author: postData.author || '',
          authorId: postData.authorId || '',
          category: postData.category || 'General',
          tags: postData.tags || [],
          featuredImage: postData.featuredImage || '',
          status: postData.status || 'draft',
          baseSlug: postData.baseSlug || postData.slug || '',
          seoKeywords: postData.seoKeywords || [],
          readTime: postData.readTime || '5 min read',
          views: postData.views || 0,
          likes: postData.likes || 0,
          comments: postData.comments || 0,
          publishedAt: postData.publishedAt || null,
          createdAt: postData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: postData.updatedAt || admin.firestore.FieldValue.serverTimestamp()
        };

        // Create base post with the same ID
        const basePostRef = db.collection('blog_posts_base').doc(postId);
        await basePostRef.set(basePostData);
        console.log(`   ✅ Created base post document`);

        // Handle translations
        let translationsCreated = 0;

        if (postData.translations && typeof postData.translations === 'object') {
          // New format: post has translations object
          console.log(`   📖 Found ${Object.keys(postData.translations).length} translations`);

          for (const [langCode, translation] of Object.entries(postData.translations)) {
          if (!translation.title || !translation.content) {
              console.log(`   ⚠️  Skipping empty ${langCode} translation`);
            continue;
          }
          
            const translationData = {
              postId: postId,
            language: langCode,
            title: translation.title,
              slug: translation.slug || postData.slug || '',
            content: translation.content,
            excerpt: translation.excerpt || '',
            seoTitle: translation.seoTitle || translation.title,
              seoDescription: translation.seoDescription || '',
              createdAt: postData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: postData.updatedAt || admin.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('blog_posts_translations').add(translationData);
            translationsCreated++;
            console.log(`   ✅ Created ${langCode} translation`);
          }
        } else {
          // Old format: single language post (no translations object)
          const language = postData.language || 'en';
          console.log(`   📖 Creating single ${language} translation (old format)`);

          const translationData = {
            postId: postId,
            language: language,
            title: postData.title || '',
            slug: postData.slug || '',
            content: postData.content || '',
            excerpt: postData.excerpt || '',
            seoTitle: postData.seoTitle || postData.title || '',
            seoDescription: postData.seoDescription || '',
            createdAt: postData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: postData.updatedAt || admin.firestore.FieldValue.serverTimestamp()
          };

          await db.collection('blog_posts_translations').add(translationData);
          translationsCreated++;
          console.log(`   ✅ Created ${language} translation`);
        }

        console.log(`   ✨ Migration complete for post ${postId} (${translationsCreated} translations)`);
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ Error migrating post ${postId}:`, error.message);
        errorCount++;
        errors.push({ postId, error: error.message });
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${successCount} posts`);
    console.log(`❌ Failed to migrate: ${errorCount} posts`);
    console.log(`📚 Total processed: ${postsSnapshot.size} posts`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(({ postId, error }) => {
        console.log(`   - Post ${postId}: ${error}`);
      });
    }

    console.log('\n✨ Migration complete!');
    console.log('\n⚠️  IMPORTANT: Review the migrated data before deleting the old blog_posts collection.');
    console.log('   You can verify by checking:');
    console.log('   - blog_posts_base collection (should have base post data)');
    console.log('   - blog_posts_translations collection (should have translation documents)');
    console.log('\n💡 To delete the old collection after verification, run:');
    console.log('   node scripts/delete-old-blog-collection.js');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateBlogPosts()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
