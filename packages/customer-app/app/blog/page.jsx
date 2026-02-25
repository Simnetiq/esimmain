import { Suspense } from 'react';
import Blog from '../../src/components/Blog';
import Loading from '../../src/components/Loading';
import RTLWrapper from '../../src/components/RTLWrapper';

export const dynamic = 'force-dynamic';

const VALID_LOCALES = ['ar', 'de', 'es', 'fr', 'he', 'hi', 'ja', 'pl', 'pt', 'ru', 'uk', 'zh'];

export const metadata = {
  title: 'Blog - eSIM Plans',
  description: 'Latest news, tips, and insights about eSIM technology, travel connectivity, and global data plans.',
  keywords: ['eSIM blog', 'travel tips', 'connectivity news', 'data plans guide'],
  openGraph: {
    title: 'Blog - eSIM Plans',
    description: 'Latest news, tips, and insights about eSIM technology, travel connectivity, and global data plans.',
    url: '/blog',
    locale: 'en_US',
  },
  alternates: {
    canonical: '/blog',
    languages: Object.fromEntries([
      ['x-default', '/blog'],
      ['en', '/blog'],
      ...['ar', 'de', 'es', 'fr', 'he', 'hi', 'ja', 'pl', 'pt', 'ru', 'uk', 'zh'].map(l => [l, `/${l}/blog`]),
    ]),
  },
}

export default function BlogPage() {
  return (
    <RTLWrapper>
      <Suspense fallback={<Loading />}>
        <Blog />
      </Suspense>
    </RTLWrapper>
  )
}
