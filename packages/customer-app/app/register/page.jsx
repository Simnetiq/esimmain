import { Suspense } from 'react'
import Register from '../../src/components/Register'
import Loading from '../../src/components/Loading'
import AuthRedirect from '../../src/components/AuthRedirect'

export const metadata = {
  title: 'Register - Simnetiq',
  description: 'Create your Simnetiq account to start buying and managing global eSIM plans for your travels.',
  keywords: ['register', 'sign up', 'create account', 'Simnetiq account', 'travel eSIM registration'],
  openGraph: {
    title: 'Register - Simnetiq | Global eSIM Plans',
    description: 'Create your Simnetiq account to start buying and managing global eSIM plans for your travels.',
    url: '/register',
    images: [
      {
        url: '/images/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Simnetiq Register - Global eSIM Plans',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Register - Simnetiq | Global eSIM Plans',
    description: 'Create your Simnetiq account to start buying and managing global eSIM plans for your travels.',
    images: ['/images/og-image.svg'],
  },
  alternates: {
    canonical: '/register',
  },
}

export default function RegisterPage() {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <AuthRedirect redirectTo="/dashboard">
          <Register />
        </AuthRedirect>
      </Suspense>
    </>
  )
}
