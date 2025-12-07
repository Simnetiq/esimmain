import { Suspense } from 'react';
import Blog from '../../../src/components/Blog';
import Loading from '../../../src/components/Loading';

export const metadata = {
  title: 'eSIM Блог - Обзоры и Руководства по Технологии eSIM | Simnetiq',
  description: 'Откройте для себя последние тенденции, руководства и обзоры технологий eSIM и решений глобальной связи.',
  openGraph: {
    title: 'eSIM Блог - Обзоры и Руководства по Технологии eSIM | Simnetiq',
    description: 'Откройте для себя последние тенденции, руководства и обзоры технологий eSIM и решений глобальной связи.',
    type: 'website',
    locale: 'ru_RU',
    url: '/ru/blog',
  },
  alternates: {
    canonical: '/ru/blog',
  },
}

export default function RussianBlogPage() {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <Blog />
      </Suspense>
    </>
  );
}


