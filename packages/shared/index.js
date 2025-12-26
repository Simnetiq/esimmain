// Shared package exports
export * from './firebase/config';
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

// Hooks
export { useCountries } from './hooks/useCountries';
export { useCountryFilters } from './hooks/useCountryFilters';
export { useRegions } from './hooks/useRegions';
export { useLazyAuth } from './hooks/useLazyAuth';

// Components
export { default as AuthModal } from './components/AuthModal.jsx';
export { default as Providers } from './components/Providers.jsx';
export { default as LightProviders } from './components/LightProviders.jsx';
export { default as Loading } from './components/Loading.jsx';

// Lazy Firebase Auth (for performance optimization)
export * from './firebase/lazyAuth';


