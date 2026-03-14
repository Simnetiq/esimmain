import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'eSIM สำหรับการเดินทาง — Simnetiq | อินเทอร์เน็ตมือถือไม่มีค่าโรมมิ่ง',
  description: 'ลืมค่าโรมมิ่งแพงๆ ไปได้เลย Simnetiq eSIM: อินเทอร์เน็ตใน 200+ ประเทศ เปิดใช้งานทันที แพ็กเกจเริ่มต้น $3',
  keywords: ['ซื้อ esim', 'esim ท่องเที่ยว', 'อินเทอร์เน็ตไม่มีโรมมิ่ง'],
  openGraph: { title: 'eSIM สำหรับการเดินทาง — Simnetiq', description: 'ลืมค่าโรมมิ่งแพงๆ ไปได้เลย Simnetiq eSIM.', type: 'website', locale: 'th_TH', url: '/th' },
  twitter: { card: 'summary_large_image', title: 'eSIM สำหรับการเดินทาง — Simnetiq', description: 'ลืมค่าโรมมิ่งแพงๆ ไปได้เลย' },
  alternates: generateAlternates('/'),
};

export default function ThaiLayout({ children }) { return children; }
