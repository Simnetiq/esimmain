import { Suspense } from 'react';
import Blog from '../../../src/components/Blog';
import Loading from '../../../src/components/Loading';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Blog eSIM - Perspectives et guides technologie eSIM | Simnetiq',
  description: 'Découvrez les dernières tendances, guides et perspectives en technologie eSIM et solutions de connectivité mondiale.',
  openGraph: {
    title: 'Blog eSIM - Perspectives et guides technologie eSIM | Simnetiq',
    description: 'Découvrez les dernières tendances, guides et perspectives en technologie eSIM et solutions de connectivité mondiale.',
    type: 'website',
    locale: 'fr_FR',
    url: '/fr/blog',
  },
  alternates: {
    canonical: '/fr/blog',
  },
}

export default function FrenchBlogPage() {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <Blog />
      </Suspense>
    </>
  );
}


