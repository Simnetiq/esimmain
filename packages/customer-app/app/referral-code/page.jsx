import { Suspense } from 'react'
import ReferralCodeStep from '../../src/components/ReferralCodeStep'
import Loading from '../../src/components/Loading'
import AuthRedirect from '../../src/components/AuthRedirect'

export const metadata = {
  title: 'Referral Code - eSIM Plans',
  description: 'Enter a referral code to get started with eSIM Plans.',
  keywords: ['referral code', 'referral', 'eSIM plans', 'signup'],
  openGraph: {
    title: 'Referral Code - eSIM Plans',
    description: 'Enter a referral code to get started with eSIM Plans.',
    url: '/referral-code',
  },
  alternates: {
    canonical: '/referral-code',
  },
}

export default function ReferralCodePage() {
  return (
    <Suspense fallback={<Loading />}>
      <AuthRedirect redirectTo="/dashboard">
        <ReferralCodeStep />
      </AuthRedirect>
    </Suspense>
  )
}
