import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'Configuracoes - Simnetiq',
  description: 'Gerencie as configuracoes da sua conta, informacoes pessoais e preferencias de seguranca.',
  openGraph: {
    title: 'Configuracoes - Simnetiq',
    description: 'Gerencie as configuracoes da sua conta, informacoes pessoais e preferencias de seguranca.',
    url: '/pt/settings',
  },
  alternates: {
    canonical: '/pt/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
