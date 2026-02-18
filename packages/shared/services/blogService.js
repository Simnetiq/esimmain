/**
 * Blog Service - Supabase version
 * Delegates to blogServiceSupabase.js which already has the full implementation
 */

import { blogServiceSupabase, generateSlug } from './blogServiceSupabase';

export { generateSlug };

export const createBlogPost = (postData) => ({
  title: postData.title || '',
  slug: postData.slug || '',
  excerpt: postData.excerpt || '',
  content: postData.content || '',
  author: postData.author || '',
  authorId: postData.authorId || '',
  category: postData.category || 'General',
  tags: postData.tags || [],
  featuredImage: postData.featuredImage || '',
  status: postData.status || 'draft',
  publishedAt: postData.publishedAt || null,
  scheduledAt: postData.scheduledAt || null,
  readTime: postData.readTime || '5 min read',
  seoTitle: postData.seoTitle || postData.title || '',
  seoDescription: postData.seoDescription || postData.excerpt || '',
  seoKeywords: postData.seoKeywords || [],
  views: 0,
  likes: 0,
  comments: 0
});

// Re-export blogServiceSupabase as blogService for compatibility
export const blogService = blogServiceSupabase;

export default blogService;
