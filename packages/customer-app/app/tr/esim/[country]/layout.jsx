import { generateCountryMetadata } from '../../../../lib/countryMetadata';

export async function generateMetadata({ params }) {
  const { country } = params;
  return generateCountryMetadata(country, 'tr');
}

export default function CountryLayout({ children }) {
  return children;
}
