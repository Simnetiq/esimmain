/**
 * PlansManagement Module
 *
 * A modular plans management system with:
 * - Supabase as primary data source (server-side filtering)
 * - Firebase as secondary/legacy data source
 * - Airalo API for sync/recovery operations
 *
 * Architecture:
 * - /api/plans - Server-side filtered API endpoint
 * - usePlansData hook - Unified data management
 * - Separated components for maintainability
 */

// Main component
export { default } from './PlansManagement';
export { default as PlansManagement } from './PlansManagement';

// Sub-components
export { default as PlansHeader } from './components/PlansHeader';
export { default as PlansStatusBanner } from './components/PlansStatusBanner';
export { default as DataSourceTabs } from './components/DataSourceTabs';
export { default as PlansFilters } from './components/PlansFilters';
export { default as PlansSearch } from './components/PlansSearch';
export { default as SupabaseTable } from './components/SupabaseTable';
export { default as StandardTable } from './components/StandardTable';
export { default as PlansPagination } from './components/PlansPagination';
export { FirebaseSyncModal, SupabaseSyncModal } from './components/SyncModals';

// Hooks
export { default as usePlansData } from './hooks/usePlansData';

// Utilities
export * from './utils/helpers';
