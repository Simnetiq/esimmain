import { DM_Sans } from 'next/font/google'
import './globals.css'
import './App.css'
import Providers from '../src/components/Providers'

// Configure DM Sans font
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata = {
  title: 'Admin Dashboard - eSIM Management',
  description: 'Administrative dashboard for managing eSIM plans, users, and system configuration.',
  robots: 'noindex, nofollow',
}

export default function RootLayout({ children }) {
  return (  
    <html lang="en">
      <head>
        {/* Preconnect to Google Fonts for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={dmSans.variable}>
        <Providers>
            {children}
        </Providers>
      </body>
    </html>
  )
}

