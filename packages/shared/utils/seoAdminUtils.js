/**
 * Admin utility to regenerate SEO for existing blog posts
 * This can be used to update SEO for posts created before auto-SEO was implemented
 */

import { enhancePostWithAutoSEO } from './autoSEOGenerator';
import { blogService } from '../services/blogService';

/**
 * Regenerate SEO for a specific post
 */
export async function regeneratePostSEO(postId) {
  try {
    
    // Get the post data
    const post = await blogService.getPostById(postId);
    if (!post) {
      throw new Error('Post not found');
    }
    
    // Generate new SEO data
    const enhancedPost = enhancePostWithAutoSEO(post);
    
    // Update the post with new SEO data
    await blogService.updatePost(postId, {
      seoTitle: enhancedPost.seoTitle,
      seoDescription: enhancedPost.seoDescription,
      seoKeywords: enhancedPost.seoKeywords
    });
    
    return enhancedPost;
  } catch {
  }
}

/**
 * Regenerate SEO for all posts
 */
export async function regenerateAllPostsSEO() {
  try {
    
    // Get all posts
    const posts = await blogService.getAllPosts();
    
    if (!posts || posts.length === 0) {
      return;
    }
    
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const post of posts) {
      try {
        await regeneratePostSEO(post.id);
        successCount++;
      } catch {
        errorCount++;
      }
    }
    
  } catch {
  }
}

/**
 * Check SEO status for all posts
 */
export async function checkSEOStatus() {
  try {
    
    const posts = await blogService.getAllPosts();
    
    if (!posts || posts.length === 0) {
      return;
    }
    
    let withSEO = 0;
    let withoutSEO = 0;
    let needsUpdate = 0;
    
    posts.forEach(post => {
      if (post.seoTitle && post.seoDescription && post.seoKeywords?.length > 0) {
        withSEO++;
        
        // Check if SEO looks auto-generated (contains target keywords)
        const hasTargetKeywords = post.seoKeywords.some(keyword => 
          keyword.toLowerCase().includes('esim') || 
          keyword.toLowerCase().includes('travel') ||
          keyword.toLowerCase().includes('backpacker') ||
          keyword.toLowerCase().includes('nomad')
        );
        
        if (!hasTargetKeywords) {
          needsUpdate++;
        }
      } else {
        withoutSEO++;
      }
    });
    
    return {
      total: posts.length,
      withSEO,
      withoutSEO,
      needsUpdate
    };
    
  } catch {
  }
}

// Export for use in admin panel or console
const seoAdminUtils = {
  regeneratePostSEO,
  regenerateAllPostsSEO,
  checkSEOStatus
};

export default seoAdminUtils;
