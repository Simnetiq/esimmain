'use client'

import { Suspense } from 'react'
import AdminLogin from '../../src/components/AdminLogin'

function LoginContent() {
  return <AdminLogin />
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

