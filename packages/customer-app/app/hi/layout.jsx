import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'यात्रा के लिए eSIM — Simnetiq | रोमिंग के बिना मोबाइल डेटा',
  description: 'महंगी रोमिंग भूल जाइए। Simnetiq eSIM: 200+ देशों में इंटरनेट, तुरंत एक्टिवेशन, $3 से प्लान। यात्रियों और डिजिटल नोमैड्स के लिए बिल्कुल सही।',
  keywords: [
    'eSIM ऑनलाइन खरीदें',
    'यात्रा के लिए eSIM',
    'रोमिंग के बिना विदेश में इंटरनेट',
    'eSIM असीमित डेटा यात्रा',
    'वर्चुअल सिम कार्ड यात्री',
    'डिजिटल नोमैड इंटरनेट',
    'eSIM यूरोप यात्रा',
    'eSIM अमेरिका पर्यटक',
    'eSIM भारत यात्रा',
    'eSIM जापान यात्रा',
    'eSIM थाईलैंड असीमित',
    'iPhone eSIM कैसे एक्टिवेट करें',
    'रोमिंग शुल्क से बचें',
    'eSIM या फिजिकल सिम कौन बेहतर'
  ],
  openGraph: {
    title: 'यात्रा के लिए eSIM — Simnetiq | रोमिंग के बिना मोबाइल डेटा',
    description: 'महंगी रोमिंग भूल जाइए। Simnetiq eSIM: 200+ देशों में इंटरनेट, तुरंत एक्टिवेशन, $3 से प्लान। यात्रियों और डिजिटल नोमैड्स के लिए बिल्कुल सही।',
    type: 'website',
    locale: 'hi_IN',
    url: '/hi',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'यात्रा के लिए eSIM — Simnetiq | रोमिंग के बिना मोबाइल डेटा',
    description: 'महंगी रोमिंग भूल जाइए। Simnetiq eSIM: 200+ देशों में इंटरनेट, तुरंत एक्टिवेशन, $3 से प्लान। यात्रियों और डिजिटल नोमैड्स के लिए बिल्कुल सही।',
  },
  alternates: generateAlternates('/'),
}

export default function HindiLayout({ children }) {
  return children;
}
