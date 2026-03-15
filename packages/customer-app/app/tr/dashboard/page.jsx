import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'Panel - eSIM Planları',
  description: 'eSIM planlarınızı yönetin, kullanımınızı görüntüleyin ve hesap ayarlarınıza erişin.',
  keywords: ['eSIM Panel', 'Hesap yönetimi', 'Kullanım takibi'],
  openGraph: {
    title: 'Panel - eSIM Planları',
    description: 'eSIM planlarınızı yönetin, kullanımınızı görüntüleyin ve hesap ayarlarınıza erişin.',
    url: '/tr/dashboard',
  },
  alternates: {
    canonical: '/tr/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
