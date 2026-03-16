import { generateCountryMetadata } from '../../../../lib/countryMetadata';

export async function generateMetadata({ params }) {
  const { country } = params;
  return generateCountryMetadata(country, 'hi');
}

export default function CountryLayout({ children }) {
  return children;
}
