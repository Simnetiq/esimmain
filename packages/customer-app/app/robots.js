export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/*',
          '/api/',
          '/_next/',
          '/static/',
          '/dashboard',
          '/checkout',
          '/cart',
          '/crypto-checkout',
          '/payment-success',
          '/transactions',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        crawlDelay: 0,
        disallow: [
          '/admin',
          '/admin/*',
          '/api/',
          '/dashboard',
          '/checkout',
          '/cart',
          '/crypto-checkout',
          '/payment-success',
          '/transactions',
        ],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        crawlDelay: 0,
        disallow: [
          '/admin',
          '/admin/*',
          '/api/',
          '/dashboard',
          '/checkout',
          '/cart',
          '/crypto-checkout',
          '/payment-success',
          '/transactions',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
