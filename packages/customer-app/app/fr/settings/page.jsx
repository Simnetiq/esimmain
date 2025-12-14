import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'Paramètres - Simnetiq',
  description: 'Gérez les paramètres de votre compte, vos informations personnelles et vos préférences de sécurité.',
  openGraph: {
    title: 'Paramètres - Simnetiq',
    description: 'Gérez les paramètres de votre compte, vos informations personnelles et vos préférences de sécurité.',
    url: '/fr/settings',
  },
  alternates: {
    canonical: '/fr/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
