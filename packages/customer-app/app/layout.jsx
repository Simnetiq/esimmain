import { Suspense } from 'react'
// dynamic import moved to ClientOnlyScripts
import { Open_Sans, IBM_Plex_Sans_Arabic, DM_Sans, IBM_Plex_Sans } from 'next/font/google'
import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import { headers } from 'next/headers'
import Providers from '../src/components/Providers'
import ConditionalNavbar from '../src/components/ConditionalNavbar'
import ConditionalFooter from '../src/components/ConditionalFooter'
import Analytics from '../src/components/Analytics'
import LanguageWrapper from '../src/components/LanguageWrapper'
import ScrollToTop from '../src/components/ScrollToTop'
import DynamicHtmlLang from '../src/components/DynamicHtmlLang'
import { metadata as metadataConfig, generateAlternates } from '../src/config/metadata'
import { getServerTranslations, getLocaleFromPathname } from '../src/lib/getServerTranslations'
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
        url: '/images/og-image.png',
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
    images: ['/images/og-image.png'],
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

export default async function RootLayout({ children }) {
  // Read locale from middleware-set header (server-side, no client dependency)
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || '/'
  const locale = getLocaleFromPathname(pathname)

  // Load translations from filesystem — synchronous read, cached per locale.
  // This ensures SSR HTML contains the correct translated text, eliminating
  // hydration mismatches caused by client-side-only translation loading.
  const initialTranslations = getServerTranslations(locale)

  return (
    <html lang={locale} dir={locale === 'ar' || locale === 'he' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        {/* Preload the CORRECT locale translation file with high priority */}
        <link
          rel="preload"
          href={`/locales/${locale}/common.json`}
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

        <meta name="theme-color" content="#0a0a0a" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Structured Data for SEO — Organization */}
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
                "https://apps.apple.com/app/simnetiq-esim/id6499061702"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "email": "support@simnetiq.store",
                "availableLanguage": ["English", "Spanish", "French", "German", "Arabic", "Hebrew", "Hindi", "Japanese", "Korean", "Dutch", "Polish", "Portuguese", "Russian", "Thai", "Turkish", "Ukrainian", "Chinese"]
              }
            })
          }}
        />
        {/* Structured Data — WebSite with SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Simnetiq",
              "url": "https://www.simnetiq.store",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://www.simnetiq.store/esim-plans?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        {/* Structured Data — SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Simnetiq",
              "operatingSystem": "iOS, Android",
              "applicationCategory": "TravelApplication",
              "description": "eSIM app for instant mobile data in 200+ countries. No roaming fees, instant activation.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "120"
              }
            })
          }}
        />
        {/* Structured Data — FAQPage */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "What is an eSIM and how does it work?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "An eSIM (embedded SIM) is a digital SIM card built into your device. Instead of inserting a physical SIM card, you can download and activate a cellular plan directly onto your device. This allows you to switch between carriers and plans without needing to swap physical cards."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Which devices support eSIM?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Most modern smartphones support eSIM, including iPhone XS and newer, Google Pixel 3 and newer, Samsung Galaxy S20 and newer, and many others. Check your device settings or contact us to confirm compatibility."
                  }
                },
                {
                  "@type": "Question",
                  "name": "How do I activate my eSIM?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "After purchase, you'll receive a QR code via email. Simply scan this code with your device's camera in the cellular settings, and your eSIM will be activated automatically. Detailed instructions are provided for each device type."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What payment methods do you accept?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "We accept all major credit cards (Visa, Mastercard, American Express), Apple Pay, Google Pay, and various local payment methods. All payments are processed securely through Stripe."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Can I get a refund if I'm not satisfied?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes, we offer a 7-day money-back guarantee for unused data plans. If you haven't activated your eSIM or used any data, you can request a full refund within 7 days of purchase."
                  }
                },
                {
                  "@type": "Question",
                  "name": "My eSIM isn't connecting to the network. What should I do?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "First, ensure you're in an area with network coverage. Try restarting your device, toggling airplane mode on/off, or manually selecting the network in your cellular settings. If issues persist, contact our support team."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Can I use my eSIM for calls and SMS?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Our eSIM plans are primarily data-only. However, you can use VoIP services like WhatsApp, Skype, or FaceTime for calls and messaging over your data connection."
                  }
                },
                {
                  "@type": "Question",
                  "name": "How do I check my data usage?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "You can monitor your data usage through your device's settings or our mobile app. We also send notifications when you're approaching your data limit."
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body className={`${dmSans.variable} ${openSans.variable} ${ibmPlexArabic.variable} ${ibmPlexSans.variable}`}>
        <Providers>
          <LanguageWrapper initialTranslations={initialTranslations} initialLocale={locale}>
            <DynamicHtmlLang />
            <ScrollToTop />
            <Suspense fallback={null}>
              <Analytics />
            </Suspense>
            <div className="min-h-screen overflow-x-hidden max-w-full relative">
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
