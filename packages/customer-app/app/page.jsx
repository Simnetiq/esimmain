import dynamic from 'next/dynamic';
import { getActivePromo } from '../src/lib/getActivePromo';
import NewHeroSection from '../src/components/sections/NewHeroSection';
import HomePageWrapper from '../src/components/HomePageWrapper';

// Dark skeleton placeholder for lazy-loaded sections
const loadingFallback = <div className="h-96 bg-[var(--card-bg)] animate-pulse mx-4" />;

const HowItWorks = dynamic(() => import('../src/components/sections/HowItWorks'), { loading: () => loadingFallback });
const RoamingComparison = dynamic(() => import('../src/components/sections/RoamingComparison'), { loading: () => loadingFallback });
const CoverageStats = dynamic(() => import('../src/components/sections/CoverageStats'), { loading: () => loadingFallback });
const FeaturesBento = dynamic(() => import('../src/components/sections/FeaturesBento'), { loading: () => loadingFallback });
const AppDownload = dynamic(() => import('../src/components/sections/AppDownload'), { loading: () => loadingFallback });
const FAQSection = dynamic(() => import('../src/components/sections/FAQSection'), { loading: () => loadingFallback });
const TravelBlogsSection = dynamic(() => import('../src/components/sections/TravelBlogsSection'), { loading: () => loadingFallback });

export default async function HomePage() {
  const promo = await getActivePromo();

  return (
    <HomePageWrapper>
      <NewHeroSection promo={promo} />
      <RoamingComparison />
      <CoverageStats />
      <FeaturesBento />
      <HowItWorks />
      <AppDownload />
      <FAQSection />
      <TravelBlogsSection />
    </HomePageWrapper>
  );
}
