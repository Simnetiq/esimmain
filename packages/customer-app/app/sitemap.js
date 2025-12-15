import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';
  
  // Supported languages
  const languages = ['en', 'es', 'fr', 'de', 'ar', 'he', 'ru'];
  
  // Static pages - Main (high priority, indexed)
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/esim-plans`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/affiliate-program`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/jobs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];

  // Login page (lower priority - users find via navigation)
  const authPages = [
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  // Legal pages
  const legalPages = [
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cookie-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/return-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Multilingual pages - generate for all non-English languages
  const multilingualPages = [];
  const mainPages = ['', '/blog', '/contact', '/esim-plans', '/affiliate-program', '/jobs', '/about'];
  const legalPagesMultilang = ['/privacy-policy', '/terms-of-service', '/cookie-policy', '/return-policy'];
  
  languages.forEach(lang => {
    if (lang !== 'en') {
      // Main pages with higher priority
      mainPages.forEach(page => {
        const priority = page === '' ? 0.9 
          : page === '/esim-plans' ? 0.85 
          : page === '/blog' ? 0.8 
          : 0.6;
        
        const changeFreq = (page === '' || page === '/blog' || page === '/esim-plans') ? 'daily' : 'weekly';
        
        multilingualPages.push({
          url: `${baseUrl}/${lang}${page}`,
          lastModified: new Date(),
          changeFrequency: changeFreq,
          priority: priority,
        });
      });
      
      // Legal pages in other languages
      legalPagesMultilang.forEach(page => {
        multilingualPages.push({
          url: `${baseUrl}/${lang}${page}`,
          lastModified: new Date(),
          changeFrequency: 'yearly',
          priority: 0.3,
        });
      });
      
      // Login page in other languages
      multilingualPages.push({
        url: `${baseUrl}/${lang}/login`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.4,
      });
    }
  });

  // Fetch blog posts dynamically
  let blogPosts = [];
  try {
    const blogsRef = collection(db, 'blogs_separate');
    const q = query(
      blogsRef,
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
      const post = doc.data();
      const slug = post.slug;
      const language = post.language || 'en';
      const lastModified = post.updatedAt?.toDate() || post.publishedAt?.toDate() || new Date();
      
      const blogUrl = language === 'en' 
        ? `${baseUrl}/blog/${slug}`
        : `${baseUrl}/${language}/blog/${slug}`;
      
      blogPosts.push({
        url: blogUrl,
        lastModified: lastModified,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });
  } catch (error) {
    console.error('Error fetching blog posts for sitemap:', error);
  }

  // Fetch job postings dynamically
  let jobPages = [];
  try {
    const jobsRef = collection(db, 'jobs');
    const jobsQuery = query(
      jobsRef,
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    
    const jobsSnapshot = await getDocs(jobsQuery);
    
    jobsSnapshot.forEach((doc) => {
      const job = doc.data();
      const lastModified = job.updatedAt?.toDate() || job.createdAt?.toDate() || new Date();
      
      jobPages.push({
        url: `${baseUrl}/jobs/${doc.id}`,
        lastModified: lastModified,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    });
  } catch (error) {
    console.error('Error fetching jobs for sitemap:', error);
  }

  // Combine all URLs
  return [
    ...staticPages,
    ...authPages,
    ...legalPages,
    ...multilingualPages,
    ...blogPosts,
    ...jobPages,
  ];
}
