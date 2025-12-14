import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'Настройки - Simnetiq',
  description: 'Управляйте настройками учетной записи, личной информацией и параметрами безопасности.',
  openGraph: {
    title: 'Настройки - Simnetiq',
    description: 'Управляйте настройками учетной записи, личной информацией и параметрами безопасности.',
    url: '/ru/settings',
  },
  alternates: {
    canonical: '/ru/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
