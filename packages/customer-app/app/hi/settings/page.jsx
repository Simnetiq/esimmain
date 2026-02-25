import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'सेटिंग्स - Simnetiq',
  description: 'अपनी अकाउंट सेटिंग्स, व्यक्तिगत जानकारी और सुरक्षा प्राथमिकताएं प्रबंधित करें।',
  openGraph: {
    title: 'सेटिंग्स - Simnetiq',
    description: 'अपनी अकाउंट सेटिंग्स, व्यक्तिगत जानकारी और सुरक्षा प्राथमिकताएं प्रबंधित करें।',
    url: '/hi/settings',
  },
  alternates: {
    canonical: '/hi/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
