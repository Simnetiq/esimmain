import { Suspense } from 'react';
import Blog from '../../../src/components/Blog';
import Loading from '../../../src/components/Loading';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'בלוג eSIM - תובנות ומדריכי טכנולוגיית eSIM | Simnetiq',
  description: 'גלה את המגמות האחרונות, מדריכים ותובנות בטכנולוגיית eSIM ופתרונות קישוריות גלובליים.',
  openGraph: {
    title: 'בלוג eSIM - תובנות ומדריכי טכנולוגיית eSIM | Simnetiq',
    description: 'גלה את המגמות האחרונות, מדריכים ותובנות בטכנולוגיית eSIM ופתרונות קישוריות גלובליים.',
    type: 'website',
    locale: 'he_IL',
    url: '/he/blog',
  },
  alternates: {
    canonical: '/he/blog',
  },
}

export default function HebrewBlogPage() {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <Blog />
      </Suspense>
    </>
  );
}


