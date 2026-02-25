import { Suspense } from 'react'
// dynamic import moved to ClientOnlyScripts
import { Open_Sans, IBM_Plex_Sans_Arabic, DM_Sans, IBM_Plex_Sans } from 'next/font/google'
import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import Providers from '../src/components/Providers'
import ConditionalNavbar from '../src/components/ConditionalNavbar'
import ConditionalFooter from '../src/components/ConditionalFooter'
import Analytics from '../src/components/Analytics'
import LanguageWrapper from '../src/components/LanguageWrapper'
import ScrollToTop from '../src/components/ScrollToTop'
import DynamicHtmlLang from '../src/components/DynamicHtmlLang'
import { metadata as metadataConfig, generateAlternates } from '../src/config/metadata'
import './globals.css'

import ClientOnlyScripts from '../src/components/ClientOnlyScripts'
// RTL CSS is now loaded dynamically only when needed by DynamicHtmlLang component
// This reduces render-blocking CSS for 97% of users (LTR languages)

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

// Open Sans — Hebrew + Russian/Ukrainian (Cyrillic) support
const openSans = Open_Sans({
  subsets: ['hebrew', 'cyrillic', 'latin'],
  weight: ['400', '600', '700'],
  variable: '--font-open-sans',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'sans-serif'],
})

// IBM Plex Sans Arabic — Arabic support
const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '600', '700'],
  variable: '--font-ibm-plex-arabic',
  display: 'optional',
  preload: false,
  fallback: ['system-ui', 'sans-serif'],
})

// IBM Plex Sans Italic for "anywhere" text in EN/DE hero headlines
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400'],
  style: ['italic'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
  preload: true,
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
        {/* Preload critical translation file with high priority */}
        <link
          rel="preload"
          href="/locales/en/common.json"
          as="fetch"
          type="application/json"
          crossOrigin="anonymous"
        />

        {/* DNS prefetch for non-critical third-party domains */}
        <link rel="dns-prefetch" href="https://cdn.airalo.com" />

        {/* Preconnect to Supabase for faster auth/db initialization */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}

        {/* DNS prefetch for non-critical third-party domains (deferred loading) */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/images/logo_icon/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/images/logo_icon/ioslogo.png" />
        
        {/* Stripe.js - only dns-prefetch since it's not needed on every page */}
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        
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
                "availableLanguage": ["English", "Spanish", "French", "German", "Arabic", "Hebrew", "Hindi", "Japanese", "Polish", "Portuguese", "Russian", "Ukrainian", "Chinese"]
              }
            })
          }}
        />
      </head>
      <body suppressHydrationWarning className={`${dmSans.variable} ${openSans.variable} ${ibmPlexArabic.variable} ${ibmPlexSans.variable}`}>
        <Providers>
          <LanguageWrapper>
            <DynamicHtmlLang />
            <ScrollToTop />
            <Suspense fallback={null}>
              <Analytics />
            </Suspense>
            <div className="bg-white min-h-screen overflow-x-hidden max-w-full relative">
              {/* Grid Pattern Rails — single source, continuous across all pages */}
              <div
                className="hidden xl:block absolute left-0 top-0 bottom-0 w-32 z-50 pointer-events-none"
                style={{
                  backgroundSize: '10px 10px',
                  backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
                }}
              />
              <div
                className="hidden xl:block absolute right-0 top-0 bottom-0 w-32 z-50 pointer-events-none"
                style={{
                  backgroundSize: '10px 10px',
                  backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
                }}
              />
              <ConditionalNavbar />
              <main className="pt-12 overflow-x-hidden">
                {children}
              </main>
              <ConditionalFooter/>
              <ClientOnlyScripts />
            </div>
          </LanguageWrapper>
        </Providers>
        <VercelAnalytics />

      </body>
    </html>
  )
}
