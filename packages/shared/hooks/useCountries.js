/**
 * useCountries Hook - Supabase version
 * Re-exports useCountriesSupabase for backwards compatibility
 */

// Re-export everything from the Supabase version
export { useCountriesSupabase as useCountries, useCountryPlansSupabase } from './useCountriesSupabase';

// Default export for compatibility
export { useCountriesSupabase as default } from './useCountriesSupabase';
