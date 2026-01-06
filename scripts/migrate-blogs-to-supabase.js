/**
 * Blog Migration Script: Firebase → Supabase
 *
 * This script migrates blog posts from Firebase (blog_posts_base + blog_posts_translations)
 * to Supabase (blog_posts + blog_post_translations).
 *
 * Prerequisites:
 * 1. Run the SQL migration: server/supabase/migrations/001_blog_posts.sql
 * 2. Set environment variables:
 *    - FIREBASE_SERVICE_ACCOUNT_PATH or Firebase Admin credentials
 *    - SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY (not anon key - needs write access)
 *
 * Usage:
 *   node scripts/migrate-blogs-to-supabase.js [--dry-run] [--limit=N]
 *
 * Options:
 *   --dry-run   Preview migration without writing to Supabase
 *   --limit=N   Only migrate first N posts (for testing)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

console.log('========================================');
console.log('Blog Migration: Firebase → Supabase');
console.log('========================================');
console.log(`Mode: ${isDryRun ? 'DRY RUN (no writes)' : 'LIVE MIGRATION'}`);
if (limit) console.log(`Limit: ${limit} posts`);
console.log('');

// Initialize Firebase Admin
let firestore;
try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    resolve(__dirname, '../firebase-service-account.json');

  if (!existsSync(serviceAccountPath)) {
    throw new Error(`Firebase service account file not found at: ${serviceAccountPath}`);
  }

  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

  initializeApp({
    credential: cert(serviceAccount)
  });

  firestore = getFirestore();
  console.log('✓ Firebase Admin initialized');
} catch (error) {
  console.error('✗ Firebase initialization failed:', error.message);
  process.exit(1);
}

// Initialize Supabase
let supabase;
try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('✓ Supabase client initialized');
} catch (error) {
  console.error('✗ Supabase initialization failed:', error.message);
  process.exit(1);
}

// Statistics
const stats = {
  postsRead: 0,
  postsCreated: 0,
  postsFailed: 0,
  translationsRead: 0,
  translationsCreated: 0,
  translationsFailed: 0,
  skipped: 0
};

/**
 * Convert Firebase Timestamp to ISO string
 */
function toISOString(timestamp) {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  return null;
}

/**
 * Map Firebase status to Supabase enum
 */
function mapStatus(status) {
  const validStatuses = ['draft', 'published', 'archived', 'scheduled'];
  return validStatuses.includes(status) ? status : 'draft';
}

/**
 * Map Firebase language to Supabase enum
 */
function mapLanguage(lang) {
  const validLanguages = ['en', 'es', 'fr', 'de', 'ar', 'he', 'ru'];
  return validLanguages.includes(lang) ? lang : null;
}

/**
 * Migrate blog posts
 */
async function migrateBlogPosts() {
  console.log('\n--- Fetching Firebase blog_posts_base ---');

  // Fetch all base posts from Firebase
  let query = firestore.collection('blog_posts_base').orderBy('createdAt', 'desc');
  if (limit) {
    query = query.limit(limit);
  }

  const snapshot = await query.get();
  stats.postsRead = snapshot.docs.length;
  console.log(`Found ${stats.postsRead} posts in Firebase`);

  // Map Firebase ID to Supabase UUID
  const idMapping = new Map();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const firebaseId = doc.id;

    console.log(`\nProcessing post: ${data.baseSlug || firebaseId}`);

    // Prepare Supabase post data
    const supabasePost = {
      base_slug: data.baseSlug || `post-${firebaseId.slice(0, 8)}`,
      author: data.author || '',
      author_id: null, // Cannot directly map Firebase UID to Supabase UUID
      category: data.category || 'General',
      tags: data.tags || [],
      featured_image: data.featuredImage || null,
      status: mapStatus(data.status),
      read_time: data.readTime || '5 min read',
      seo_keywords: data.seoKeywords || [],
      views: data.views || 0,
      likes: data.likes || 0,
      comments: data.comments || 0,
      published_at: toISOString(data.publishedAt),
      scheduled_at: toISOString(data.scheduledAt),
      created_at: toISOString(data.createdAt) || new Date().toISOString(),
      updated_at: toISOString(data.updatedAt) || new Date().toISOString()
    };

    if (isDryRun) {
      console.log('  [DRY RUN] Would create post:', supabasePost.base_slug);
      idMapping.set(firebaseId, 'dry-run-uuid');
      stats.postsCreated++;
      continue;
    }

    try {
      // Check if post already exists (by base_slug)
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('base_slug', supabasePost.base_slug)
        .single();

      if (existing) {
        console.log(`  → Skipping (already exists): ${supabasePost.base_slug}`);
        idMapping.set(firebaseId, existing.id);
        stats.skipped++;
        continue;
      }

      // Insert new post
      const { data: newPost, error } = await supabase
        .from('blog_posts')
        .insert(supabasePost)
        .select()
        .single();

      if (error) {
        console.error(`  ✗ Failed to create post:`, error.message);
        stats.postsFailed++;
        continue;
      }

      console.log(`  ✓ Created post: ${supabasePost.base_slug} → ${newPost.id}`);
      idMapping.set(firebaseId, newPost.id);
      stats.postsCreated++;
    } catch (error) {
      console.error(`  ✗ Error processing post:`, error.message);
      stats.postsFailed++;
    }
  }

  return idMapping;
}

/**
 * Migrate blog translations
 */
async function migrateTranslations(idMapping) {
  console.log('\n--- Fetching Firebase blog_posts_translations ---');

  // Fetch all translations from Firebase
  const snapshot = await firestore.collection('blog_posts_translations').get();
  stats.translationsRead = snapshot.docs.length;
  console.log(`Found ${stats.translationsRead} translations in Firebase`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const firebasePostId = data.postId;
    const supabasePostId = idMapping.get(firebasePostId);

    if (!supabasePostId) {
      console.log(`  → Skipping translation (no parent post): ${data.slug}`);
      stats.skipped++;
      continue;
    }

    const language = mapLanguage(data.language);
    if (!language) {
      console.log(`  → Skipping translation (invalid language): ${data.language}`);
      stats.skipped++;
      continue;
    }

    console.log(`Processing translation: ${data.slug} (${language})`);

    const supabaseTranslation = {
      post_id: supabasePostId,
      language: language,
      title: data.title || '',
      slug: data.slug || '',
      content: data.content || '',
      excerpt: data.excerpt || '',
      seo_title: data.seoTitle || data.title || '',
      seo_description: data.seoDescription || '',
      created_at: toISOString(data.createdAt) || new Date().toISOString(),
      updated_at: toISOString(data.updatedAt) || new Date().toISOString()
    };

    if (isDryRun) {
      console.log(`  [DRY RUN] Would create translation: ${supabaseTranslation.slug}`);
      stats.translationsCreated++;
      continue;
    }

    try {
      // Check if translation already exists
      const { data: existing } = await supabase
        .from('blog_post_translations')
        .select('id')
        .eq('post_id', supabasePostId)
        .eq('language', language)
        .single();

      if (existing) {
        console.log(`  → Skipping (already exists): ${supabaseTranslation.slug}`);
        stats.skipped++;
        continue;
      }

      // Insert new translation
      const { error } = await supabase
        .from('blog_post_translations')
        .insert(supabaseTranslation);

      if (error) {
        // Handle duplicate slug error
        if (error.code === '23505' && error.message.includes('slug')) {
          console.error(`  ✗ Duplicate slug: ${supabaseTranslation.slug}`);
          // Try with modified slug
          supabaseTranslation.slug = `${supabaseTranslation.slug}-${Date.now()}`;
          const { error: retryError } = await supabase
            .from('blog_post_translations')
            .insert(supabaseTranslation);

          if (retryError) {
            console.error(`  ✗ Retry failed:`, retryError.message);
            stats.translationsFailed++;
            continue;
          }
          console.log(`  ✓ Created with modified slug: ${supabaseTranslation.slug}`);
          stats.translationsCreated++;
          continue;
        }

        console.error(`  ✗ Failed to create translation:`, error.message);
        stats.translationsFailed++;
        continue;
      }

      console.log(`  ✓ Created translation: ${supabaseTranslation.slug}`);
      stats.translationsCreated++;
    } catch (error) {
      console.error(`  ✗ Error processing translation:`, error.message);
      stats.translationsFailed++;
    }
  }
}

/**
 * Main migration function
 */
async function main() {
  try {
    const startTime = Date.now();

    // Migrate posts
    const idMapping = await migrateBlogPosts();

    // Migrate translations
    await migrateTranslations(idMapping);

    // Print summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n========================================');
    console.log('Migration Summary');
    console.log('========================================');
    console.log(`Duration: ${duration}s`);
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log('');
    console.log('Posts:');
    console.log(`  Read:    ${stats.postsRead}`);
    console.log(`  Created: ${stats.postsCreated}`);
    console.log(`  Failed:  ${stats.postsFailed}`);
    console.log('');
    console.log('Translations:');
    console.log(`  Read:    ${stats.translationsRead}`);
    console.log(`  Created: ${stats.translationsCreated}`);
    console.log(`  Failed:  ${stats.translationsFailed}`);
    console.log('');
    console.log(`Skipped:   ${stats.skipped}`);
    console.log('========================================');

    if (stats.postsFailed > 0 || stats.translationsFailed > 0) {
      console.log('\n⚠️  Some items failed to migrate. Review the logs above.');
      process.exit(1);
    }

    if (isDryRun) {
      console.log('\n✓ Dry run completed. Run without --dry-run to execute migration.');
    } else {
      console.log('\n✓ Migration completed successfully!');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

main();
