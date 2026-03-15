import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'Ayarlar - Hesap',
  description: 'Hesap ayarlarınızı, kişisel bilgilerinizi ve güvenlik ayarlarınızı yönetin.',
  openGraph: {
    title: 'Ayarlar - Hesap',
    description: 'Hesap ayarlarınızı, kişisel bilgilerinizi ve güvenlik ayarlarınızı yönetin.',
    url: '/tr/settings',
  },
  alternates: {
    canonical: '/tr/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
