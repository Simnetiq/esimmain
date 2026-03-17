import { metadata as metadataConfig, generateAlternates } from '../../src/config/metadata'

// Generate metadata for each language
export async function generateMetadata({ params }) {
  const lang = params.lang || 'en'
  const langMetadata = metadataConfig[lang] || metadataConfig.en
  
  return {
    title: langMetadata.title,
    description: langMetadata.description,
    keywords: langMetadata.keywords,
    alternates: generateAlternates(`/${lang === 'en' ? '' : lang}`),
    openGraph: {
      ...langMetadata.openGraph,
      locale: getLocaleCode(lang),
    },
    twitter: {
      card: 'summary_large_image',
      title: langMetadata.openGraph.title,
      description: langMetadata.openGraph.description,
      images: ['/images/og-image.svg'],
    },
  }
}

function getLocaleCode(lang) {
  const locales = {
    en: 'en_US',
    ar: 'ar_SA',
    de: 'de_DE',
    es: 'es_ES',
    fr: 'fr_FR',
    he: 'he_IL',
    hi: 'hi_IN',
    it: 'it_IT',
    ja: 'ja_JP',
    ko: 'ko_KR',
    nl: 'nl_NL',
    pl: 'pl_PL',
    pt: 'pt_BR',
    ru: 'ru_RU',
    th: 'th_TH',
    tr: 'tr_TR',
    uk: 'uk_UA',
    zh: 'zh_CN',
    vi: 'vi_VN',
    id: 'id_ID',
    sv: 'sv_SE',
    cs: 'cs_CZ',
    el: 'el_GR',
    ro: 'ro_RO',
    da: 'da_DK',
    fi: 'fi_FI',
    nb: 'nb_NO',
  }
  return locales[lang] || 'en_US'
}

export default function LanguageLayout({ children }) {
  return <>{children}</>
}

