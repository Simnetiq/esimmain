import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'Instellingen - Account',
  description: 'Beheer je accountinstellingen, persoonlijke gegevens en beveiligingsinstellingen.',
  openGraph: {
    title: 'Instellingen - Account',
    description: 'Beheer je accountinstellingen, persoonlijke gegevens en beveiligingsinstellingen.',
    url: '/nl/settings',
  },
  alternates: {
    canonical: '/nl/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
