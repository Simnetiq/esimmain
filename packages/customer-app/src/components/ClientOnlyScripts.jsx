'use client';

import dynamic from 'next/dynamic';

const CookieConsent = dynamic(() => import('./CookieConsent'), {
  ssr: false,
  loading: () => null
});

const FacebookPixel = dynamic(() => import('./FacebookPixel'), {
  ssr: false,
  loading: () => null
});

export default function ClientOnlyScripts() {
  return (
    <>
      <CookieConsent />
      <FacebookPixel />
    </>
  );
}
