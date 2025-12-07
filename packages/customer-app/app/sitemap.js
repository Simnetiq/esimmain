import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';
  
  // Supported languages
  const languages = ['en', 'es', 'fr', 'de', 'ar', 'he', 'ru'];
  
  // Static pages - Main
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

  // User pages (lower priority, no index)
  const userPages = [
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/forgot-password`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.2,
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

  // Multilingual pages
  const multilingualPages = [];
  const mainPages = ['', '/blog', '/contact', '/esim-plans', '/affiliate-program', '/jobs'];
  const userPagesMultilang = ['/dashboard', '/login', '/register'];
  
  languages.forEach(lang => {
    if (lang !== 'en') { // English is the default, no prefix needed
      // Main pages with higher priority
      mainPages.forEach(page => {
        multilingualPages.push({
          url: `${baseUrl}/${lang}${page}`,
          lastModified: new Date(),
          changeFrequency: page === '/blog' ? 'daily' : page === '' ? 'daily' : page === '/esim-plans' ? 'daily' : 'weekly',
          priority: page === '' ? 0.9 : page === '/blog' ? 0.8 : page === '/esim-plans' ? 0.85 : 0.6,
        });
      });
      
      // User pages with lower priority
      userPagesMultilang.forEach(page => {
        multilingualPages.push({
          url: `${baseUrl}/${lang}${page}`,
          lastModified: new Date(),
          changeFrequency: 'monthly',
          priority: 0.3,
        });
      });
    }
  });

  // Fetch blog posts dynamically
  let blogPosts = [];
  try {
    // Fetch all published blog posts
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
      
      // Add blog post URL
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
    ...userPages,
    ...legalPages,
    ...multilingualPages,
    ...blogPosts,
    ...jobPages,
  ];
}
