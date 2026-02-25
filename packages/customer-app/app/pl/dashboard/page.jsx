import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'Panel - Plany eSIM',
  description: 'Zarządzaj planami eSIM, sprawdzaj zużycie i ustawienia konta.',
  keywords: ['panel eSIM', 'zarządzanie kontem', 'śledzenie zużycia'],
  openGraph: {
    title: 'Panel - Plany eSIM',
    description: 'Zarządzaj planami eSIM, sprawdzaj zużycie i ustawienia konta.',
    url: '/pl/dashboard',
  },
  alternates: {
    canonical: '/pl/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
