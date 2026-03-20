import { getSupabaseServer } from './supabaseServer';

const BASE = 'https://www.simnetiq.store';

// Localized SEO templates — each crafted for natural, high-quality search appearance
const SEO = {
  en: {
    title: (n, p) => `eSIM for ${n} — From $${p} | Simnetiq`,
    desc: (n, c, p) => `Buy eSIM data plans for ${n}. ${c} plans available from $${p}. Instant activation, no roaming charges. Stay connected with Simnetiq.`,
    fallbackCount: 'Multiple',
  },
  ar: {
    title: (n, p) => `شريحة eSIM لـ${n} — بدءاً من $${p} | Simnetiq`,
    desc: (n, c, p) => `اشترِ باقات بيانات eSIM لـ${n}. ${c} باقة متوفرة بدءاً من $${p}. تفعيل فوري — بدون رسوم تجوال. ابقَ على اتصال مع Simnetiq.`,
    fallbackCount: 'عدة',
  },
  de: {
    title: (n, p) => `eSIM für ${n} — Ab $${p} | Simnetiq`,
    desc: (n, c, p) => `eSIM-Datentarife für ${n} kaufen. ${c} Tarife verfügbar ab $${p}. Sofort aktiv, keine Roaming-Gebühren. Weltweit verbunden mit Simnetiq.`,
    fallbackCount: 'Mehrere',
  },
  es: {
    title: (n, p) => `eSIM para ${n} — Desde $${p} | Simnetiq`,
    desc: (n, c, p) => `Compra planes de datos eSIM para ${n}. ${c} planes disponibles desde $${p}. Activación instantánea, sin cargos por roaming. Conéctate con Simnetiq.`,
    fallbackCount: 'Varios',
  },
  fr: {
    title: (n, p) => `eSIM pour ${n} — Dès $${p} | Simnetiq`,
    desc: (n, c, p) => `Achetez des forfaits data eSIM pour ${n}. ${c} forfaits disponibles dès $${p}. Activation instantanée, sans frais d'itinérance. Restez connecté avec Simnetiq.`,
    fallbackCount: 'Plusieurs',
  },
  he: {
    title: (n, p) => `eSIM ל${n} — החל מ-$${p} | Simnetiq`,
    desc: (n, c, p) => `רכשו חבילות גלישה eSIM ל${n}. ${c} חבילות זמינות החל מ-$${p}. הפעלה מיידית, ללא עלויות נדידה. הישארו מחוברים עם Simnetiq.`,
    fallbackCount: 'מגוון',
  },
  hi: {
    title: (n, p) => `${n} के लिए eSIM — $${p} से शुरू | Simnetiq`,
    desc: (n, c, p) => `${n} के लिए eSIM डेटा प्लान खरीदें। $${p} से ${c} प्लान उपलब्ध। तुरंत सक्रिय, कोई रोमिंग शुल्क नहीं। Simnetiq के साथ जुड़े रहें।`,
    fallbackCount: 'कई',
  },
  it: {
    title: (n, p) => `eSIM per ${n} — Da $${p} | Simnetiq`,
    desc: (n, c, p) => `Acquista piani dati eSIM per ${n}. ${c} piani disponibili da $${p}. Attivazione istantanea, senza costi di roaming. Resta connesso con Simnetiq.`,
    fallbackCount: 'Diversi',
  },
  ja: {
    title: (n, p) => `${n}向けeSIM — $${p}から | Simnetiq`,
    desc: (n, c, p) => `${n}のeSIMデータプランを購入。$${p}から${c}プランをご利用いただけます。即時開通・ローミング料金なし。Simnetiqで世界とつながろう。`,
    fallbackCount: '複数の',
  },
  ko: {
    title: (n, p) => `${n} eSIM — $${p}부터 | Simnetiq`,
    desc: (n, c, p) => `${n} eSIM 데이터 요금제를 구매하세요. $${p}부터 ${c}개 요금제 이용 가능. 즉시 활성화, 로밍 요금 없음. Simnetiq와 함께 연결하세요.`,
    fallbackCount: '다양한',
  },
  nl: {
    title: (n, p) => `eSIM voor ${n} — Vanaf $${p} | Simnetiq`,
    desc: (n, c, p) => `Koop eSIM-datapakketten voor ${n}. ${c} pakketten beschikbaar vanaf $${p}. Direct geactiveerd, geen roamingkosten. Blijf verbonden met Simnetiq.`,
    fallbackCount: 'Meerdere',
  },
  pl: {
    title: (n, p) => `eSIM dla ${n} — Od $${p} | Simnetiq`,
    desc: (n, c, p) => `Kup pakiety danych eSIM dla ${n}. ${c} pakietów dostępnych od $${p}. Natychmiastowa aktywacja, bez opłat roamingowych. Bądź online z Simnetiq.`,
    fallbackCount: 'Wiele',
  },
  pt: {
    title: (n, p) => `eSIM para ${n} — A partir de $${p} | Simnetiq`,
    desc: (n, c, p) => `Compre planos de dados eSIM para ${n}. ${c} planos disponíveis a partir de $${p}. Ativação instantânea, sem taxas de roaming. Fique conectado com a Simnetiq.`,
    fallbackCount: 'Vários',
  },
  ru: {
    title: (n, p) => `eSIM для ${n} — От $${p} | Simnetiq`,
    desc: (n, c, p) => `Купите тарифы eSIM для ${n}. ${c} тарифов от $${p}. Мгновенная активация, без роуминга. Оставайтесь на связи с Simnetiq.`,
    fallbackCount: 'Несколько',
  },
  th: {
    title: (n, p) => `eSIM สำหรับ${n} — เริ่มต้น $${p} | Simnetiq`,
    desc: (n, c, p) => `ซื้อแพ็กเกจข้อมูล eSIM สำหรับ${n} มี ${c} แพ็กเกจ เริ่มต้นที่ $${p} เปิดใช้งานทันที ไม่มีค่าโรมมิ่ง เชื่อมต่อกับ Simnetiq`,
    fallbackCount: 'หลาย',
  },
  tr: {
    title: (n, p) => `${n} için eSIM — $${p}'den başlayan fiyatlarla | Simnetiq`,
    desc: (n, c, p) => `${n} için eSIM veri paketleri satın alın. $${p}'den başlayan ${c} paket mevcut. Anında aktivasyon, dolaşım ücreti yok. Simnetiq ile bağlantıda kalın.`,
    fallbackCount: 'çeşitli',
  },
  uk: {
    title: (n, p) => `eSIM для ${n} — Від $${p} | Simnetiq`,
    desc: (n, c, p) => `Придбайте тарифи eSIM для ${n}. ${c} тарифів від $${p}. Миттєва активація, без роумінгу. Залишайтесь на зв'язку з Simnetiq.`,
    fallbackCount: 'Кілька',
  },
  zh: {
    title: (n, p) => `${n} eSIM — 低至 $${p} | Simnetiq`,
    desc: (n, c, p) => `购买${n}的 eSIM 数据套餐。${c}种套餐可选，低至 $${p}。即时激活，无漫游费用。使用 Simnetiq 畅连全球。`,
    fallbackCount: '多',
  },
  cs: {
    title: (n, p) => `eSIM pro ${n} — Od $${p} | Simnetiq`,
    desc: (n, c, p) => `Kupte si datové tarify eSIM pro ${n}. ${c} tarifů od $${p}. Okamžitá aktivace, žádné poplatky za roaming. Zůstaňte připojeni se Simnetiq.`,
    fallbackCount: 'Více',
  },
  da: {
    title: (n, p) => `eSIM til ${n} — Fra $${p} | Simnetiq`,
    desc: (n, c, p) => `Køb eSIM-dataplaner til ${n}. ${c} planer tilgængelige fra $${p}. Øjeblikkelig aktivering, ingen roaminggebyrer. Hold forbindelsen med Simnetiq.`,
    fallbackCount: 'Flere',
  },
  el: {
    title: (n, p) => `eSIM για ${n} — Από $${p} | Simnetiq`,
    desc: (n, c, p) => `Αγοράστε πακέτα δεδομένων eSIM για ${n}. ${c} πακέτα διαθέσιμα από $${p}. Άμεση ενεργοποίηση, χωρίς χρεώσεις περιαγωγής. Μείνετε συνδεδεμένοι με το Simnetiq.`,
    fallbackCount: 'Πολλά',
  },
  fi: {
    title: (n, p) => `eSIM kohteeseen ${n} — Alkaen $${p} | Simnetiq`,
    desc: (n, c, p) => `Osta eSIM-datapaketit kohteeseen ${n}. ${c} pakettia alkaen $${p}. Välitön aktivointi, ei roaming-maksuja. Pysy yhteydessä Simnetiqin avulla.`,
    fallbackCount: 'Useita',
  },
  id: {
    title: (n, p) => `eSIM untuk ${n} — Mulai $${p} | Simnetiq`,
    desc: (n, c, p) => `Beli paket data eSIM untuk ${n}. ${c} paket tersedia mulai $${p}. Aktivasi instan, tanpa biaya roaming. Tetap terhubung dengan Simnetiq.`,
    fallbackCount: 'Beberapa',
  },
  nb: {
    title: (n, p) => `eSIM for ${n} — Fra $${p} | Simnetiq`,
    desc: (n, c, p) => `Kjøp eSIM-dataplaner for ${n}. ${c} planer tilgjengelig fra $${p}. Umiddelbar aktivering, ingen roamingkostnader. Hold kontakten med Simnetiq.`,
    fallbackCount: 'Flere',
  },
  ro: {
    title: (n, p) => `eSIM pentru ${n} — De la $${p} | Simnetiq`,
    desc: (n, c, p) => `Cumpărați planuri de date eSIM pentru ${n}. ${c} planuri disponibile de la $${p}. Activare instantanee, fără taxe de roaming. Rămâneți conectat cu Simnetiq.`,
    fallbackCount: 'Mai multe',
  },
  sv: {
    title: (n, p) => `eSIM för ${n} — Från $${p} | Simnetiq`,
    desc: (n, c, p) => `Köp eSIM-datapaket för ${n}. ${c} paket tillgängliga från $${p}. Omedelbar aktivering, inga roamingavgifter. Håll kontakten med Simnetiq.`,
    fallbackCount: 'Flera',
  },
  vi: {
    title: (n, p) => `eSIM cho ${n} — Từ $${p} | Simnetiq`,
    desc: (n, c, p) => `Mua gói dữ liệu eSIM cho ${n}. ${c} gói có sẵn từ $${p}. Kích hoạt tức thì, không phí chuyển vùng. Kết nối cùng Simnetiq.`,
    fallbackCount: 'Nhiều',
  },
};

/**
 * Generate localized metadata for a country eSIM page.
 * @param {string} countrySlug - URL slug of the country
 * @param {string} locale - ISO language code (e.g. 'de', 'ja')
 */
export async function generateCountryMetadata(countrySlug, locale) {
  const supabase = getSupabaseServer();
  if (!supabase) return { title: 'eSIM Plans | Simnetiq' };

  const { data: country } = await supabase
    .from('countries')
    .select(`
      name, slug, min_price, plan_count, image_url,
      country_translations (
        language_code,
        name
      )
    `)
    .eq('slug', countrySlug)
    .eq('is_active', true)
    .single();

  if (!country) return { title: 'eSIM Plans | Simnetiq' };

  // Find translated country name for this locale
  const translation = (country.country_translations || [])
    .find(t => t.language_code === locale);
  const localName = translation?.name || country.name;

  const seo = SEO[locale] || SEO.en;
  const price = country.min_price || '5';
  const count = country.plan_count || seo.fallbackCount;

  const title = seo.title(localName, price);
  const description = seo.desc(localName, count, price);

  const canonicalPath = locale === 'en'
    ? `/esim/${country.slug}`
    : `/${locale}/esim/${country.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE}${canonicalPath}`,
      siteName: 'Simnetiq',
      images: country.image_url ? [{ url: country.image_url, width: 600, height: 400 }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `${BASE}${canonicalPath}`,
      languages: {
        'x-default': `${BASE}/esim/${country.slug}`,
        'en': `${BASE}/esim/${country.slug}`,
        'ar': `${BASE}/ar/esim/${country.slug}`,
        'de': `${BASE}/de/esim/${country.slug}`,
        'es': `${BASE}/es/esim/${country.slug}`,
        'fr': `${BASE}/fr/esim/${country.slug}`,
        'he': `${BASE}/he/esim/${country.slug}`,
        'hi': `${BASE}/hi/esim/${country.slug}`,
        'it': `${BASE}/it/esim/${country.slug}`,
        'ja': `${BASE}/ja/esim/${country.slug}`,
        'ko': `${BASE}/ko/esim/${country.slug}`,
        'nl': `${BASE}/nl/esim/${country.slug}`,
        'pl': `${BASE}/pl/esim/${country.slug}`,
        'pt': `${BASE}/pt/esim/${country.slug}`,
        'ru': `${BASE}/ru/esim/${country.slug}`,
        'th': `${BASE}/th/esim/${country.slug}`,
        'tr': `${BASE}/tr/esim/${country.slug}`,
        'uk': `${BASE}/uk/esim/${country.slug}`,
        'zh': `${BASE}/zh/esim/${country.slug}`,
        'vi': `${BASE}/vi/esim/${country.slug}`,
        'id': `${BASE}/id/esim/${country.slug}`,
        'sv': `${BASE}/sv/esim/${country.slug}`,
        'cs': `${BASE}/cs/esim/${country.slug}`,
        'el': `${BASE}/el/esim/${country.slug}`,
        'ro': `${BASE}/ro/esim/${country.slug}`,
        'da': `${BASE}/da/esim/${country.slug}`,
        'fi': `${BASE}/fi/esim/${country.slug}`,
        'nb': `${BASE}/nb/esim/${country.slug}`,
      },
    },
  };
}
