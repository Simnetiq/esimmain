import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: 'ダッシュボード - eSIMプラン',
  description: 'eSIMプランの管理、使用状況の確認、アカウント設定にアクセス。',
  keywords: ['eSIM ダッシュボード', 'アカウント管理', '使用状況追跡'],
  openGraph: {
    title: 'ダッシュボード - eSIMプラン',
    description: 'eSIMプランの管理、使用状況の確認、アカウント設定にアクセス。',
    url: '/ja/dashboard',
  },
  alternates: {
    canonical: '/ja/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
