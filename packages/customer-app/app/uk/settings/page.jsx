import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'Налаштування - Simnetiq',
  description: 'Керуйте налаштуваннями акаунту, особистою інформацією та параметрами безпеки.',
  openGraph: {
    title: 'Налаштування - Simnetiq',
    description: 'Керуйте налаштуваннями акаунту, особистою інформацією та параметрами безпеки.',
    url: '/uk/settings',
  },
  alternates: {
    canonical: '/uk/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
