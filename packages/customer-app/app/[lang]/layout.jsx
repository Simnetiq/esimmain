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
    es: 'es_ES',
    fr: 'fr_FR',
    de: 'de_DE',
    ar: 'ar_AR',
    he: 'he_IL',
    hi: 'hi_IN',
    ja: 'ja_JP',
    pl: 'pl_PL',
    pt: 'pt_BR',
    ru: 'ru_RU',
    uk: 'uk_UA',
    zh: 'zh_CN',
  }
  return locales[lang] || 'en_US'
}

export default function LanguageLayout({ children }) {
  return <>{children}</>
}

