/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Allow external image domains (using remotePatterns - domains is deprecated)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.airalo.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn-revamp.airalo.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'eujmomonscnlmwcbkbfy.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Experimental features for better performance
  experimental: {
    // Disabled optimizeCss - it bundles CSS into render-blocking chunks
    // optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@react-email/components',
      '@tanstack/react-query',
      'react-hot-toast',
      '@stripe/stripe-js',
      '@stripe/react-stripe-js',
    ],
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/locales/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
      {
        // Add CSP headers for all pages to allow Stripe resources
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://googleads.g.doubleclick.net https://www.googleadservices.com https://www.google.com https://www.gstatic.com https://apis.google.com https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com https://js.stripe.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://api.stripe.com https://*.googleapis.com https://www.google-analytics.com https://www.googletagmanager.com https://region1.google-analytics.com https://*.analytics.google.com https://www.google.com https://*.google.com https://*.doubleclick.net https://googleads.g.doubleclick.net https://vercel.live https://*.supabase.co https://appleid.apple.com",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://td.doubleclick.net https://www.google.com https://www.googletagmanager.com https://www.recaptcha.net https://accounts.google.com https://appleid.apple.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://checkout.stripe.com https://appleid.apple.com",
              "frame-ancestors 'self'"
            ].join('; ')
          }
        ]
      }
    ];
  },

  // Acknowledge Turbopack (Next.js 16 default)
  turbopack: {},

  // Transpile shared package
  transpilePackages: ['@esim/shared'],
};

module.exports = nextConfig;
