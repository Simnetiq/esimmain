import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'الإعدادات - Simnetiq',
  description: 'إدارة إعدادات حسابك ومعلوماتك الشخصية وتفضيلات الأمان.',
  openGraph: {
    title: 'الإعدادات - Simnetiq',
    description: 'إدارة إعدادات حسابك ومعلوماتك الشخصية وتفضيلات الأمان.',
    url: '/ar/settings',
  },
  alternates: {
    canonical: '/ar/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
