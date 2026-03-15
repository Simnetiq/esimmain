import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'แดชบอร์ด - แผน eSIM',
  description: 'จัดการแผน eSIM ของคุณ ดูการใช้งาน และเข้าถึงการตั้งค่าบัญชีของคุณ',
  keywords: ['eSIM แดชบอร์ด', 'การจัดการบัญชี', 'การติดตามการใช้งาน'],
  openGraph: {
    title: 'แดชบอร์ด - แผน eSIM',
    description: 'จัดการแผน eSIM ของคุณ ดูการใช้งาน และเข้าถึงการตั้งค่าบัญชีของคุณ',
    url: '/th/dashboard',
  },
  alternates: {
    canonical: '/th/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
