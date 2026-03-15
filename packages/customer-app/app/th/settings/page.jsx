import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'การตั้งค่า - บัญชี',
  description: 'จัดการการตั้งค่าบัญชีของคุณ ข้อมูลส่วนตัว และการตั้งค่าความปลอดภัย',
  openGraph: {
    title: 'การตั้งค่า - บัญชี',
    description: 'จัดการการตั้งค่าบัญชีของคุณ ข้อมูลส่วนตัว และการตั้งค่าความปลอดภัย',
    url: '/th/settings',
  },
  alternates: {
    canonical: '/th/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
