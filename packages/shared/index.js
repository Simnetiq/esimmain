// Shared package exports
export * from './lib/supabase';
export * from './contexts/AuthContext';
export * from './contexts/AdminContext';
export * from './services/adminService';
export * from './services/fraudDetectionService';
export * from './services/fraudSignalsService';
export * from './services/promoCodeService';

// Utils
export { default as providerUtils } from './utils/providerUtils';
export * from './utils/priceUtils';
export * from './utils/esimFieldMapper';
export * from './utils/planDisplayUtils';
export * from './utils/languageUtils';

// Constants
export const GLOBAL_PLAN_IMAGE_URL = 'https://cdn.airalo.com/images/5c6c78b0-1713-43f1-807e-7c62ab1904e9.png';

// Hooks
export { useCountries } from './hooks/useCountries';
export { useCountryFilters } from './hooks/useCountryFilters';
export { useRegions } from './hooks/useRegions';

// Supabase Hooks
export { useCountriesSupabase, useCountryPlansSupabase } from './hooks/useCountriesSupabase';
export { useCountryFiltersSupabase } from './hooks/useCountryFiltersSupabase';
export { usePromotedCountriesSupabase } from './hooks/usePromotedCountriesSupabase';
export { usePlanSupabase, usePlansSupabase, fetchPlanById as fetchPlanByIdHook } from './hooks/usePlanSupabase';
export { useRegionsSupabase, useRegionDetailsSupabase } from './hooks/useRegionsSupabase';

// Supabase Services
export {
  fetchPlanById,
  fetchCountryPlans,
  fetchGlobalPlans,
  fetchRegionalPlans,
  transformPlanToViewModel
} from './services/plansServiceSupabase';

// Components
export { default as AuthModal } from './components/AuthModal.jsx';
export { default as Providers } from './components/Providers.jsx';
export { default as LightProviders } from './components/LightProviders.jsx';
export { default as Loading } from './components/Loading.jsx';
export { default as FlagImage, FLAG_SVG_SET } from './components/FlagImage.jsx';
