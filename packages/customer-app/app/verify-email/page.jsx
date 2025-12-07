import { Suspense } from 'react'
import VerifyEmail from '../../src/components/VerifyEmail'
import Loading from '../../src/components/Loading'
import AuthRedirect from '../../src/components/AuthRedirect'

export const metadata = {
  title: 'Verify Email - eSIM Plans',
  description: 'Verify your email address to complete your account setup.',
  keywords: ['verify email', 'email verification', 'eSIM account', 'account verification'],
  openGraph: {
    title: 'Verify Email - eSIM Plans',
    description: 'Verify your email address to complete your account setup.',
    url: '/verify-email',
  },
  alternates: {
    canonical: '/verify-email',
  },
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AuthRedirect redirectTo="/dashboard">
        <VerifyEmail />
      </AuthRedirect>
    </Suspense>
  )
}
