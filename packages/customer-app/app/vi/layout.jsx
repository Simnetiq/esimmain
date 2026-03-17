import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'eSIM Du Lịch — Simnetiq | Dữ liệu Di động không Roaming',
  description: 'Quên đi roaming đắt đỏ. Simnetiq eSIM: Internet tại 200+ quốc gia, kích hoạt ngay lập tức, từ $3. Hoàn hảo cho khách du lịch và digital nomad.',
  openGraph: {
    title: 'eSIM Du Lịch — Simnetiq | Dữ liệu Di động không Roaming',
    description: 'Quên đi roaming đắt đỏ. Simnetiq eSIM: Internet tại 200+ quốc gia, kích hoạt ngay lập tức, từ $3. Hoàn hảo cho khách du lịch và digital nomad.',
    type: 'website',
    locale: 'vi_VN',
    url: '/vi',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eSIM Du Lịch — Simnetiq | Dữ liệu Di động không Roaming',
    description: 'Quên đi roaming đắt đỏ. Simnetiq eSIM: Internet tại 200+ quốc gia, kích hoạt ngay lập tức, từ $3. Hoàn hảo cho khách du lịch và digital nomad.',
  },
  alternates: generateAlternates('/'),
}

export default function Layout({ children }) {
  return children;
}
