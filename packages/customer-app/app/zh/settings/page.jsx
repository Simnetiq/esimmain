import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: '设置 - Simnetiq',
  description: '管理您的账户设置、个人信息和安全偏好。',
  openGraph: {
    title: '设置 - Simnetiq',
    description: '管理您的账户设置、个人信息和安全偏好。',
    url: '/zh/settings',
  },
  alternates: {
    canonical: '/zh/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
