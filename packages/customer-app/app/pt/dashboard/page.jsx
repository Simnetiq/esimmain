import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'Painel - Planos eSIM',
  description: 'Gerencie seus planos eSIM, veja o uso e acesse as configuracoes da sua conta.',
  keywords: ['painel eSIM', 'gerenciamento de conta', 'rastreamento de uso'],
  openGraph: {
    title: 'Painel - Planos eSIM',
    description: 'Gerencie seus planos eSIM, veja o uso e acesse as configuracoes da sua conta.',
    url: '/pt/dashboard',
  },
  alternates: {
    canonical: '/pt/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
