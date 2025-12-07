'use client'

import { AuthProvider } from '@esim/shared/contexts/AuthContext'
import { AdminProvider } from '@esim/shared/contexts/AdminContext'
import { Toaster } from 'react-hot-toast'

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <AdminProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </AdminProvider>
    </AuthProvider>
  )
}

