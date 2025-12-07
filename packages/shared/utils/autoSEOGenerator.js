/**
 * Auto-SEO Generation Utility for Blog Posts
 * Automatically generates SEO-optimized titles, descriptions, and keywords
 * based on post content and target keywords
 */

// Target keywords for SEO optimization
const TARGET_KEYWORDS = [
  'eSIM plans',
  'eSIM backpackers',
  'eSIM travelers',
  'digital nomads eSIM',
  'Airalo vs Simnetiq',
  'Simnetiq vs eSIMo',
  'best eSIM for travelers',
  'backpacker mobile data',
  'nomad internet plans',
  'travel eSIM comparison',
  'global eSIM plans',
  'instant eSIM activation',
  'worldwide mobile data',
  'eSIM data plans',
  'international roaming',
  'travel internet',
  'global connectivity',
  'mobile data plans'
];

// SEO templates for different content types
const SEO_TEMPLATES = {
  comparison: {
    title: '{primaryKeyword} vs {secondaryKeyword} - Complete Comparison | Simnetiq',
    description: 'Compare {primaryKeyword} vs {secondaryKeyword}. Find the best eSIM solution for travelers, backpackers, and digital nomads. Global coverage, instant activation, competitive pricing.',
    keywords: ['{primaryKeyword}', '{secondaryKeyword}', 'eSIM comparison', 'travel eSIM', 'best eSIM']
  },
  guide: {
    title: '{primaryKeyword} Guide for {targetAudience} | Simnetiq',
    description: 'Complete {primaryKeyword} guide for {targetAudience}. Learn how to choose the best eSIM plans, compare providers, and stay connected worldwide.',
    keywords: ['{primaryKeyword}', '{targetAudience}', 'eSIM guide', 'travel connectivity', 'mobile data']
  },
  review: {
    title: '{primaryKeyword} Review - Is It Worth It? | Simnetiq',
    description: 'Honest {primaryKeyword} review. Compare features, pricing, and coverage for travelers and digital nomads. Find out if it\'s the right choice for you.',
    keywords: ['{primaryKeyword}', 'eSIM review', 'travel eSIM', 'mobile data review', 'connectivity']
  },
  tips: {
    title: '{primaryKeyword} Tips for {targetAudience} | Simnetiq',
    description: 'Essential {primaryKeyword} tips for {targetAudience}. Save money, stay connected, and make the most of your travel experience with these expert tips.',
    keywords: ['{primaryKeyword}', '{targetAudience}', 'travel tips', 'eSIM tips', 'connectivity tips']
  },
  default: {
    title: '{primaryKeyword} - Everything You Need to Know | Simnetiq',
    description: 'Complete guide to {primaryKeyword}. Perfect for travelers, backpackers, and digital nomads. Global coverage, instant activation, competitive pricing.',
    keywords: ['{primaryKeyword}', 'eSIM plans', 'travel connectivity', 'mobile data', 'global coverage']
  }
};

/**
 * Extract keywords from text content
 */
function extractKeywords(text, maxKeywords = 8) {
  if (!text) return [];
  
  // Convert to lowercase and remove special characters
  const cleanText = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
  
  // Split into words and filter out common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
    'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs'
  ]);
  
  const words = cleanText.split(' ')
    .filter(word => word.length > 2 && !stopWords.has(word))
    .filter(word => TARGET_KEYWORDS.some(keyword => keyword.toLowerCase().includes(word) || word.includes(keyword.toLowerCase())));
  
  // Count word frequency
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // Sort by frequency and return top keywords
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Detect content type based on title and content
 */
function detectContentType(title, content) {
  const titleLower = title.toLowerCase();
  const contentLower = content ? content.toLowerCase() : '';
  
  if (titleLower.includes('vs') || titleLower.includes('vs.') || titleLower.includes('comparison') || titleLower.includes('compare') ||
      contentLower.includes('comparison') || contentLower.includes('compare')) {
    return 'comparison';
  }
  if (titleLower.includes('guide') || titleLower.includes('how to') || titleLower.includes('tutorial') ||
      contentLower.includes('guide') || contentLower.includes('tutorial')) {
    return 'guide';
  }
  if (titleLower.includes('review') || titleLower.includes('tested') || titleLower.includes('analysis') ||
      contentLower.includes('review') || contentLower.includes('tested')) {
    return 'review';
  }
  if (titleLower.includes('tips') || titleLower.includes('tricks') || titleLower.includes('advice') ||
      contentLower.includes('tips') || contentLower.includes('tricks')) {
    return 'tips';
  }
  
  return 'default';
}

/**
 * Detect target audience from content
 */
function detectTargetAudience(content) {
  const contentLower = content.toLowerCase();
  
  if (contentLower.includes('backpacker') || contentLower.includes('budget travel')) {
    return 'backpackers';
  }
  if (contentLower.includes('digital nomad') || contentLower.includes('remote work')) {
    return 'digital nomads';
  }
  if (contentLower.includes('business travel') || contentLower.includes('corporate')) {
    return 'business travelers';
  }
  if (contentLower.includes('family travel') || contentLower.includes('family vacation')) {
    return 'families';
  }
  
  return 'travelers';
}

/**
 * Generate SEO title
 */
function generateSEOTitle(title, content, contentType, targetAudience) {
  const extractedKeywords = extractKeywords(title + ' ' + content, 3);
  const primaryKeyword = extractedKeywords[0] || 'eSIM plans';
  
  let template = SEO_TEMPLATES[contentType] || SEO_TEMPLATES.default;
  let seoTitle = template.title;
  
  // Replace placeholders
  seoTitle = seoTitle.replace('{primaryKeyword}', primaryKeyword);
  seoTitle = seoTitle.replace('{secondaryKeyword}', extractedKeywords[1] || 'competitors');
  seoTitle = seoTitle.replace('{targetAudience}', targetAudience);
  
  // Ensure title is not too long (max 60 characters for SEO)
  if (seoTitle.length > 60) {
    seoTitle = seoTitle.substring(0, 57) + '...';
  }
  
  return seoTitle;
}

/**
 * Generate SEO description
 */
function generateSEODescription(title, content, contentType, targetAudience) {
  const extractedKeywords = extractKeywords(title + ' ' + content, 3);
  const primaryKeyword = extractedKeywords[0] || 'eSIM plans';
  
  let template = SEO_TEMPLATES[contentType] || SEO_TEMPLATES.default;
  let seoDescription = template.description;
  
  // Replace placeholders
  seoDescription = seoDescription.replace('{primaryKeyword}', primaryKeyword);
  seoDescription = seoDescription.replace('{secondaryKeyword}', extractedKeywords[1] || 'competitors');
  seoDescription = seoDescription.replace('{targetAudience}', targetAudience);
  
  // Ensure description is not too long (max 160 characters for SEO)
  if (seoDescription.length > 160) {
    seoDescription = seoDescription.substring(0, 157) + '...';
  }
  
  return seoDescription;
}

/**
 * Generate SEO keywords
 */
function generateSEOKeywords(title, content, contentType, targetAudience) {
  const extractedKeywords = extractKeywords(title + ' ' + content, 5);
  const primaryKeyword = extractedKeywords[0] || 'eSIM plans';
  
  let template = SEO_TEMPLATES[contentType] || SEO_TEMPLATES.default;
  let keywords = [...template.keywords];
  
  // Replace placeholders in keywords
  keywords = keywords.map(keyword => {
    return keyword
      .replace('{primaryKeyword}', primaryKeyword)
      .replace('{secondaryKeyword}', extractedKeywords[1] || 'competitors')
      .replace('{targetAudience}', targetAudience);
  });
  
  // Add extracted keywords
  keywords = [...keywords, ...extractedKeywords];
  
  // Add target audience specific keywords
  if (targetAudience === 'backpackers') {
    keywords.push('backpacker mobile data', 'budget travel internet');
  } else if (targetAudience === 'digital nomads') {
    keywords.push('nomad internet plans', 'remote work connectivity');
  } else if (targetAudience === 'business travelers') {
    keywords.push('business travel eSIM', 'corporate mobile data');
  }
  
  // Remove duplicates and limit to 10 keywords
  const uniqueKeywords = [...new Set(keywords)].slice(0, 10);
  
  return uniqueKeywords;
}

/**
 * Main function to generate SEO data for a blog post
 */
export function generateAutoSEO(postData) {
  try {
    const { title, content, excerpt } = postData;
    
    if (!title || !content) {
      return {
        seoTitle: title || '',
        seoDescription: excerpt || '',
        seoKeywords: ['eSIM plans', 'travel connectivity', 'mobile data']
      };
    }
    
    // Detect content characteristics
    const contentType = detectContentType(title, content);
    const targetAudience = detectTargetAudience(content);
    
    // Generate SEO data
    const seoTitle = generateSEOTitle(title, content, contentType, targetAudience);
    const seoDescription = generateSEODescription(title, content, contentType, targetAudience);
    const seoKeywords = generateSEOKeywords(title, content, contentType, targetAudience);
    
    return {
      seoTitle,
      seoDescription,
      seoKeywords
    };
  } catch (error) {
    console.error('Error generating auto SEO:', error);
    return {
      seoTitle: postData.title || '',
      seoDescription: postData.excerpt || '',
      seoKeywords: ['eSIM plans', 'travel connectivity', 'mobile data']
    };
  }
}

/**
 * Update existing post data with auto-generated SEO
 */
export function enhancePostWithAutoSEO(postData) {
  const autoSEO = generateAutoSEO(postData);
  
  return {
    ...postData,
    seoTitle: autoSEO.seoTitle,
    seoDescription: autoSEO.seoDescription,
    seoKeywords: autoSEO.seoKeywords
  };
}

const autoSEOGenerator = {
  generateAutoSEO,
  enhancePostWithAutoSEO,
  extractKeywords,
  detectContentType,
  detectTargetAudience
};

export default autoSEOGenerator;
