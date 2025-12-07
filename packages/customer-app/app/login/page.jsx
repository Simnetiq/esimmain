import { Suspense } from 'react'
import Login from '../../src/components/Login'
import Loading from '../../src/components/Loading'
import AuthRedirect from '../../src/components/AuthRedirect'
import RTLWrapper from '../../src/components/RTLWrapper'

export const metadata = {
  title: 'Login - Simnetiq',
  description: 'Sign in to your Simnetiq account to manage your global eSIM plans and travel connectivity.',
  keywords: ['login', 'sign in', 'Simnetiq account', 'eSIM authentication', 'travel eSIM login'],
  openGraph: {
    title: 'Login - Simnetiq | Global eSIM Plans',
    description: 'Sign in to your Simnetiq account to manage your global eSIM plans and travel connectivity.',
    url: '/login',
    images: [
      {
        url: '/images/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Simnetiq Login - Global eSIM Plans',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Login - Simnetiq | Global eSIM Plans',
    description: 'Sign in to your Simnetiq account to manage your global eSIM plans and travel connectivity.',
    images: ['/images/og-image.svg'],
  },
  alternates: {
    canonical: '/login',
  },
}

export default function LoginPage() {
  return (
    <>
      <RTLWrapper>
        <Suspense fallback={<Loading />}>
          <AuthRedirect redirectTo="/dashboard">
            <Login />
          </AuthRedirect>
        </Suspense>
      </RTLWrapper>
    </>
  )
}
