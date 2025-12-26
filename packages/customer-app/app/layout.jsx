import { Suspense } from 'react'
import Script from 'next/script'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Heebo, IBM_Plex_Sans_Arabic, Rubik, DM_Sans } from 'next/font/google'
import Providers from '../src/components/Providers'
import ConditionalNavbar from '../src/components/ConditionalNavbar'
import ConditionalFooter from '../src/components/ConditionalFooter'
import CookieConsent from '../src/components/CookieConsent'
import FacebookPixel from '../src/components/FacebookPixel'
import Analytics from '../src/components/Analytics'
import LanguageWrapper from '../src/components/LanguageWrapper'
import ScrollToTop from '../src/components/ScrollToTop'
import DynamicHtmlLang from '../src/components/DynamicHtmlLang'
import { metadata as metadataConfig, generateAlternates } from '../src/config/metadata'
import './globals.css'
import './rtl.css'

// Configure main font - DM Sans (optimized for LCP)
// Using variable font for better performance and smaller bundle
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
})

// RTL fonts - use 'optional' display to prevent layout shift and reduce LCP
// These fonts only load when actually needed (RTL language detected)
const heebo = Heebo({
  subsets: ['hebrew'],
  weight: ['400', '600', '700'],
  variable: '--font-heebo',
  display: 'optional', // Prevents blocking render if font fails to load
  preload: false,
  fallback: ['system-ui', 'sans-serif'],
})

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '600', '700'],
  variable: '--font-ibm-plex-arabic',
  display: 'optional',
  preload: false,
  fallback: ['system-ui', 'sans-serif'],
})

const rubik = Rubik({
  subsets: ['hebrew'],
  weight: ['400', '600', '700'],
  variable: '--font-rubik',
  display: 'optional',
  preload: false,
  fallback: ['system-ui', 'sans-serif'],
})

// Use English metadata as default
const defaultMetadata = metadataConfig.en

export const metadata = {
  title: defaultMetadata.title,
  description: defaultMetadata.description,
  keywords: defaultMetadata.keywords,
  authors: [{ name: 'Simnetiq Team' }],
  creator: 'Simnetiq',
  publisher: 'Simnetiq',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store'),  
  alternates: generateAlternates('/'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: defaultMetadata.openGraph.title,
    description: defaultMetadata.openGraph.description,
    siteName: 'Simnetiq',
    images: [
      {
        url: '/images/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Simnetiq - Global eSIM for Seamless Travel Connectivity',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultMetadata.openGraph.title,
    description: defaultMetadata.openGraph.description,
    images: ['/images/og-image.svg'],
  },
  icons: {  
    icon: [
      { url: '/images/logo_icon/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/logo_icon/favicon.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/images/logo_icon/ioslogo.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/images/logo_icon/logo.png',
        color: '#468BE6',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'F7cbfkFHQvvD8JlIkLk4G9xn2tdi8HPtaMHcnlf9L0w',
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION,
  },
}

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Preload critical translation file with high priority */}
        <link 
          rel="preload" 
          href="/locales/en/common.json" 
          as="fetch" 
          type="application/json"
          crossOrigin="anonymous"
        />
        
        {/* Preconnect to Airalo CDN for country flag images */}
        <link rel="preconnect" href="https://cdn.airalo.com" />

        {/* DNS prefetch for non-critical third-party domains (deferred loading) */}
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        
        {/* Scroll to top on page load/refresh */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('scrollRestoration' in history) {
                history.scrollRestoration = 'manual';
              }
              window.addEventListener('beforeunload', function() {
                window.scrollTo(0, 0);
              });
            `,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/images/logo_icon/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/images/logo_icon/ioslogo.png" />
        
        {/* Stripe.js preconnect for faster loading when needed */}
        <link rel="preconnect" href="https://js.stripe.com" />
        
        <meta name="theme-color" content="#468BE6" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Simnetiq",
              "url": "https://www.simnetiq.store",
              "logo": "https://www.simnetiq.store/images/logo_icon/logo.png",
              "description": "Global eSIM plans for travelers, backpackers, and digital nomads. Instant activation in 200+ countries.",
              "sameAs": [
                "https://twitter.com/Simnetiq",
                "https://facebook.com/Simnetiq"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "availableLanguage": ["English", "Spanish", "French", "German", "Arabic", "Hebrew", "Russian"]
              }
            })
          }}
        />
      </head>
      <body suppressHydrationWarning className={`${dmSans.variable} ${heebo.variable} ${ibmPlexArabic.variable} ${rubik.variable}`}>
        <Providers>
          <LanguageWrapper>
            <DynamicHtmlLang />
            <ScrollToTop />
            <Suspense fallback={null}>
              <Analytics />
            </Suspense>
            <div className="bg-white min-h-screen overflow-x-hidden max-w-full">
              <ConditionalNavbar />
              <main className="pt-12 overflow-x-hidden">  
                {children}
              </main>
              <ConditionalFooter/>
              <CookieConsent />
              <FacebookPixel />
            </div>
          </LanguageWrapper>
        </Providers>
        {/* Stripe.js loaded with lazyOnload for better performance */}
        <Script
          src="https://js.stripe.com/v3/"
          strategy="lazyOnload"
        />
        <SpeedInsights />
      </body>
    </html>
  )
}
