import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { enhancePostWithAutoSEO } from '../utils/autoSEOGenerator';

/**
 * NEW BLOG SERVICE WITH SEPARATED TRANSLATIONS
 * 
 * Structure:
 * - blog_posts_base: Contains shared data (postId, featuredImage, author, category, tags, status, etc.)
 * - blog_posts_translations: Contains language-specific content (title, slug, content, seoTitle, seoDescription)
 * 
 * Each translation is a separate document with:
 * - postId: Reference to the base post
 * - language: Language code (en, es, fr, etc.)
 * - title, slug, content, seoTitle, seoDescription
 * 
 * Benefits:
 * - AI translation only needs to handle small documents (one language at a time)
 * - Easier to manage and query individual translations
 * - Shared data (images, metadata) stored once
 */

// Generate slug from title
export const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim('-'); // Remove leading/trailing hyphens
};

// Blog service functions with separated translations
export const blogServiceSeparate = {
  /**
   * Get all published blog posts with language support
   * Returns posts with their requested language translation
   */
  async getPublishedPosts(limitCount = 10, lastDoc = null, language = 'en') {
    try {
      // Get base posts that are published
      let q = query(
        collection(db, 'blog_posts_base'),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const basePosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        publishedAt: doc.data().publishedAt?.toDate() || null,
        createdAt: doc.data().createdAt?.toDate() || null,
        updatedAt: doc.data().updatedAt?.toDate() || null
      }));

      // Fetch translations for each post
      const postsWithTranslations = await Promise.all(
        basePosts.map(async (basePost) => {
          // Try to get the requested language
          let translation = await this.getTranslation(basePost.id, language);
          let isFallback = false;

          // If requested language doesn't exist, fall back to English
          if (!translation && language !== 'en') {
            translation = await this.getTranslation(basePost.id, 'en');
            isFallback = true;
          }

          // If English doesn't exist either, get any available translation
          if (!translation) {
            const availableTranslations = await this.getAvailableLanguages(basePost.id);
            if (availableTranslations.length > 0) {
              translation = await this.getTranslation(basePost.id, availableTranslations[0]);
              isFallback = language !== availableTranslations[0];
            }
          }

          if (!translation) {
            return null; // Skip posts without any translation
          }

          return {
            ...basePost,
            ...translation,
            language: translation.language,
            isFallback,
            baseSlug: basePost.baseSlug || translation.slug
          };
        })
      );

      // Filter out null posts and sort by publishedAt
      const posts = postsWithTranslations
        .filter(post => post !== null)
        .sort((a, b) => {
          const aDate = a.publishedAt || a.createdAt;
          const bDate = b.publishedAt || b.createdAt;
          
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          
          return bDate.getTime() - aDate.getTime();
        });

      return {
        posts,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === limitCount
      };
    } catch (error) {
      console.error('Error fetching published posts:', error);
      throw error;
    }
  },

  /**
   * Get all blog posts (for admin)
   * Returns base posts with their primary language (English) translation
   */
  async getAllPosts(limitCount = 20, lastDoc = null) {
    try {
      let q = query(
        collection(db, 'blog_posts_base'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const basePosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        publishedAt: doc.data().publishedAt?.toDate() || null,
        createdAt: doc.data().createdAt?.toDate() || null,
        updatedAt: doc.data().updatedAt?.toDate() || null
      }));

      // Fetch English translation for each post (or first available)
      const postsWithTranslations = await Promise.all(
        basePosts.map(async (basePost) => {
          let translation = await this.getTranslation(basePost.id, 'en');
          
          // If no English translation, get first available
          if (!translation) {
            const availableLanguages = await this.getAvailableLanguages(basePost.id);
            if (availableLanguages.length > 0) {
              translation = await this.getTranslation(basePost.id, availableLanguages[0]);
            }
          }

          // Get all available translations for display
          const availableLanguages = await this.getAvailableLanguages(basePost.id);

          return {
            ...basePost,
            ...(translation || {}),
            language: translation?.language || 'en',
            availableLanguages
          };
        })
      );

      return {
        posts: postsWithTranslations,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === limitCount
      };
    } catch (error) {
      console.error('Error fetching all posts:', error);
      throw error;
    }
  },

  /**
   * Get a single translation for a post
   */
  async getTranslation(postId, language) {
    try {
      const q = query(
        collection(db, 'blog_posts_translations'),
        where('postId', '==', postId),
        where('language', '==', language),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        translationId: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error fetching translation:', error);
      return null;
    }
  },

  /**
   * Get all available languages for a post
   */
  async getAvailableLanguages(postId) {
    try {
      const q = query(
        collection(db, 'blog_posts_translations'),
        where('postId', '==', postId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data().language);
    } catch (error) {
      console.error('Error fetching available languages:', error);
      return [];
    }
  },

  /**
   * Get all translations for a post (for admin editing)
   */
  async getAllTranslations(postId) {
    try {
      const q = query(
        collection(db, 'blog_posts_translations'),
        where('postId', '==', postId)
      );

      const snapshot = await getDocs(q);
      const translations = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        translations[data.language] = {
          translationId: doc.id,
          ...data
        };
      });

      return translations;
    } catch (error) {
      console.error('Error fetching all translations:', error);
      return {};
    }
  },

  /**
   * Get blog post by ID (base post + all translations)
   */
  async getPostById(id) {
    try {
      const docRef = doc(db, 'blog_posts_base', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      const baseData = {
        id: docSnap.id,
        ...docSnap.data(),
        publishedAt: docSnap.data().publishedAt?.toDate() || null,
        createdAt: docSnap.data().createdAt?.toDate() || null,
        updatedAt: docSnap.data().updatedAt?.toDate() || null
      };

      // Fetch all translations
      const translations = await this.getAllTranslations(id);

      return {
        ...baseData,
        translations
      };
    } catch (error) {
      console.error('Error fetching post by ID:', error);
      throw error;
    }
  },

  /**
   * Get blog post by slug with language support
   */
  async getPostBySlug(slug, language = 'en') {
    try {
      // Find translation by slug
      const translationQuery = query(
        collection(db, 'blog_posts_translations'),
        where('slug', '==', slug),
        limit(1)
      );

      const translationSnapshot = await getDocs(translationQuery);
      
      if (translationSnapshot.empty) {
        return null;
      }

      const translationDoc = translationSnapshot.docs[0];
      const translationData = translationDoc.data();
      const postId = translationData.postId;

      // Get base post data
      const baseDocRef = doc(db, 'blog_posts_base', postId);
      const baseDocSnap = await getDoc(baseDocRef);

      if (!baseDocSnap.exists()) {
        return null;
      }

      const baseData = {
        id: baseDocSnap.id,
        ...baseDocSnap.data(),
        publishedAt: baseDocSnap.data().publishedAt?.toDate() || null,
        createdAt: baseDocSnap.data().createdAt?.toDate() || null,
        updatedAt: baseDocSnap.data().updatedAt?.toDate() || null
      };

      // Check if we need to get a different language translation
      let finalTranslation = translationData;
      let isFallback = false;

      if (translationData.language !== language) {
        // Try to get the requested language
        const requestedTranslation = await this.getTranslation(postId, language);
        if (requestedTranslation) {
          finalTranslation = requestedTranslation;
        } else {
          isFallback = true;
        }
      }

      // Combine base data with translation, ensuring timestamps from base data are preserved
      const { createdAt: transCreatedAt, updatedAt: transUpdatedAt, ...translationWithoutTimestamps } = finalTranslation;
      
      return {
        ...baseData,
        ...translationWithoutTimestamps,
        translationId: translationDoc.id,
        isFallback,
        // Use timestamps from base data (already converted to Date objects)
        publishedAt: baseData.publishedAt,
        createdAt: baseData.createdAt,
        updatedAt: baseData.updatedAt
      };
    } catch (error) {
      console.error('Error fetching post by slug:', error);
      throw error;
    }
  },

  /**
   * Create new blog post with translations
   * postData should include:
   * - Base fields: author, category, tags, featuredImage, status, baseSlug
   * - translations: { en: { title, content, ... }, es: { ... }, ... }
   */
  async createPost(postData) {
    try {
      const batch = writeBatch(db);

      // Prepare base post data
      const basePost = {
        author: postData.author || '',
        authorId: postData.authorId || '',
        category: postData.category || 'General',
        tags: postData.tags || [],
        featuredImage: postData.featuredImage || '',
        status: postData.status || 'draft',
        baseSlug: postData.baseSlug || '',
        seoKeywords: postData.seoKeywords || [],
        readTime: postData.readTime || '5 min read',
        views: 0,
        likes: 0,
        comments: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Set publishedAt if the post is being created as published
      if (basePost.status === 'published') {
        basePost.publishedAt = serverTimestamp();
      }

      // Create base post
      const basePostRef = doc(collection(db, 'blog_posts_base'));
      batch.set(basePostRef, basePost);

      // Create translations
      const translations = postData.translations || {};
      
      for (const [langCode, translation] of Object.entries(translations)) {
        if (!translation.title || !translation.content) {
          continue; // Skip empty translations
        }

        // Auto-generate SEO data for this translation
        const enhancedTranslation = enhancePostWithAutoSEO({
          title: translation.title,
          content: translation.content,
          seoTitle: translation.seoTitle,
          seoDescription: translation.seoDescription
        });

        // All languages use the same base slug (language is in URL path, not slug)
        let slug;
        if (translation.slug) {
          slug = translation.slug;
        } else if (basePost.baseSlug) {
          slug = basePost.baseSlug;
        } else {
          slug = generateSlug(translation.title);
        }

        const translationData = {
          postId: basePostRef.id,
          language: langCode,
          title: translation.title,
          slug: slug,
          content: translation.content,
          excerpt: translation.excerpt || '',
          seoTitle: enhancedTranslation.seoTitle || translation.title,
          seoDescription: enhancedTranslation.seoDescription || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Update baseSlug if not set (use English title or first available)
        if (!basePost.baseSlug) {
          basePost.baseSlug = slug;
          batch.update(basePostRef, { baseSlug: slug });
        }

        const translationRef = doc(collection(db, 'blog_posts_translations'));
        batch.set(translationRef, translationData);
      }

      await batch.commit();
      return basePostRef.id;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  },

  /**
   * Update blog post
   * Can update base data and/or translations
   */
  async updatePost(id, postData) {
    try {
      const batch = writeBatch(db);

      // Update base post data
      const basePostRef = doc(db, 'blog_posts_base', id);
      const baseUpdateData = {
        updatedAt: serverTimestamp()
      };

      // Add base fields if provided
      if (postData.author !== undefined) baseUpdateData.author = postData.author;
      if (postData.category !== undefined) baseUpdateData.category = postData.category;
      if (postData.tags !== undefined) baseUpdateData.tags = postData.tags;
      if (postData.featuredImage !== undefined) baseUpdateData.featuredImage = postData.featuredImage;
      if (postData.status !== undefined) baseUpdateData.status = postData.status;
      if (postData.baseSlug !== undefined) baseUpdateData.baseSlug = postData.baseSlug;
      if (postData.seoKeywords !== undefined) baseUpdateData.seoKeywords = postData.seoKeywords;
      if (postData.readTime !== undefined) baseUpdateData.readTime = postData.readTime;

      // Handle publishedAt
      const currentPost = await getDoc(basePostRef);
      if (currentPost.exists()) {
        const currentData = currentPost.data();
        if (postData.status === 'published' && !currentData.publishedAt) {
          baseUpdateData.publishedAt = serverTimestamp();
        }
      }

      batch.update(basePostRef, baseUpdateData);

      // Update or create translations
      if (postData.translations) {
        for (const [langCode, translation] of Object.entries(postData.translations)) {
          if (!translation.title || !translation.content) {
            continue; // Skip empty translations
          }

          // Check if translation exists
          const existingTranslation = await this.getTranslation(id, langCode);

          // Auto-generate SEO data for this translation
          const enhancedTranslation = enhancePostWithAutoSEO({
            title: translation.title,
            content: translation.content,
            seoTitle: translation.seoTitle,
            seoDescription: translation.seoDescription
          });

          // All languages use the same base slug (language is in URL path, not slug)
          let slug;
          if (translation.slug) {
            slug = translation.slug;
          } else {
            // Get baseSlug from base post
            const basePostDoc = await getDoc(basePostRef);
            if (basePostDoc.exists() && basePostDoc.data().baseSlug) {
              slug = basePostDoc.data().baseSlug;
            } else {
              slug = generateSlug(translation.title);
            }
          }

          const translationData = {
            postId: id,
            language: langCode,
            title: translation.title,
            slug: slug,
            content: translation.content,
            excerpt: translation.excerpt || '',
            seoTitle: enhancedTranslation.seoTitle || translation.title,
            seoDescription: enhancedTranslation.seoDescription || '',
            updatedAt: serverTimestamp()
          };

          if (existingTranslation && existingTranslation.translationId) {
            // Update existing translation
            const translationRef = doc(db, 'blog_posts_translations', existingTranslation.translationId);
            batch.update(translationRef, translationData);
          } else {
            // Create new translation
            translationData.createdAt = serverTimestamp();
            const translationRef = doc(collection(db, 'blog_posts_translations'));
            batch.set(translationRef, translationData);
          }
        }
      }

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  },

  /**
   * Delete blog post (base + all translations)
   */
  async deletePost(id) {
    try {
      const batch = writeBatch(db);

      // Delete base post
      const basePostRef = doc(db, 'blog_posts_base', id);
      batch.delete(basePostRef);

      // Delete all translations
      const translationsQuery = query(
        collection(db, 'blog_posts_translations'),
        where('postId', '==', id)
      );

      const translationsSnapshot = await getDocs(translationsQuery);
      translationsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  },

  /**
   * Delete a specific translation
   */
  async deleteTranslation(postId, language) {
    try {
      const translation = await this.getTranslation(postId, language);
      
      if (translation && translation.translationId) {
        const translationRef = doc(db, 'blog_posts_translations', translation.translationId);
        await deleteDoc(translationRef);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting translation:', error);
      throw error;
    }
  },

  /**
   * Publish blog post
   */
  async publishPost(id) {
    try {
      const postRef = doc(db, 'blog_posts_base', id);
      await updateDoc(postRef, {
        status: 'published',
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error publishing post:', error);
      throw error;
    }
  },

  /**
   * Unpublish blog post
   */
  async unpublishPost(id) {
    try {
      const postRef = doc(db, 'blog_posts_base', id);
      await updateDoc(postRef, {
        status: 'draft',
        publishedAt: null,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error unpublishing post:', error);
      throw error;
    }
  },

  /**
   * Get posts by category
   */
  async getPostsByCategory(category, limitCount = 10, language = 'en') {
    try {
      const q = query(
        collection(db, 'blog_posts_base'),
        where('category', '==', category),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const basePosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        publishedAt: doc.data().publishedAt?.toDate() || null,
        createdAt: doc.data().createdAt?.toDate() || null,
        updatedAt: doc.data().updatedAt?.toDate() || null
      }));

      // Fetch translations
      const postsWithTranslations = await Promise.all(
        basePosts.map(async (basePost) => {
          const translation = await this.getTranslation(basePost.id, language) ||
                              await this.getTranslation(basePost.id, 'en');
          
          if (!translation) return null;

          return {
            ...basePost,
            ...translation
          };
        })
      );

      return postsWithTranslations.filter(post => post !== null);
    } catch (error) {
      console.error('Error fetching posts by category:', error);
      throw error;
    }
  },

  /**
   * Search posts
   */
  async searchPosts(searchTerm, limitCount = 10, language = 'en') {
    try {
      // Get all published base posts
      const q = query(
        collection(db, 'blog_posts_base'),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const basePosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        publishedAt: doc.data().publishedAt?.toDate() || null,
        createdAt: doc.data().createdAt?.toDate() || null,
        updatedAt: doc.data().updatedAt?.toDate() || null
      }));

      // Fetch translations and filter
      const postsWithTranslations = await Promise.all(
        basePosts.map(async (basePost) => {
          const translation = await this.getTranslation(basePost.id, language) ||
                              await this.getTranslation(basePost.id, 'en');
          
          if (!translation) return null;

          const post = {
            ...basePost,
            ...translation
          };

          // Filter by search term
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch = 
            post.title?.toLowerCase().includes(searchLower) ||
            post.content?.toLowerCase().includes(searchLower) ||
            post.excerpt?.toLowerCase().includes(searchLower) ||
            post.tags?.some(tag => tag.toLowerCase().includes(searchLower));

          return matchesSearch ? post : null;
        })
      );

      return postsWithTranslations
        .filter(post => post !== null)
        .slice(0, limitCount);
    } catch (error) {
      console.error('Error searching posts:', error);
      throw error;
    }
  },

  /**
   * Get blog categories
   */
  async getCategories() {
    try {
      const q = query(
        collection(db, 'blog_posts_base'),
        where('status', '==', 'published')
      );
      
      const snapshot = await getDocs(q);
      const categories = new Set();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.category) {
          categories.add(data.category);
        }
      });

      return Array.from(categories).sort();
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  /**
   * Check if slug is available
   */
  async isSlugAvailable(slug, excludePostId = null) {
    try {
      const q = query(
        collection(db, 'blog_posts_translations'),
        where('slug', '==', slug),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return true;
      }
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      
      return excludePostId ? data.postId !== excludePostId : false;
    } catch (error) {
      console.error('Error checking slug availability:', error);
      return false;
    }
  },

  /**
   * Increment post views
   */
  async incrementViews(id) {
    try {
      const postRef = doc(db, 'blog_posts_base', id);
      const post = await getDoc(postRef);
      
      if (post.exists()) {
        const currentViews = post.data().views || 0;
        await updateDoc(postRef, {
          views: currentViews + 1
        });
      }
    } catch (error) {
      console.error('Error incrementing views:', error);
      // Don't throw error for view increment failures
    }
  }
};

export default blogServiceSeparate;
