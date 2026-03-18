export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store'

  const protectedPaths = [
    '/dashboard',
    '/*/dashboard',
    '/checkout',
    '/*/checkout',
    '/cart',
    '/*/cart',
    '/crypto-checkout',
    '/*/crypto-checkout',
    '/payment-success',
    '/*/payment-success',
    '/transactions',
    '/*/transactions',
    '/settings',
    '/*/settings',
  ]

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
          ...protectedPaths,
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        crawlDelay: 0,
        disallow: ['/admin', '/admin/*', '/api/', ...protectedPaths],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        crawlDelay: 0,
        disallow: ['/admin', '/admin/*', '/api/', ...protectedPaths],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
