import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'הגדרות - Simnetiq',
  description: 'נהל את הגדרות החשבון שלך, מידע אישי והעדפות אבטחה.',
  openGraph: {
    title: 'הגדרות - Simnetiq',
    description: 'נהל את הגדרות החשבון שלך, מידע אישי והעדפות אבטחה.',
    url: '/he/settings',
  },
  alternates: {
    canonical: '/he/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
