import { Suspense } from 'react'
import Dashboard from '../../../src/components/Dashboard'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: '대시보드 - eSIM 플랜',
  description: 'eSIM 플랜을 관리하고, 사용량을 확인하고, 계정 설정에 액세스하세요.',
  keywords: ['eSIM 대시보드', '계정 관리', '사용량 추적'],
  openGraph: {
    title: '대시보드 - eSIM 플랜',
    description: 'eSIM 플랜을 관리하고, 사용량을 확인하고, 계정 설정에 액세스하세요.',
    url: '/ko/dashboard',
  },
  alternates: {
    canonical: '/ko/dashboard',
  },
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  )
}
