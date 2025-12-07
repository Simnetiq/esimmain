'use client'

import AdminDashboard from '../src/components/AdminDashboard'
import AdminGuard from '../src/components/AdminGuard'

export default function AdminPage() {
  return (
    <AdminGuard>
        <AdminDashboard />
    </AdminGuard>
  )
}
