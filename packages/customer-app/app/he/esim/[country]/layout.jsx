import { generateCountryMetadata } from '../../../../lib/countryMetadata';

export async function generateMetadata({ params }) {
  const { country } = params;
  return generateCountryMetadata(country, 'he');
}

export default function CountryLayout({ children }) {
  return children;
}
