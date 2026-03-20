import { generateCountryMetadata } from '../../../../lib/countryMetadata';

export async function generateMetadata({ params }) {
  const { country } = await params;
  return generateCountryMetadata(country, 'ro');
}

export default function CountryLayout({ children }) {
  return children;
}
