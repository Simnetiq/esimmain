import { redirect } from 'next/navigation';
import { fetchCountryPageData, generateCountryJsonLd, fetchAllCountrySlugs } from '../../../../lib/countryPageData';
import EsimCountryPage from '../../../../src/components/EsimCountryPage';

export const revalidate = 3600;

export async function generateStaticParams() {
  return fetchAllCountrySlugs();
}

export default async function Page({ params }) {
  const { country } = await params;
  const locale = 'de';
  const data = await fetchCountryPageData(country, locale);

  if (!data) {
    redirect('/de/esim-plans');
  }

  const jsonLd = generateCountryJsonLd({
    countryName: data.countryName,
    countrySlug: country,
    plans: data.plans,
    locale,
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
