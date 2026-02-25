import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: '仪表盘 - eSIM套餐',
  description: '管理您的eSIM套餐、查看使用情况并访问账户设置。',
  keywords: ['eSIM仪表盘', '账户管理', '使用量追踪'],
  openGraph: {
    title: '仪表盘 - eSIM套餐',
    description: '管理您的eSIM套餐、查看使用情况并访问账户设置。',
    url: '/zh/dashboard',
  },
  alternates: {
    canonical: '/zh/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
