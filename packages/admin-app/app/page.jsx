'use client'

import { Suspense } from 'react'
import AdminDashboard from '../src/components/AdminDashboard'
import AdminGuard from '../src/components/AdminGuard'

// Loading fallback for Suspense
function DashboardLoader() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <Suspense fallback={<DashboardLoader />}>
        <AdminDashboard />
      </Suspense>
    </AdminGuard>
  )
}
