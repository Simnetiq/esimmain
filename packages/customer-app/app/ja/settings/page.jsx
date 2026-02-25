import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: '設定 - Simnetiq',
  description: 'アカウント設定、個人情報、セキュリティ設定を管理します。',
  openGraph: {
    title: '設定 - Simnetiq',
    description: 'アカウント設定、個人情報、セキュリティ設定を管理します。',
    url: '/ja/settings',
  },
  alternates: {
    canonical: '/ja/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
