import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: '여행용 eSIM — Simnetiq | 로밍 없는 모바일 데이터',
  description: '비싼 로밍은 잊으세요. Simnetiq eSIM: 200개국 이상 인터넷, 즉시 활성화, $3부터 요금제.',
  keywords: ['esim 구매', 'esim 여행', '로밍 없이 인터넷', 'esim 유럽', 'esim 한국'],
  openGraph: {
    title: '여행용 eSIM — Simnetiq | 로밍 없는 모바일 데이터',
    description: '비싼 로밍은 잊으세요. Simnetiq eSIM: 200개국 이상 인터넷, 즉시 활성화, $3부터 요금제.',
    type: 'website', locale: 'ko_KR', url: '/ko',
  },
  twitter: { card: 'summary_large_image', title: '여행용 eSIM — Simnetiq', description: '비싼 로밍은 잊으세요. Simnetiq eSIM: 200개국 이상 인터넷.' },
  alternates: generateAlternates('/'),
};

export default function KoreanLayout({ children }) { return children; }
