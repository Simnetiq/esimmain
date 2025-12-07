/**
 * Map country slugs to ISO 3166-1-alpha-2 codes for flag SVGs
 * Based on flag-icons library: https://github.com/lipis/flag-icons
 */

export const SLUG_TO_ISO_CODE = {
  // A
  'afghanistan': 'af',
  'albania': 'al',
  'algeria': 'dz',
  'andorra': 'ad',
  'angola': 'ao',
  'anguilla': 'ai',
  'antigua-and-barbuda': 'ag',
  'antilles': 'an',
  'antiques': 're', // Typo for Réunion (Antiques = old things in French)
  'argentina': 'ar',
  'armenia': 'am',
  'aruba': 'aw',
  'australia': 'au',
  'austria': 'at',
  'azerbaijan': 'az',
  'azores': 'pt',
  
  // B
  'bahamas': 'bs',
  'bahrain': 'bh',
  'bangladesh': 'bd',
  'barbados': 'bb',
  'belarus': 'by',
  'belgium': 'be',
  'belize': 'bz',
  'benin': 'bj',
  'bermuda': 'bm',
  'bhutan': 'bt',
  'bolivia': 'bo',
  'bonaire': 'bq',
  'bosnia-and-herzegovina': 'ba',
  'botswana': 'bw',
  'brazil': 'br',
  'brunei': 'bn',
  'bulgaria': 'bg',
  'burkina-faso': 'bf',
  'burundi': 'bi',
  
  // C
  'cambodia': 'kh',
  'cameroon': 'cm',
  'canada': 'ca',
  'canary-islands': 'ic',
  'cape-verde': 'cv',
  'caribbean': 'un',
  'caribbean-islands': 'un',
  'cayman-islands': 'ky',
  'central-african-republic': 'cf',
  'chad': 'td',
  'chile': 'cl',
  'china': 'cn',
  'colombia': 'co',
  'comoros': 'km',
  'congo': 'cg',
  'costa-rica': 'cr',
  'croatia': 'hr',
  'cte-divoire': 'ci', // Slug without special chars
  'cuba': 'cu',
  'curaao': 'cw', // Slug without ç
  'curacao': 'cw',
  'curaçao': 'cw',
  'cyprus': 'cy',
  'czech-republic': 'cz',
  'côte-d\'ivoire': 'ci',
  
  // D
  'democratic-republic-of-the-congo': 'cd',
  'denmark': 'dk',
  'discover-global': 'un',
  'djibouti': 'dj',
  'dominica': 'dm',
  'dominican-republic': 'do',
  
  // E
  'ecuador': 'ec',
  'egypt': 'eg',
  'el-salvador': 'sv',
  'equatorial-guinea': 'gq',
  'eritrea': 'er',
  'estonia': 'ee',
  'eswatini': 'sz',
  'ethiopia': 'et',
  'europe': 'eu',
  'european-union-and-united-kingdom': 'eu',
  
  // F
  'faroe-islands': 'fo',
  'fiji': 'fj',
  'finland': 'fi',
  'france': 'fr',
  'french-polynesia': 'pf',
  
  // G
  'gabon': 'ga',
  'gambia': 'gm',
  'georgia': 'ge',
  'germany': 'de',
  'ghana': 'gh',
  'greece': 'gr',
  'greenland': 'gl',
  'grenada': 'gd',
  'guadeloupe': 'gp',
  'guam': 'gu',
  'guatemala': 'gt',
  'guinea': 'gn',
  'guinea-bissau': 'gw',
  'guyana': 'gy',
  
  // H
  'haiti': 'ht',
  'honduras': 'hn',
  'hong-kong': 'hk',
  'hungary': 'hu',
  
  // I
  'iceland': 'is',
  'india': 'in',
  'indonesia': 'id',
  'iraq': 'iq',
  'ireland': 'ie',
  'isle-of-man': 'im',
  'israel': 'il',
  'italy': 'it',
  'ivory-coast': 'ci',
  
  // J
  'jamaica': 'jm',
  'japan': 'jp',
  'jersey': 'je',
  'jordan': 'jo',
  
  // K
  'kazakhstan': 'kz',
  'kenya': 'ke',
  'kiribati': 'ki',
  'kosovo': 'xk',
  'kuwait': 'kw',
  'kyrgyzstan': 'kg',
  
  // L
  'laos': 'la',
  'latin-america': 'un',
  'latvia': 'lv',
  'lebanon': 'lb',
  'lesotho': 'ls',
  'liberia': 'lr',
  'libya': 'ly',
  'liechtenstein': 'li',
  'lithuania': 'lt',
  'luxembourg': 'lu',
  
  // M
  'macau': 'mo',
  'macao': 'mo',
  'madagascar': 'mg',
  'madeira': 'pt',
  'malawi': 'mw',
  'malaysia': 'my',
  'maldives': 'mv',
  'mali': 'ml',
  'malta': 'mt',
  'marie-galante': 'gp',
  'marshall-islands': 'mh',
  'martinique': 'mq',
  'mauritania': 'mr',
  'mauritius': 'mu',
  'mayotte': 'yt',
  'mexico': 'mx',
  'micronesia': 'fm',
  'middle-east': 'arab',
  'middle-east-and-north-africa': 'arab',
  'moldova': 'md',
  'monaco': 'mc',
  'mongolia': 'mn',
  'montenegro': 'me',
  'montserrat': 'ms',
  'morocco': 'ma',
  'mozambique': 'mz',
  'myanmar': 'mm',
  
  // N
  'namibia': 'na',
  'nauru': 'nr',
  'nepal': 'np',
  'netherlands': 'nl',
  'new-caledonia': 'nc',
  'new-zealand': 'nz',
  'nicaragua': 'ni',
  'niger': 'ne',
  'nigeria': 'ng',
  'north-america': 'un',
  'north-korea': 'kp',
  'north-macedonia': 'mk',
  'northern-cyprus': 'cy',
  'norway': 'no',
  
  // O
  'oman': 'om',
  
  // P
  'pakistan': 'pk',
  'palau': 'pw',
  'palestine': 'ps',
  'palestine,-state-of': 'ps',
  'palestin': 'ps',
  'panama': 'pa',
  'papua-new-guinea': 'pg',
  'paraguay': 'py',
  'peru': 'pe',
  'philippines': 'ph',
  'poland': 'pl',
  'portugal': 'pt',
  'puerto-rico': 'pr',
  
  // Q
  'qatar': 'qa',
  
  // R
  'republic-of-the-congo': 'cg',
  'reunion': 're',
  'réunion': 're',
  'runion': 're', // Slug without é
  'romania': 'ro',
  'russia': 'ru',
  'rwanda': 'rw',
  
  // S
  'saba': 'bq',
  'saint-barthlemy': 'bl', // Slug without é
  'saint-barthélemy': 'bl',
  'saint-kitts-and-nevis': 'kn',
  'saint-lucia': 'lc',
  'saint-martin-(french-part)': 'mf',
  'saint-martin': 'mf',
  'saint-vincent-and-the-grenadines': 'vc',
  'samoa': 'ws',
  'san-marino': 'sm',
  'sao-tome-and-principe': 'st',
  'saudi-arabia': 'sa',
  'scotland': 'gb-sct',
  'senegal': 'sn',
  'serbia': 'rs',
  'seychelles': 'sc',
  'sierra-leone': 'sl',
  'singapore': 'sg',
  'sint-eustatius': 'bq',
  'slovakia': 'sk',
  'slovenia': 'si',
  'solomon-islands': 'sb',
  'somalia': 'so',
  'south-africa': 'za',
  'south-america': 'un',
  'south-korea': 'kr',
  'south-sudan': 'ss',
  'spain': 'es',
  'sri-lanka': 'lk',
  'sudan': 'sd',
  'suriname': 'sr',
  'sweden': 'se',
  'switzerland': 'ch',
  'syria': 'sy',
  
  // T
  'taiwan': 'tw',
  'tajikistan': 'tj',
  'tanzania': 'tz',
  'thailand': 'th',
  'timor-leste': 'tl',
  'timor---leste': 'tl',
  'togo': 'tg',
  'tonga': 'to',
  'trinidad-and-tobago': 'tt',
  'tunisia': 'tn',
  'turkey': 'tr',
  'turkmenistan': 'tm',
  'turks-and-caicos-islands': 'tc',
  'tuvalu': 'tv',
  
  // U
  'uganda': 'ug',
  'ukraine': 'ua',
  'united-arab-emirates': 'ae',
  'united-kingdom': 'gb',
  'united-states': 'us',
  'uruguay': 'uy',
  'uzbekistan': 'uz',
  
  // V
  'vanuatu': 'vu',
  'vatican-city': 'va',
  'venezuela': 've',
  'vietnam': 'vn',
  'virgin-islands-(british)': 'vg',
  'virgin-islands-(u.s.)': 'vi',
  'virgin-islands': 'vg',
  
  // Y
  'yemen': 'ye',
  
  // Z
  'zambia': 'zm',
  'zimbabwe': 'zw',
  
  // Regional
  'africa': 'un',
  'asia': 'un',
  'caribbean': 'un',
  'oceania': 'un',
  'americas': 'un',
};

/**
 * Convert country slug or ISO code to proper ISO 3166-1-alpha-2 code
 * @param {string} code - Country code (slug or ISO)
 * @returns {string} ISO 3166-1-alpha-2 code
 */
export function getISOCode(code) {
  if (!code) return 'un'; // Default to UN flag
  
  const normalized = code.toLowerCase().trim();
  
  // If it's already a 2-letter ISO code, return it
  if (normalized.length === 2 && /^[a-z]{2}$/.test(normalized)) {
    return normalized;
  }
  
  // Look up in mapping
  return SLUG_TO_ISO_CODE[normalized] || 'un';
}

