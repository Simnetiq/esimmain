import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'Панель - Плани eSIM',
  description: 'Керуйте планами eSIM, переглядайте використання та налаштування акаунту.',
  keywords: ['панель eSIM', 'керування акаунтом', 'відстеження використання'],
  openGraph: {
    title: 'Панель - Плани eSIM',
    description: 'Керуйте планами eSIM, переглядайте використання та налаштування акаунту.',
    url: '/uk/dashboard',
  },
  alternates: {
    canonical: '/uk/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
