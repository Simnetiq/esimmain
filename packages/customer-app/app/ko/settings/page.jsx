import { Suspense } from 'react'
import Settings from '../../../src/components/Settings'
import Loading from '../../../src/components/Loading'

export const metadata = {
  title: '설정 - 계정',
  description: '계정 설정, 개인 정보 및 보안 설정을 관리하세요.',
  openGraph: {
    title: '설정 - 계정',
    description: '계정 설정, 개인 정보 및 보안 설정을 관리하세요.',
    url: '/ko/settings',
  },
  alternates: {
    canonical: '/ko/settings',
  },
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  )
}
