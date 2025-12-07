'use client';

import { Toaster } from 'react-hot-toast';

/**
 * Lightweight providers for public pages (homepage, blog, etc.)
 * Only includes toast notifications, no auth or heavy dependencies
 */
export default function LightProviders({ children }) {
  return (
    <>
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
    </>
  );
}

