import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

/**
 * Blog Service - Supabase operations for blog posts
 *
 * This service provides the same interface as blogServiceSeparate.js
 * but uses Supabase instead of Firebase.
 *
 * Structure:
 * - blog_posts: Base post data (author, category, tags, featured_image, status, etc.)
 * - blog_post_translations: Language-specific content (title, slug, content, seo fields)
 */

/**
 * Generate slug from title
 * @param {string} title - The title to convert to a slug
 * @returns {string} URL-friendly slug
 */
export const generateSlug = (title) => {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Transform Supabase row to blog post view model
 * @param {Object} row - Raw row from Supabase query
 * @returns {Object} Blog post view model
 */
const transformPost = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    baseSlug: row.base_slug,
    author: row.author,
    authorId: row.author_id,
    category: row.category,
    tags: row.tags || [],
    featuredImage: row.featured_image,
    status: row.status,
    readTime: row.read_time,
    seoKeywords: row.seo_keywords || [],
    views: row.views || 0,
    likes: row.likes || 0,
    comments: row.comments || 0,
    publishedAt: row.published_at ? new Date(row.published_at) : null,
    scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    // Translation fields (when joined)
    translationId: row.translation_id,
    language: row.language || 'en',
    title: row.title,
    slug: row.slug,
    content: row.content,
    excerpt: row.excerpt,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    isFallback: row.is_fallback || false,
    availableLanguages: row.available_languages || []
  };
};

/**
 * Transform translations array to object keyed by language
 * @param {Array} translations - Array of translation rows
 * @returns {Object} Translations keyed by language code
 */
const transformTranslations = (translations) => {
  if (!translations || !Array.isArray(translations)) return {};

  const result = {};
  for (const t of translations) {
    result[t.language] = {
      translationId: t.id,
      title: t.title,
      slug: t.slug,
      content: t.content,
      excerpt: t.excerpt,
      seoTitle: t.seo_title,
      seoDescription: t.seo_description,
      language: t.language,
      createdAt: t.created_at ? new Date(t.created_at) : null,
      updatedAt: t.updated_at ? new Date(t.updated_at) : null
    };
  }
  return result;
};

export const blogServiceSupabase = {
  /**
   * Get all published blog posts with language support
   * Returns posts with their requested language translation (with fallback)
   *
   * @param {number} limitCount - Maximum number of posts to fetch
   * @param {number} offset - Offset for pagination (replaces lastDoc from Firebase)
   * @param {string} language - Language code (en, es, fr, de, ar, he, ru)
   * @returns {Promise<{posts: Array, hasMore: boolean}>}
   */
  async getPublishedPosts(limitCount = 10, offset = 0, language = 'en') {
    if (!isSupabaseAvailable()) {
      console.warn('[blogServiceSupabase] Supabase not available');
      return { posts: [], hasMore: false };
    }

    try {
      const supabase = getSupabase();

      // Ensure offset is a valid number (not null or undefined)
      const safeOffset = typeof offset === 'number' ? offset : 0;

      const { data, error } = await supabase
        .rpc('get_published_blog_posts', {
          p_language: language || 'en',
          p_limit: limitCount || 10,
          p_offset: safeOffset,
          p_category: null
        });

      if (error) {
        console.error('[getPublishedPosts] Error:', error);
        throw error;
      }

      const posts = (data || []).map(transformPost);

      return {
        posts,
        hasMore: posts.length === limitCount
      };
    } catch (error) {
      console.error('[getPublishedPosts] Error:', error);
      throw error;
    }
  },

  /**
   * Get all blog posts (for admin)
   * Returns base posts with their primary language (English) translation
   *
   * @param {number} limitCount - Maximum number of posts to fetch
   * @param {number} offset - Offset for pagination
   * @returns {Promise<{posts: Array, hasMore: boolean}>}
   */
  async getAllPosts(limitCount = 20, offset = 0) {
    if (!isSupabaseAvailable()) {
      console.warn('[blogServiceSupabase] Supabase not available');
      return { posts: [], hasMore: false };
    }

    try {
      const supabase = getSupabase();

      // Fetch base posts with all their translations
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_post_translations (*)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limitCount - 1);

      if (error) {
        console.error('[getAllPosts] Error:', error);
        throw error;
      }

      const posts = (data || []).map(row => {
        // Get English translation or first available
        const translations = row.blog_post_translations || [];
        const englishTrans = translations.find(t => t.language === 'en');
        const primaryTrans = englishTrans || translations[0];

        return {
          id: row.id,
          baseSlug: row.base_slug,
          author: row.author,
          authorId: row.author_id,
          category: row.category,
          tags: row.tags || [],
          featuredImage: row.featured_image,
          status: row.status,
          readTime: row.read_time,
          seoKeywords: row.seo_keywords || [],
          views: row.views || 0,
          likes: row.likes || 0,
          comments: row.comments || 0,
          publishedAt: row.published_at ? new Date(row.published_at) : null,
          scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : null,
          createdAt: row.created_at ? new Date(row.created_at) : null,
          updatedAt: row.updated_at ? new Date(row.updated_at) : null,
          // Primary translation
          title: primaryTrans?.title || '',
          slug: primaryTrans?.slug || '',
          excerpt: primaryTrans?.excerpt || '',
          content: primaryTrans?.content || '',
          language: primaryTrans?.language || 'en',
          // Available languages
          availableLanguages: translations.map(t => t.language)
        };
      });

      return {
        posts,
        hasMore: posts.length === limitCount
      };
    } catch (error) {
      console.error('[getAllPosts] Error:', error);
      throw error;
    }
  },

  /**
   * Get a single translation for a post
   *
   * @param {string} postId - UUID of the blog post
   * @param {string} language - Language code
   * @returns {Promise<Object|null>}
   */
  async getTranslation(postId, language) {
    if (!isSupabaseAvailable()) {
      return null;
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('blog_post_translations')
        .select('*')
        .eq('post_id', postId)
        .eq('language', language)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return {
        translationId: data.id,
        postId: data.post_id,
        language: data.language,
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        seoTitle: data.seo_title,
        seoDescription: data.seo_description,
        createdAt: data.created_at ? new Date(data.created_at) : null,
        updatedAt: data.updated_at ? new Date(data.updated_at) : null
      };
    } catch (error) {
      console.error('[getTranslation] Error:', error);
      return null;
    }
  },

  /**
   * Get all available languages for a post
   *
   * @param {string} postId - UUID of the blog post
   * @returns {Promise<Array<string>>}
   */
  async getAvailableLanguages(postId) {
    if (!isSupabaseAvailable()) {
      return [];
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('blog_post_translations')
        .select('language')
        .eq('post_id', postId);

      if (error) throw error;

      return (data || []).map(row => row.language);
    } catch (error) {
      console.error('[getAvailableLanguages] Error:', error);
      return [];
    }
  },

  /**
   * Get all translations for a post (for admin editing)
   *
   * @param {string} postId - UUID of the blog post
   * @returns {Promise<Object>} Translations keyed by language code
   */
  async getAllTranslations(postId) {
    if (!isSupabaseAvailable()) {
      return {};
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('blog_post_translations')
        .select('*')
        .eq('post_id', postId);

      if (error) throw error;

      return transformTranslations(data);
    } catch (error) {
      console.error('[getAllTranslations] Error:', error);
      return {};
    }
  },

  /**
   * Get blog post by ID (base post + all translations)
   *
   * @param {string} id - UUID of the blog post
   * @returns {Promise<Object|null>}
   */
  async getPostById(id) {
    if (!isSupabaseAvailable()) {
      return null;
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_post_translations (*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return {
        id: data.id,
        baseSlug: data.base_slug,
        author: data.author,
        authorId: data.author_id,
        category: data.category,
        tags: data.tags || [],
        featuredImage: data.featured_image,
        status: data.status,
        readTime: data.read_time,
        seoKeywords: data.seo_keywords || [],
        views: data.views || 0,
        likes: data.likes || 0,
        comments: data.comments || 0,
        publishedAt: data.published_at ? new Date(data.published_at) : null,
        scheduledAt: data.scheduled_at ? new Date(data.scheduled_at) : null,
        createdAt: data.created_at ? new Date(data.created_at) : null,
        updatedAt: data.updated_at ? new Date(data.updated_at) : null,
        translations: transformTranslations(data.blog_post_translations)
      };
    } catch (error) {
      console.error('[getPostById] Error:', error);
      throw error;
    }
  },

  /**
   * Get blog post by slug with language support
   * Uses RPC function for efficient fallback logic
   *
   * @param {string} slug - The post slug
   * @param {string} language - Language code
   * @returns {Promise<Object|null>}
   */
  async getPostBySlug(slug, language = 'en') {
    if (!isSupabaseAvailable()) {
      return null;
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .rpc('get_blog_post_by_slug', {
          p_slug: slug,
          p_language: language
        });

      if (error) {
        console.error('[getPostBySlug] Error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      return transformPost(data[0]);
    } catch (error) {
      console.error('[getPostBySlug] Error:', error);
      throw error;
    }
  },

  /**
   * Create new blog post with translations
   *
   * @param {Object} postData - Post data including translations
   * @returns {Promise<string>} New post ID
   */
  async createPost(postData) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not available');
    }

    try {
      const supabase = getSupabase();

      // Prepare base post data
      // Note: author_id is UUID in Supabase, but Firebase uses different ID format
      // We store the author name in 'author' field instead
      const basePost = {
        base_slug: postData.baseSlug || generateSlug(postData.translations?.en?.title || ''),
        author: postData.author || '',
        author_id: null, // Firebase UIDs are not compatible with Supabase UUID
        category: postData.category || 'General',
        tags: postData.tags || [],
        featured_image: postData.featuredImage || null,
        status: postData.status || 'draft',
        read_time: postData.readTime || '5 min read',
        seo_keywords: postData.seoKeywords || [],
        published_at: postData.status === 'published' ? new Date().toISOString() : null
      };

      // Insert base post
      const { data: newPost, error: postError } = await supabase
        .from('blog_posts')
        .insert(basePost)
        .select()
        .single();

      if (postError) {
        console.error('[createPost] Error creating base post:', JSON.stringify(postError, null, 2));
        console.error('[createPost] Base post data was:', JSON.stringify(basePost, null, 2));
        throw postError;
      }

      // Insert translations
      const translations = postData.translations || {};
      const translationInserts = [];

      for (const [langCode, translation] of Object.entries(translations)) {
        if (!translation.title || !translation.content) {
          continue; // Skip empty translations
        }

        // All languages use the same base slug (language is in URL path)
        const slug = translation.slug || basePost.base_slug;

        translationInserts.push({
          post_id: newPost.id,
          language: langCode,
          title: translation.title,
          slug: slug,
          content: translation.content,
          excerpt: translation.excerpt || '',
          seo_title: translation.seoTitle || translation.title,
          seo_description: translation.seoDescription || ''
        });
      }

      if (translationInserts.length > 0) {
        const { error: transError } = await supabase
          .from('blog_post_translations')
          .insert(translationInserts);

        if (transError) {
          // Rollback: delete the base post
          await supabase.from('blog_posts').delete().eq('id', newPost.id);
          console.error('[createPost] Error creating translations:', transError);
          throw transError;
        }
      }

      return newPost.id;
    } catch (error) {
      console.error('[createPost] Error:', error);
      throw error;
    }
  },

  /**
   * Update blog post
   *
   * @param {string} id - Post ID
   * @param {Object} postData - Updated post data
   * @returns {Promise<boolean>}
   */
  async updatePost(id, postData) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not available');
    }

    try {
      const supabase = getSupabase();

      // Build base post update
      const baseUpdate = {};

      if (postData.author !== undefined) baseUpdate.author = postData.author;
      if (postData.category !== undefined) baseUpdate.category = postData.category;
      if (postData.tags !== undefined) baseUpdate.tags = postData.tags;
      if (postData.featuredImage !== undefined) baseUpdate.featured_image = postData.featuredImage;
      if (postData.status !== undefined) baseUpdate.status = postData.status;
      if (postData.baseSlug !== undefined) baseUpdate.base_slug = postData.baseSlug;
      if (postData.seoKeywords !== undefined) baseUpdate.seo_keywords = postData.seoKeywords;
      if (postData.readTime !== undefined) baseUpdate.read_time = postData.readTime;

      // Handle publishedAt
      if (postData.status === 'published') {
        // Check if post already has publishedAt
        const { data: existingPost } = await supabase
          .from('blog_posts')
          .select('published_at')
          .eq('id', id)
          .single();

        if (!existingPost?.published_at) {
          baseUpdate.published_at = new Date().toISOString();
        }
      }

      // Update base post if there are changes
      if (Object.keys(baseUpdate).length > 0) {
        const { error: postError } = await supabase
          .from('blog_posts')
          .update(baseUpdate)
          .eq('id', id);

        if (postError) {
          console.error('[updatePost] Error updating base post:', postError);
          throw postError;
        }
      }

      // Update or create translations
      if (postData.translations) {
        for (const [langCode, translation] of Object.entries(postData.translations)) {
          if (!translation.title || !translation.content) {
            continue; // Skip empty translations
          }

          // Get baseSlug for this post
          const { data: basePost } = await supabase
            .from('blog_posts')
            .select('base_slug')
            .eq('id', id)
            .single();

          const slug = translation.slug || basePost?.base_slug || generateSlug(translation.title);

          const translationData = {
            post_id: id,
            language: langCode,
            title: translation.title,
            slug: slug,
            content: translation.content,
            excerpt: translation.excerpt || '',
            seo_title: translation.seoTitle || translation.title,
            seo_description: translation.seoDescription || ''
          };

          // Upsert translation (insert or update on conflict)
          const { error: transError } = await supabase
            .from('blog_post_translations')
            .upsert(translationData, {
              onConflict: 'post_id,language',
              ignoreDuplicates: false
            });

          if (transError) {
            console.error(`[updatePost] Error updating translation ${langCode}:`, transError);
            throw transError;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('[updatePost] Error:', error);
      throw error;
    }
  },

  /**
   * Delete blog post (base + all translations via CASCADE)
   *
   * @param {string} id - Post ID
   * @returns {Promise<boolean>}
   */
  async deletePost(id) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not available');
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[deletePost] Error:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('[deletePost] Error:', error);
      throw error;
    }
  },

  /**
   * Delete a specific translation
   *
   * @param {string} postId - Post ID
   * @param {string} language - Language code
   * @returns {Promise<boolean>}
   */
  async deleteTranslation(postId, language) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not available');
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('blog_post_translations')
        .delete()
        .eq('post_id', postId)
        .eq('language', language);

      if (error) {
        console.error('[deleteTranslation] Error:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('[deleteTranslation] Error:', error);
      throw error;
    }
  },

  /**
   * Publish blog post
   *
   * @param {string} id - Post ID
   * @returns {Promise<boolean>}
   */
  async publishPost(id) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not available');
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('blog_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[publishPost] Error:', error);
      throw error;
    }
  },

  /**
   * Unpublish blog post
   *
   * @param {string} id - Post ID
   * @returns {Promise<boolean>}
   */
  async unpublishPost(id) {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not available');
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('blog_posts')
        .update({
          status: 'draft',
          published_at: null
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[unpublishPost] Error:', error);
      throw error;
    }
  },

  /**
   * Get posts by category
   *
   * @param {string} category - Category name
   * @param {number} limitCount - Maximum posts
   * @param {string} language - Language code
   * @returns {Promise<Array>}
   */
  async getPostsByCategory(category, limitCount = 10, language = 'en') {
    if (!isSupabaseAvailable()) {
      return [];
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .rpc('get_published_blog_posts', {
          p_language: language,
          p_limit: limitCount,
          p_offset: 0,
          p_category: category
        });

      if (error) throw error;

      return (data || []).map(transformPost);
    } catch (error) {
      console.error('[getPostsByCategory] Error:', error);
      throw error;
    }
  },

  /**
   * Search posts
   *
   * @param {string} searchTerm - Search query
   * @param {number} limitCount - Maximum posts
   * @param {string} language - Language code
   * @returns {Promise<Array>}
   */
  async searchPosts(searchTerm, limitCount = 10, language = 'en') {
    if (!isSupabaseAvailable() || !searchTerm) {
      return [];
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .rpc('search_blog_posts', {
          p_search_term: searchTerm,
          p_language: language,
          p_limit: limitCount
        });

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        baseSlug: row.base_slug,
        author: row.author,
        category: row.category,
        tags: row.tags || [],
        featuredImage: row.featured_image,
        views: row.views || 0,
        publishedAt: row.published_at ? new Date(row.published_at) : null,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt,
        language: row.language
      }));
    } catch (error) {
      console.error('[searchPosts] Error:', error);
      throw error;
    }
  },

  /**
   * Get blog categories
   *
   * @returns {Promise<Array<string>>}
   */
  async getCategories() {
    if (!isSupabaseAvailable()) {
      return [];
    }

    try {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .rpc('get_blog_categories');

      if (error) throw error;

      return (data || []).map(row => row.category);
    } catch (error) {
      console.error('[getCategories] Error:', error);
      throw error;
    }
  },

  /**
   * Check if slug is available
   *
   * @param {string} slug - Slug to check
   * @param {string} excludePostId - Post ID to exclude from check
   * @returns {Promise<boolean>}
   */
  async isSlugAvailable(slug, excludePostId = null) {
    if (!isSupabaseAvailable()) {
      return false;
    }

    try {
      const supabase = getSupabase();

      let query = supabase
        .from('blog_post_translations')
        .select('post_id')
        .eq('slug', slug)
        .limit(1);

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        return true;
      }

      return excludePostId ? data[0].post_id !== excludePostId : false;
    } catch (error) {
      console.error('[isSlugAvailable] Error:', error);
      return false;
    }
  },

  /**
   * Increment post views
   *
   * @param {string} id - Post ID
   * @returns {Promise<void>}
   */
  async incrementViews(id) {
    if (!isSupabaseAvailable()) {
      return;
    }

    try {
      const supabase = getSupabase();

      await supabase.rpc('increment_blog_views', { p_post_id: id });
    } catch (error) {
      // Don't throw error for view increment failures
      console.warn('[incrementViews] Error:', error);
    }
  }
};

export default blogServiceSupabase;
