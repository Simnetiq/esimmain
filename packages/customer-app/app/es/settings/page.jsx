import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'Configuración - Simnetiq',
  description: 'Administra la configuración de tu cuenta, información personal y preferencias de seguridad.',
  openGraph: {
    title: 'Configuración - Simnetiq',
    description: 'Administra la configuración de tu cuenta, información personal y preferencias de seguridad.',
    url: '/es/settings',
  },
  alternates: {
    canonical: '/es/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
