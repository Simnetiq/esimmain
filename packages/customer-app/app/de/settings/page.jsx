import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'Einstellungen - Simnetiq',
  description: 'Verwalten Sie Ihre Kontoeinstellungen, persönliche Informationen und Sicherheitseinstellungen.',
  openGraph: {
    title: 'Einstellungen - Simnetiq',
    description: 'Verwalten Sie Ihre Kontoeinstellungen, persönliche Informationen und Sicherheitseinstellungen.',
    url: '/de/settings',
  },
  alternates: {
    canonical: '/de/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
