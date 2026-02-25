import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'Ustawienia - Simnetiq',
  description: 'Zarządzaj ustawieniami konta, danymi osobowymi i preferencjami bezpieczeństwa.',
  openGraph: {
    title: 'Ustawienia - Simnetiq',
    description: 'Zarządzaj ustawieniami konta, danymi osobowymi i preferencjami bezpieczeństwa.',
    url: '/pl/settings',
  },
  alternates: {
    canonical: '/pl/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
