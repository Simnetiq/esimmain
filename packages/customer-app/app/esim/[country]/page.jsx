import { redirect } from 'next/navigation';
import { fetchCountryPageData, generateCountryJsonLd, fetchAllCountrySlugs } from '../../../lib/countryPageData';
import EsimCountryPage from '../../../src/components/EsimCountryPage';

export const revalidate = 3600; // ISR: revalidate every hour

export async function generateStaticParams() {
  return fetchAllCountrySlugs();
}

export default async function Page({ params }) {
  const { country } = await params;
  const data = await fetchCountryPageData(country, 'en');

  if (!data) {
    redirect('/esim-plans');
  }

  const jsonLd = generateCountryJsonLd({
    countryName: data.countryName,
    countrySlug: country,
    plans: data.plans,
    locale: 'en',
    imageUrl: data.country.image_url,
  });

  return (
    <>
      {jsonLd.map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
      <EsimCountryPage
        initialCountry={data.country}
        initialCountryName={data.countryName}
        initialPlans={data.plans}
        initialRegionalPlans={data.regionalPlans}
        initialRegionName={data.regionName}
        initialRelatedCountries={data.relatedCountries}
      />
    </>
  );
}
