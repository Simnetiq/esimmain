import { Suspense } from 'react'
import Settings from '../../src/components/Settings'
import Loading from '../../src/components/Loading'

export const metadata = {
  title: 'Settings - Simnetiq',
  description: 'Manage your account settings, personal information, and security preferences.',
  keywords: ['account settings', 'profile settings', 'security'],
  openGraph: {
    title: 'Settings - Simnetiq',
    description: 'Manage your account settings, personal information, and security preferences.',
    url: '/settings',
  },
  alternates: {
    canonical: '/settings',
  },
}

export default function SettingsPage() {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <Settings />
      </Suspense>
    </>
  )
}
