import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'eSIM 旅行用 — Simnetiq | ローミング不要のモバイルデータ',
  description: '高額なローミング料金はもう不要。Simnetiq eSIM: 200以上の国でインターネット接続、即時アクティベーション、$3からのプラン。旅行者やデジタルノマドに最適。',
  keywords: [
    'esim オンライン購入',
    'esim 旅行用',
    '海外インターネット ローミングなし',
    'esim 無制限データ 旅行',
    'バーチャルSIMカード 旅行者',
    'デジタルノマド インターネット',
    'esim ヨーロッパ 旅行',
    'esim アメリカ 旅行者',
    'esim 日本 旅行',
    'esim タイ 無制限',
    'esim iPhone 設定方法',
    'ローミング料金 回避',
    'esim 物理SIM どちらが良い'
  ],
  openGraph: {
    title: 'eSIM 旅行用 — Simnetiq | ローミング不要のモバイルデータ',
    description: '高額なローミング料金はもう不要。Simnetiq eSIM: 200以上の国でインターネット接続、即時アクティベーション、$3からのプラン。旅行者やデジタルノマドに最適。',
    type: 'website',
    locale: 'ja_JP',
    url: '/ja',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eSIM 旅行用 — Simnetiq | ローミング不要のモバイルデータ',
    description: '高額なローミング料金はもう不要。Simnetiq eSIM: 200以上の国でインターネット接続、即時アクティベーション、$3からのプラン。旅行者やデジタルノマドに最適。',
  },
  alternates: generateAlternates('/'),
}

export default function JapaneseLayout({ children }) {
  return children;
}
