import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'Dashboard - Piani eSIM',
  description: 'Gestisci i tuoi piani eSIM, visualizza l\'utilizzo e accedi alle impostazioni del tuo account.',
  keywords: ['eSIM Dashboard', 'Gestione account', 'Monitoraggio utilizzo'],
  openGraph: {
    title: 'Dashboard - Piani eSIM',
    description: 'Gestisci i tuoi piani eSIM, visualizza l\'utilizzo e accedi alle impostazioni del tuo account.',
    url: '/it/dashboard',
  },
  alternates: {
    canonical: '/it/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
