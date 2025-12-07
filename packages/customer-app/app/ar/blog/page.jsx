import { Suspense } from 'react';
import Blog from '../../../src/components/Blog';
import Loading from '../../../src/components/Loading';

export const metadata = {
  title: 'مدونة eSIM - رؤى ودلائل تقنية eSIM | Simnetiq',
  description: 'اكتشف أحدث الاتجاهات والدلائل والرؤى في تقنية eSIM وحلول الاتصال العالمية.',
  openGraph: {
    title: 'مدونة eSIM - رؤى ودلائل تقنية eSIM | Simnetiq',
    description: 'اكتشف أحدث الاتجاهات والدلائل والرؤى في تقنية eSIM وحلول الاتصال العالمية.',
    type: 'website',
    locale: 'ar_SA',
    url: '/ar/blog',
  },
  alternates: {
    canonical: '/ar/blog',
  },
}

export default function ArabicBlogPage() {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <Blog />
      </Suspense>
    </>
  );
}


