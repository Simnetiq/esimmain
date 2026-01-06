/**
 * TypeScript types for Supabase database tables
 * These types match the Supabase schema for countries, regions, and dataplans
 */

// ============================================================================
// REGIONS
// ============================================================================

export interface Region {
  id: string;
  slug: string;
  name: string;
  display_name?: string;
  type: 'global' | 'continent' | 'region' | 'special';
  image_url?: string;
  display_order: number;
  is_active: boolean;
  country_count?: number;
  plan_count?: number;
  min_price?: number;
  metadata?: Record<string, unknown>;
  synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RegionTranslation {
  id: number;
  region_id: string;
  language_code: string;
  name: string;
  display_name?: string;
  source?: string;
  is_verified?: boolean;
  created_at: string;
}

export interface RegionWithTranslations extends Region {
  translations: Record<string, { name: string; display_name?: string; source?: string }>;
  countries?: CountrySummary[];
  top_tariffs?: TariffSummary[];
  tariff_count?: number;
}

// ============================================================================
// COUNTRIES
// ============================================================================

export interface Country {
  id: string;
  name: string;
  slug?: string;
  title?: string;
  iso_code: string;
  image_url?: string;
  description?: string;
  continent?: string;
  region_id?: string;
  plan_count: number;
  min_price?: number;
  is_active: boolean;
  is_popular: boolean;
  is_regional: boolean;
  provider?: string;
  synced_at?: string;
  firebase_updated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CountryTranslation {
  id: number;
  country_id: string;
  language_code: string;
  name: string;
  description?: string;
  source?: string;
  is_verified?: boolean;
  last_updated_at: string;
}

export interface CountryWithTranslations extends Country {
  translations: Record<string, string>;
  country_translations?: CountryTranslation[];
}

export interface CountrySummary {
  id: string;
  name: string;
  iso_code: string;
  image_url?: string;
  plan_count?: number;
  is_popular?: boolean;
}

// ============================================================================
// DATA PLANS
// ============================================================================

export interface DataPlan {
  id: string;
  name: string;
  data_display?: string;
  data_amount_mb?: number;
  validity_days: number;
  price: number;
  currency?: string;
  has_voice: boolean;
  has_sms: boolean;
  is_unlimited: boolean;
  is_regional: boolean;
  is_enabled: boolean;
  plan_type?: 'local' | 'regional' | 'global';
  status: 'active' | 'inactive' | 'discontinued';
  country_id?: string;
  country_iso?: string;
  region_id?: string;
  covered_countries?: string[];
  operator_name?: string;
  operator_logo?: string;
  provider?: string;
  airalo_package_id?: string;
  metadata?: Record<string, unknown>;
  synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TariffSummary {
  id: string;
  name: string;
  data_amount_mb: number;
  is_unlimited: boolean;
  validity_days: number;
  price: number;
  has_voice: boolean;
  has_sms: boolean;
}

// ============================================================================
// VIEW MODELS (for UI consumption)
// ============================================================================

export interface CountryViewModel {
  id: string;
  code: string;
  name: string;
  displayName: string;
  slug?: string;
  imageUrl?: string;
  flagEmoji: string;
  planCount: number;
  minPrice?: number;
  isActive: boolean;
  isPopular: boolean;
  isRegional: boolean;
  region?: string;
  translations?: Record<string, string>;
  status: 'active' | 'inactive';
}

export interface RegionViewModel {
  id: string;
  name: string;
  displayName: string;
  type: string;
  icon?: string;
  imageUrl?: string;
  order: number;
  isActive: boolean;
  countryCount?: number;
  planCount?: number;
  minPrice?: number;
  countries?: CountrySummary[];
  topTariffs?: TariffSummary[];
  translations?: Record<string, { name: string; displayName?: string }>;
}

export interface PlanViewModel {
  id: string;
  name: string;
  data: string;
  dataAmountMb?: number;
  validity: number;
  price: number;
  currency: string;
  hasVoice: boolean;
  hasSms: boolean;
  isUnlimited: boolean;
  isRegional: boolean;
  countryId?: string;
  countryCodes?: string[];
  operatorName?: string;
  operatorLogo?: string;
  isBestValue?: boolean;
  country_slug?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
}

export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters?: Record<string, unknown>;
  sort?: {
    column: string;
    direction: 'asc' | 'desc';
  };
  error?: string;
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

export interface UseCountriesResult {
  countries: CountryViewModel[];
  filteredCountries: CountryViewModel[];
  setFilteredCountries: (countries: CountryViewModel[]) => void;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseRegionsResult {
  regions: RegionViewModel[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UsePlansResult {
  plans: PlanViewModel[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
