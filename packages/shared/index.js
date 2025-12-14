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

// Lazy Firebase Auth (for performance optimization)
export * from './firebase/lazyAuth';

