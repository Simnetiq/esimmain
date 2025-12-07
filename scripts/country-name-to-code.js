// Map country names from Airalo CSV to ISO country codes
// This ensures compatibility with existing Firebase countries collection

const COUNTRY_NAME_TO_CODE = {
  // North America
  'United States': 'united-states',
  'Canada': 'canada',
  'Mexico': 'mexico',
  
  // Europe
  'France': 'france',
  'Spain': 'spain',
  'Italy': 'italy',
  'Germany': 'germany',
  'United Kingdom': 'united-kingdom',
  'Switzerland': 'switzerland',
  'Netherlands': 'netherlands',
  'Belgium': 'belgium',
  'Austria': 'austria',
  'Portugal': 'portugal',
  'Greece': 'greece',
  'Ireland': 'ireland',
  'Poland': 'poland',
  'Czech Republic': 'czech-republic',
  'Hungary': 'hungary',
  'Romania': 'romania',
  'Sweden': 'sweden',
  'Norway': 'norway',
  'Denmark': 'denmark',
  'Finland': 'finland',
  
  // Asia
  'China': 'china',
  'Japan': 'japan',
  'South Korea': 'south-korea',
  'Thailand': 'thailand',
  'Singapore': 'singapore',
  'Malaysia': 'malaysia',
  'Indonesia': 'indonesia',
  'Philippines': 'philippines',
  'Vietnam': 'vietnam',
  'India': 'india',
  'Pakistan': 'pakistan',
  'Bangladesh': 'bangladesh',
  'Sri Lanka': 'sri-lanka',
  'Nepal': 'nepal',
  'Hong Kong': 'hong-kong',
  'Macau': 'macau',
  'Taiwan': 'taiwan',
  
  // Regions (special handling)
  'Europe': 'europe',
  'Asia': 'asia',
  'Africa': 'africa',
  'North America': 'north-america',
  'South America': 'south-america',
  'Caribbean': 'caribbean',
  'Middle East': 'middle-east',
  'Oceania': 'oceania'
};

// Function to get country code from name
function getCountryCode(countryName) {
  // Check if we have a direct mapping
  if (COUNTRY_NAME_TO_CODE[countryName]) {
    return COUNTRY_NAME_TO_CODE[countryName];
  }
  
  // Otherwise, create a slug from the name
  return countryName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

module.exports = { COUNTRY_NAME_TO_CODE, getCountryCode };














