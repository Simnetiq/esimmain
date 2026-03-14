import { Suspense } from 'react';
import Blog from '../../src/components/Blog';
import Loading from '../../src/components/Loading';
import RTLWrapper from '../../src/components/RTLWrapper';

export const dynamic = 'force-dynamic';

const VALID_LOCALES = ['ar', 'de', 'es', 'fr', 'he', 'hi', 'ja', 'pl', 'pt', 'ru', 'uk', 'zh'];

export const metadata = {
  title: 'eSIM Travel Blog — Tips & Guides | Simnetiq',
  description: 'eSIM travel tips, setup guides, and destination insights. Compare eSIM providers, avoid roaming charges, and stay connected in 200+ countries with Simnetiq.',
  keywords: ['eSIM blog', 'travel tips', 'connectivity news', 'data plans guide', 'eSIM comparison', 'travel connectivity', 'Simnetiq blog'],
  openGraph: {
    title: 'eSIM Travel Blog — Tips & Guides | Simnetiq',
    description: 'eSIM travel tips, setup guides, and destination insights. Compare eSIM providers, avoid roaming charges, and stay connected in 200+ countries with Simnetiq.',
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
