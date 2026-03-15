import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'Impostazioni - Account',
  description: 'Gestisci le impostazioni del tuo account, le informazioni personali e le impostazioni di sicurezza.',
  openGraph: {
    title: 'Impostazioni - Account',
    description: 'Gestisci le impostazioni del tuo account, le informazioni personali e le impostazioni di sicurezza.',
    url: '/it/settings',
  },
  alternates: {
    canonical: '/it/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
