import dynamic from 'next/dynamic';
import { getActivePromo } from '../../src/lib/getActivePromo';
import NewHeroSection from '../../src/components/sections/NewHeroSection';
import PlansSection from '../../src/components/sections/PlansSection';
import HomePageWrapper from '../../src/components/HomePageWrapper';

// Dark skeleton placeholder for lazy-loaded sections
const loadingFallback = <div className="h-96 bg-[#141414] animate-pulse rounded-2xl mx-4" />;

const TrustIndicators = dynamic(() => import('../../src/components/sections/TrustIndicators'), { loading: () => loadingFallback });
const HowItWorks = dynamic(() => import('../../src/components/sections/HowItWorks'), { loading: () => loadingFallback });
const ComparisonTable = dynamic(() => import('../../src/components/sections/ComparisonTable'), { loading: () => loadingFallback });
const RoamingComparison = dynamic(() => import('../../src/components/sections/RoamingComparison'), { loading: () => loadingFallback });
const FeaturesBento = dynamic(() => import('../../src/components/sections/FeaturesBento'), { loading: () => loadingFallback });
const CoverageStats = dynamic(() => import('../../src/components/sections/CoverageStats'), { loading: () => loadingFallback });
const DeviceCompatibility = dynamic(() => import('../../src/components/sections/DeviceCompatibility'), { loading: () => loadingFallback });
const PromoCodeBanner = dynamic(() => import('../../src/components/sections/PromoCodeBanner'), { loading: () => loadingFallback });
const AppDownload = dynamic(() => import('../../src/components/sections/AppDownload'), { loading: () => loadingFallback });
const DopplerCrossSell = dynamic(() => import('../../src/components/sections/DopplerCrossSell'), { loading: () => loadingFallback });
const SocialProof = dynamic(() => import('../../src/components/sections/SocialProof'), { loading: () => loadingFallback });
const FAQSection = dynamic(() => import('../../src/components/sections/FAQSection'), { loading: () => loadingFallback });
const TravelBlogsSection = dynamic(() => import('../../src/components/sections/TravelBlogsSection'), { loading: () => loadingFallback });
const FinalCTA = dynamic(() => import('../../src/components/sections/FinalCTA'), { loading: () => loadingFallback });

export default async function HomePage() {
  const promo = await getActivePromo();

  return (
    <HomePageWrapper>
      <NewHeroSection promo={promo} />
      <TrustIndicators />
      <HowItWorks />
      <PlansSection />
      <ComparisonTable />
      <RoamingComparison />
      <FeaturesBento />
      <CoverageStats />
      <DeviceCompatibility />
      <PromoCodeBanner promo={promo} />
      <AppDownload />
      <DopplerCrossSell />
      <SocialProof />
      <FAQSection />
      <TravelBlogsSection />
      <FinalCTA promo={promo} />
    </HomePageWrapper>
  );
}
