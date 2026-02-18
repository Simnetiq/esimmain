/**
 * Blog Service Separate - Supabase version
 * Delegates to blogServiceSupabase.js which uses the separated translations model (blog_posts + blog_post_translations)
 */

import { blogServiceSupabase, generateSlug } from './blogServiceSupabase';

export { generateSlug };

// Re-export blogServiceSupabase as blogServiceSeparate for compatibility
export const blogServiceSeparate = blogServiceSupabase;

export default blogServiceSeparate;
