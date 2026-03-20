// Mapping from Airalo country slug to region ID
// Used by both sync-airalo and sync-to-supabase routes
export const COUNTRY_TO_REGION = {
  // Asia
  'afghanistan': 'asia', 'bahrain': 'asia', 'bangladesh': 'asia', 'bhutan': 'asia',
  'brunei': 'asia', 'cambodia': 'asia', 'china': 'asia', 'hong-kong': 'asia',
  'india': 'asia', 'indonesia': 'asia', 'japan': 'asia', 'kazakhstan': 'asia',
  'kyrgyzstan': 'asia', 'laos': 'asia', 'macau': 'asia', 'malaysia': 'asia',
  'maldives': 'asia', 'mongolia': 'asia', 'myanmar': 'asia', 'nepal': 'asia',
  'pakistan': 'asia', 'philippines': 'asia', 'singapore': 'asia', 'south-korea': 'asia',
  'sri-lanka': 'asia', 'taiwan': 'asia', 'tajikistan': 'asia', 'thailand': 'asia',
  'uzbekistan': 'asia', 'vietnam': 'asia', 'iraq': 'asia', 'israel': 'asia',
  'jordan': 'asia', 'kuwait': 'asia', 'lebanon': 'asia', 'oman': 'asia',
  'palestine': 'asia', 'palestine-state-of': 'asia', 'qatar': 'asia', 'saudi-arabia': 'asia', 'syria': 'asia',
  'united-arab-emirates': 'asia', 'yemen': 'asia',
  'macao': 'asia', 'timor-leste': 'asia',

  // Europe
  'albania': 'europe', 'andorra': 'europe', 'armenia': 'europe', 'austria': 'europe',
  'azerbaijan': 'europe', 'belarus': 'europe', 'belgium': 'europe', 'bosnia-and-herzegovina': 'europe',
  'bulgaria': 'europe', 'croatia': 'europe', 'cyprus': 'europe', 'czech-republic': 'europe',
  'denmark': 'europe', 'estonia': 'europe', 'finland': 'europe', 'france': 'europe',
  'georgia': 'europe', 'germany': 'europe', 'greece': 'europe', 'hungary': 'europe',
  'iceland': 'europe', 'ireland': 'europe', 'italy': 'europe', 'kosovo': 'europe',
  'latvia': 'europe', 'liechtenstein': 'europe', 'lithuania': 'europe', 'luxembourg': 'europe',
  'malta': 'europe', 'moldova': 'europe', 'monaco': 'europe', 'montenegro': 'europe',
  'netherlands': 'europe', 'north-macedonia': 'europe', 'norway': 'europe', 'poland': 'europe',
  'portugal': 'europe', 'romania': 'europe', 'russia': 'europe', 'san-marino': 'europe',
  'serbia': 'europe', 'slovakia': 'europe', 'slovenia': 'europe', 'spain': 'europe',
  'sweden': 'europe', 'switzerland': 'europe', 'turkey': 'europe', 'ukraine': 'europe',
  'united-kingdom': 'europe', 'vatican-city': 'europe',
  'azores': 'europe', 'canary-islands': 'europe', 'faroe-islands': 'europe', 'gibraltar': 'europe',
  'guadeloupe': 'europe', 'isle-of-man': 'europe', 'jersey': 'europe', 'madeira': 'europe',
  'marie-galante': 'europe', 'martinique': 'europe', 'mayotte': 'europe', 'macedonia': 'europe',
  'northern-cyprus': 'europe', 'reunion': 'europe', 'saint-barthelemy': 'europe', 'scotland': 'europe',

  // Africa
  'algeria': 'africa', 'angola': 'africa', 'benin': 'africa', 'botswana': 'africa',
  'burkina-faso': 'africa', 'burundi': 'africa', 'cameroon': 'africa', 'cape-verde': 'africa',
  'central-african-republic': 'africa', 'chad': 'africa', 'comoros': 'africa', 'congo': 'africa',
  'djibouti': 'africa', 'egypt': 'africa', 'equatorial-guinea': 'africa', 'eritrea': 'africa',
  'eswatini': 'africa', 'ethiopia': 'africa', 'gabon': 'africa', 'gambia': 'africa',
  'ghana': 'africa', 'guinea': 'africa', 'guinea-bissau': 'africa', 'ivory-coast': 'africa',
  'kenya': 'africa', 'lesotho': 'africa', 'liberia': 'africa', 'libya': 'africa',
  'madagascar': 'africa', 'malawi': 'africa', 'mali': 'africa', 'mauritania': 'africa',
  'mauritius': 'africa', 'morocco': 'africa', 'mozambique': 'africa', 'namibia': 'africa',
  'niger': 'africa', 'nigeria': 'africa', 'rwanda': 'africa', 'sao-tome-and-principe': 'africa',
  'senegal': 'africa', 'seychelles': 'africa', 'sierra-leone': 'africa', 'somalia': 'africa',
  'south-africa': 'africa', 'south-sudan': 'africa', 'sudan': 'africa', 'tanzania': 'africa',
  'togo': 'africa', 'tunisia': 'africa', 'uganda': 'africa', 'zambia': 'africa', 'zimbabwe': 'africa',
  'cote-divoire': 'africa', 'democratic-republic-of-the-congo': 'africa',

  // Oceania
  'australia': 'oceania', 'fiji': 'oceania', 'french-polynesia': 'oceania', 'kiribati': 'oceania',
  'marshall-islands': 'oceania', 'micronesia': 'oceania', 'nauru': 'oceania', 'new-zealand': 'oceania',
  'palau': 'oceania', 'papua-new-guinea': 'oceania', 'samoa': 'oceania', 'solomon-islands': 'oceania',
  'tonga': 'oceania', 'tuvalu': 'oceania', 'vanuatu': 'oceania',

  // North America
  'canada': 'north-america', 'united-states': 'north-america', 'mexico': 'north-america',
  'greenland': 'north-america', 'guam': 'north-america', 'puerto-rico-us': 'north-america', 'virgin-islands': 'north-america',

  // Latin America / South America
  'argentina': 'latin-america', 'bolivia': 'latin-america', 'brazil': 'latin-america',
  'chile': 'latin-america', 'colombia': 'latin-america', 'costa-rica': 'latin-america',
  'ecuador': 'latin-america', 'el-salvador': 'latin-america', 'guatemala': 'latin-america',
  'honduras': 'latin-america', 'nicaragua': 'latin-america', 'panama': 'latin-america',
  'paraguay': 'latin-america', 'peru': 'latin-america', 'uruguay': 'latin-america',
  'venezuela': 'latin-america', 'belize': 'latin-america', 'guyana': 'latin-america',
  'suriname': 'latin-america', 'french-guiana': 'latin-america',

  // Caribbean
  'antigua-and-barbuda': 'caribbean', 'aruba': 'caribbean', 'bahamas': 'caribbean',
  'barbados': 'caribbean', 'bermuda': 'caribbean', 'cayman-islands': 'caribbean',
  'curacao': 'caribbean', 'dominica': 'caribbean', 'dominican-republic': 'caribbean',
  'grenada': 'caribbean', 'haiti': 'caribbean', 'jamaica': 'caribbean',
  'puerto-rico': 'caribbean', 'saint-lucia': 'caribbean', 'trinidad-and-tobago': 'caribbean',
  'anguilla': 'caribbean', 'antilles': 'caribbean', 'bonaire': 'caribbean', 'british-virgin-islands': 'caribbean',
  'montserrat': 'caribbean', 'saba': 'caribbean', 'saint-kitts-and-nevis': 'caribbean',
  'saint-martinfrench-part': 'caribbean', 'saint-vincent-and-the-grenadines': 'caribbean',
  'sint-eustatius': 'caribbean', 'sint-maartendutch-part': 'caribbean', 'turks-and-caicos-islands': 'caribbean'
};
