import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'डैशबोर्ड - eSIM प्लान',
  description: 'अपने eSIM प्लान प्रबंधित करें, उपयोग देखें और अकाउंट सेटिंग्स एक्सेस करें।',
  keywords: ['eSIM डैशबोर्ड', 'अकाउंट प्रबंधन', 'उपयोग ट्रैकिंग'],
  openGraph: {
    title: 'डैशबोर्ड - eSIM प्लान',
    description: 'अपने eSIM प्लान प्रबंधित करें, उपयोग देखें और अकाउंट सेटिंग्स एक्सेस करें।',
    url: '/hi/dashboard',
  },
  alternates: {
    canonical: '/hi/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
