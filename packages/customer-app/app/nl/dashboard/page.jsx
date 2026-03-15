import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'Dashboard - eSIM-plannen',
  description: 'Beheer je eSIM-plannen, bekijk je gebruik en toegang tot je accountinstellingen.',
  keywords: ['eSIM Dashboard', 'Accountbeheer', 'Gebruiksbewaking'],
  openGraph: {
    title: 'Dashboard - eSIM-plannen',
    description: 'Beheer je eSIM-plannen, bekijk je gebruik en toegang tot je accountinstellingen.',
    url: '/nl/dashboard',
  },
  alternates: {
    canonical: '/nl/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
