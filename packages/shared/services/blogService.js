import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { enhancePostWithAutoSEO } from '../utils/autoSEOGenerator';

// Blog post data structure
export const createBlogPost = (postData) => {
  return {
    title: postData.title || '',
    slug: postData.slug || '',
    excerpt: postData.excerpt || '',
    content: postData.content || '',
    author: postData.author || '',
    authorId: postData.authorId || '',
    category: postData.category || 'General',
    tags: postData.tags || [],
    featuredImage: postData.featuredImage || '',
    status: postData.status || 'draft', // draft, published, archived, scheduled
    publishedAt: postData.publishedAt || null,
    scheduledAt: postData.scheduledAt || null,
    readTime: postData.readTime || '5 min read',
    seoTitle: postData.seoTitle || postData.title || '',
    seoDescription: postData.seoDescription || postData.excerpt || '',
    seoKeywords: postData.seoKeywords || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    views: 0,
    likes: 0,
    comments: 0
  };
};

// Generate slug from title
export const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim('-'); // Remove leading/trailing hyphens
};

// Blog service functions
export const blogService = {
  // Get all published blog posts with language support and translation variants
  async getPublishedPosts(limitCount = 10, lastDoc = null, language = 'en') {
    try {
      // Get all published posts regardless of language
      let q = query(
        collection(db, 'blog_posts'),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Handle new translation format
        if (data.translations) {
          // Try to get the requested language first
          let translation = data.translations[language];
          let actualLanguage = language;
          let isFallback = false;
          
          // If requested language doesn't exist, fall back to English
          if (!translation && language !== 'en') {
            translation = data.translations['en'];
            actualLanguage = 'en';
            isFallback = true;
          }
          
          // If English doesn't exist either, use the first available translation
          if (!translation) {
            const availableLanguages = Object.keys(data.translations);
            if (availableLanguages.length > 0) {
              actualLanguage = availableLanguages[0];
              translation = data.translations[actualLanguage];
              isFallback = language !== actualLanguage;
            }
          }
          
          if (translation) {
            return {
              id: doc.id,
              ...data,
              // Override with language-specific content
              title: translation.title,
              slug: translation.slug,
              excerpt: translation.excerpt,
              content: translation.content,
              seoTitle: translation.seoTitle,
              seoDescription: translation.seoDescription,
              language: actualLanguage,
              isFallback: isFallback,
              baseSlug: data.baseSlug || data.slug, // Ensure baseSlug is available for URL generation
              publishedAt: data.publishedAt?.toDate() || null,
              createdAt: data.createdAt?.toDate() || null,
              updatedAt: data.updatedAt?.toDate() || null
            };
          }
        }
        
        // Handle old format (backward compatibility)
        return {
          id: doc.id,
          ...data,
          language: data.language || 'en',
          isFallback: language !== (data.language || 'en'),
          publishedAt: data.publishedAt?.toDate() || null,
          createdAt: data.createdAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || null
        };
      }).filter(post => post !== undefined); // Filter out any undefined posts

      // Sort posts by publishedAt (latest first), with fallback to createdAt for posts without publishedAt
      posts.sort((a, b) => {
        const aDate = a.publishedAt || a.createdAt;
        const bDate = b.publishedAt || b.createdAt;
        
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1; // Put posts without dates at the end
        if (!bDate) return -1;
        
        return bDate.getTime() - aDate.getTime(); // Descending order (latest first)
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

  // Get all blog posts (for admin)
  async getAllPosts(limitCount = 20, lastDoc = null) {
    try {
      let q = query(
        collection(db, 'blog_posts'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          language: data.language || 'en', // Default to English for backward compatibility
          publishedAt: data.publishedAt?.toDate() || null,
          createdAt: data.createdAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || null
        };
      });

      return {
        posts,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === limitCount
      };
    } catch (error) {
      console.error('Error fetching all posts:', error);
      throw error;
    }
  },

  // Get blog post by ID
  async getPostById(id) {
    try {
      const docRef = doc(db, 'blog_posts', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          publishedAt: data.publishedAt?.toDate() || null,
          createdAt: data.createdAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || null
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching post by ID:', error);
      throw error;
    }
  },

  // Get blog post by slug with language support and translation variants
  async getPostBySlug(slug, language = 'en') {
    try {
      let post = null;

      // First, try to find a post with translations that has this slug in the requested language
      const allPostsQuery = query(
        collection(db, 'blog_posts'),
        where('status', '==', 'published')
      );
      
      const allSnapshot = await getDocs(allPostsQuery);
      
      for (const doc of allSnapshot.docs) {
        const data = doc.data();
        
        // Check if this post has the requested slug in any language
        if (data.translations) {
          // New format with translations
          const translation = data.translations[language];
          if (translation && translation.slug === slug) {
            // Found exact language match
            post = {
              id: doc.id,
              ...data,
              // Override with language-specific content
              title: translation.title,
              slug: translation.slug,
              excerpt: translation.excerpt,
              content: translation.content,
              seoTitle: translation.seoTitle,
              seoDescription: translation.seoDescription,
              language: language,
              isFallback: false, // Not a fallback since we found exact match
              publishedAt: data.publishedAt?.toDate() || null,
              createdAt: data.createdAt?.toDate() || null,
              updatedAt: data.updatedAt?.toDate() || null
            };
            break;
          } else {
            // Check if any translation has this slug (for cross-language access)
            let foundTranslation = null;
            let foundLangCode = null;
            
            for (const [langCode, translation] of Object.entries(data.translations)) {
              if (translation.slug === slug) {
                foundTranslation = translation;
                foundLangCode = langCode;
                break;
              }
            }
            
            if (foundTranslation) {
              // Found the post by slug in a different language
              // Now check if the requested language exists for this post
              const requestedTranslation = data.translations[language];
              
              if (requestedTranslation) {
                // Use the requested language version
                post = {
                  id: doc.id,
                  ...data,
                  title: requestedTranslation.title,
                  slug: requestedTranslation.slug,
                  excerpt: requestedTranslation.excerpt,
                  content: requestedTranslation.content,
                  seoTitle: requestedTranslation.seoTitle,
                  seoDescription: requestedTranslation.seoDescription,
                  language: language,
                  isFallback: false, // Not a fallback since we found the requested language
                  publishedAt: data.publishedAt?.toDate() || null,
                  createdAt: data.createdAt?.toDate() || null,
                  updatedAt: data.updatedAt?.toDate() || null
                };
              } else {
                // Fallback to the found language
                post = {
                  id: doc.id,
                  ...data,
                  title: foundTranslation.title,
                  slug: foundTranslation.slug,
                  excerpt: foundTranslation.excerpt,
                  content: foundTranslation.content,
                  seoTitle: foundTranslation.seoTitle,
                  seoDescription: foundTranslation.seoDescription,
                  language: foundLangCode,
                  publishedAt: data.publishedAt?.toDate() || null,
                  createdAt: data.createdAt?.toDate() || null,
                  updatedAt: data.updatedAt?.toDate() || null,
                  isFallback: language !== foundLangCode // Mark as fallback if not requested language
                };
              }
              break;
            }
          }
        } else {
          // Old format without translations - backward compatibility
          if (data.slug === slug) {
            post = {
              id: doc.id,
              ...data,
              language: data.language || 'en',
              publishedAt: data.publishedAt?.toDate() || null,
              createdAt: data.createdAt?.toDate() || null,
              updatedAt: data.updatedAt?.toDate() || null,
              isFallback: language !== (data.language || 'en')
            };
            break;
          }
        }
      }
      
      return post;
    } catch (error) {
      console.error('Error fetching post by slug:', error);
      throw error;
    }
  },

  // Create new blog post
  async createPost(postData) {
    try {
      
      // Auto-generate SEO data
      const enhancedPostData = enhancePostWithAutoSEO(postData);
      
      const post = createBlogPost(enhancedPostData);
      
      // Preserve translations if provided (for multilingual support)
      if (enhancedPostData.translations) {
        post.translations = enhancedPostData.translations;
      }
      
      // Preserve baseSlug if provided (for multilingual support)
      if (enhancedPostData.baseSlug) {
        post.baseSlug = enhancedPostData.baseSlug;
      }
      
      // Set publishedAt if the post is being created as published
      if (post.status === 'published') {
        post.publishedAt = serverTimestamp();
      }
      
      // Generate slug if not provided
      if (!post.slug) {
        post.slug = generateSlug(post.title);
      }

      // Check if slug already exists
      const existingPost = await this.getPostBySlug(post.slug);
      if (existingPost) {
        post.slug = `${post.slug}-${Date.now()}`;
      }

      const docRef = await addDoc(collection(db, 'blog_posts'), post);
      return docRef.id;
    } catch (error) {
      throw error;
    }
  },

  // Update blog post
  async updatePost(id, postData) {
    try {
      
      // Auto-generate SEO data for updates
      const enhancedPostData = enhancePostWithAutoSEO(postData);
      
      const postRef = doc(db, 'blog_posts', id);
      const updateData = {
        ...enhancedPostData,
        updatedAt: serverTimestamp()
      };

      // Preserve translations if provided (for multilingual support)
      if (enhancedPostData.translations) {
        updateData.translations = enhancedPostData.translations;
      }
      
      // Preserve baseSlug if provided (for multilingual support)
      if (enhancedPostData.baseSlug) {
        updateData.baseSlug = enhancedPostData.baseSlug;
      }

      // Only set publishedAt if the post is being published for the first time
      // Check if the post currently exists and doesn't have a publishedAt
      const currentPost = await getDoc(postRef);
      if (currentPost.exists()) {
        const currentData = currentPost.data();
        // Only set publishedAt if the post is being published and doesn't already have a publishedAt
        if (enhancedPostData.status === 'published' && !currentData.publishedAt) {
          updateData.publishedAt = serverTimestamp();
        }
      } else {
        // If creating a new post and it's published, set publishedAt
        if (enhancedPostData.status === 'published') {
          updateData.publishedAt = serverTimestamp();
        }
      }

      // Generate slug if title changed and no custom slug provided
      if (enhancedPostData.title && !enhancedPostData.slug) {
        updateData.slug = generateSlug(enhancedPostData.title);
      }

      // Check for slug uniqueness if slug is being updated
      if (updateData.slug) {
        const existingPost = await this.getPostBySlug(updateData.slug);
        if (existingPost && existingPost.id !== id) {
          updateData.slug = `${updateData.slug}-${Date.now()}`;
        }
      }

      await updateDoc(postRef, updateData);
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Delete blog post
  async deletePost(id) {
    try {
      const postRef = doc(db, 'blog_posts', id);
      await deleteDoc(postRef);
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Publish blog post
  async publishPost(id) {
    try {
      const postRef = doc(db, 'blog_posts', id);
      await updateDoc(postRef, {
        status: 'published',
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Unpublish blog post
  async unpublishPost(id) {
    try {
      const postRef = doc(db, 'blog_posts', id);
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

  // Fix posts that are missing publishedAt field (utility function for data migration)
  async fixMissingPublishedAt() {
    try {
      const q = query(
        collection(db, 'blog_posts'),
        where('status', '==', 'published'),
        where('publishedAt', '==', null)
      );
      
      const snapshot = await getDocs(q);
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
      
      return batch.length;
    } catch (error) {
      throw error;
    }
  },

  // Get posts by category
  async getPostsByCategory(category, limitCount = 10) {
    try {
      const q = query(
        collection(db, 'blog_posts'),
        where('category', '==', category),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        publishedAt: doc.data().publishedAt?.toDate() || null,
        createdAt: doc.data().createdAt?.toDate() || null,
        updatedAt: doc.data().updatedAt?.toDate() || null
      }));

      return posts;
    } catch (error) {
      throw error;
    }
  },

  // Search posts
  async searchPosts(searchTerm, limitCount = 10) {
    try {
      // Note: This is a basic search. For better search, consider using Algolia or similar
      const q = query(
        collection(db, 'blog_posts'),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const allPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        publishedAt: doc.data().publishedAt?.toDate() || null,
        createdAt: doc.data().createdAt?.toDate() || null,
        updatedAt: doc.data().updatedAt?.toDate() || null
      }));

      // Filter posts based on search term
      const filteredPosts = allPosts.filter(post => 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      return filteredPosts.slice(0, limitCount);
    } catch (error) {
      throw error;
    }
  },

  // Get blog categories
  async getCategories() {
    try {
      const q = query(collection(db, 'blog_posts'), where('status', '==', 'published'));
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
      throw error;
    }
  },

  // Check if slug is available
  async isSlugAvailable(slug, excludeId = null) {
    try {
      const q = query(
        collection(db, 'blog_posts'),
        where('slug', '==', slug),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return true;
      }
      
      const doc = snapshot.docs[0];
      return excludeId ? doc.id !== excludeId : false;
    } catch (error) {
      return false;
    }
  },

  // Schedule post for future publication
  async schedulePost(id, scheduledAt) {
    try {
      const postRef = doc(db, 'blog_posts', id);
      await updateDoc(postRef, {
        status: 'scheduled',
        scheduledAt: scheduledAt,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Publish scheduled post immediately
  async publishScheduledPost(id) {
    try {
      const postRef = doc(db, 'blog_posts', id);
      await updateDoc(postRef, {
        status: 'published',
        publishedAt: serverTimestamp(),
        scheduledAt: null,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Get scheduled posts
  async getScheduledPosts() {
    try {
      const q = query(
        collection(db, 'blog_posts'),
        where('status', '==', 'scheduled'),
        orderBy('scheduledAt', 'asc')
      );

      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledAt: doc.data().scheduledAt?.toDate() || null,
        createdAt: doc.data().createdAt?.toDate() || null,
        updatedAt: doc.data().updatedAt?.toDate() || null
      }));

      return posts;
    } catch (error) {
      throw error;
    }
  },

  // Check and publish due scheduled posts
  async checkScheduledPosts() {
    try {
      const now = new Date();
      const scheduledPosts = await this.getScheduledPosts();
      
      const duePosts = scheduledPosts.filter(post => 
        post.scheduledAt && post.scheduledAt <= now
      );

      for (const post of duePosts) {
        await this.publishScheduledPost(post.id);
      }

      return duePosts.length;
    } catch (error) {
      throw error;
    }
  },

  // Increment post views
  async incrementViews(id) {
    try {
      const postRef = doc(db, 'blog_posts', id);
      const post = await this.getPostById(id);
      
      if (post) {
        await updateDoc(postRef, {
          views: (post.views || 0) + 1
        });
      }
    } catch (error) {
      // Don't throw error for view increment failures
    }
  }
};

export default blogService;
