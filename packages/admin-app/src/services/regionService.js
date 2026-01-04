/**
 * Region Service - Supabase operations for region management
 */

/**
 * Fetch regions with optional filtering and stats
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Regions response
 */
export async function fetchRegions(filters = {}) {
  const params = new URLSearchParams();

  if (filters.search) params.append('search', filters.search);
  if (filters.type) params.append('type', filters.type);
  if (filters.isActive !== null && filters.isActive !== undefined) {
    params.append('isActive', String(filters.isActive));
  }
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortDir) params.append('sortDir', filters.sortDir);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.includeStats) params.append('includeStats', 'true');

  const response = await fetch(`/api/regions?${params.toString()}`);
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch regions');
  }

  return result;
}

/**
 * Fetch a single region by ID with full stats
 * @param {string} id - Region ID
 * @returns {Promise<Object|null>} Region with stats or null
 */
export async function fetchRegionById(id) {
  const response = await fetch(`/api/regions?search=${encodeURIComponent(id)}&includeStats=true&limit=1`);
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch region');
  }

  const region = result.data?.find((r) => r.id === id);
  return region || null;
}

/**
 * Create a new region
 * @param {Object} data - Region data
 * @returns {Promise<Object>} Created region
 */
export async function createRegion(data) {
  const response = await fetch('/api/regions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to create region');
  }

  return result.data;
}

/**
 * Update an existing region
 * @param {Object} data - Region update data (must include id)
 * @returns {Promise<Object>} Updated region
 */
export async function updateRegion(data) {
  const response = await fetch('/api/regions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to update region');
  }

  return result.data;
}

/**
 * Delete a region
 * @param {string} id - Region ID
 * @returns {Promise<void>}
 */
export async function deleteRegion(id) {
  const response = await fetch(`/api/regions?id=${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete region');
  }
}

/**
 * Toggle region active status
 * @param {string} id - Region ID
 * @param {boolean} isActive - New active status
 * @returns {Promise<Object>} Updated region
 */
export async function toggleRegionActive(id, isActive) {
  return updateRegion({ id, is_active: isActive });
}

/**
 * Fetch tariffs for a specific region
 * @param {string} regionId - Region ID
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Tariffs data and count
 */
export async function fetchRegionTariffs(regionId, options = {}) {
  const params = new URLSearchParams();
  params.append('regionId', regionId);

  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.sortDir) params.append('sortDir', options.sortDir);
  if (options.limit) params.append('limit', String(options.limit));
  if (options.status) params.append('status', options.status);

  const response = await fetch(`/api/regions/tariffs?${params.toString()}`);
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch region tariffs');
  }

  return {
    data: result.data,
    count: result.count
  };
}

/**
 * Toggle featured status for a tariff
 * @param {string} planId - Plan ID
 * @param {boolean} isFeatured - New featured status
 * @returns {Promise<Object>} Result
 */
export async function toggleTariffFeatured(planId, isFeatured) {
  const response = await fetch('/api/regions/tariffs/featured', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, is_featured: isFeatured })
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to toggle featured status');
  }

  return result;
}

/**
 * Update region statistics (country_count, plan_count, min_price)
 * @param {string} regionId - Region ID
 * @returns {Promise<Object>} Updated region
 */
export async function recalculateRegionStats(regionId) {
  // Fetch fresh stats
  const tariffs = await fetchRegionTariffs(regionId, { status: 'active' });

  // Calculate min price
  const prices = tariffs.data.map(t => t.price).filter(p => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;

  // Update the region
  return updateRegion({
    id: regionId,
    plan_count: tariffs.count,
    min_price: minPrice
  });
}

/**
 * Update region translations
 * @param {string} regionId - Region ID
 * @param {Object} translations - Translations object
 * @returns {Promise<Object>} Updated region
 */
export async function updateRegionTranslations(regionId, translations) {
  return updateRegion({
    id: regionId,
    translations
  });
}

/**
 * Bulk update region display orders
 * @param {Array<{id: string, display_order: number}>} orders - Array of id/order pairs
 * @returns {Promise<void>}
 */
export async function updateRegionDisplayOrders(orders) {
  // Update each region's display order
  await Promise.all(
    orders.map(({ id, display_order }) =>
      updateRegion({ id, display_order })
    )
  );
}

/**
 * Get region types for filtering
 * @returns {Array<{value: string, label: string}>} Region types
 */
export function getRegionTypes() {
  return [
    { value: 'global', label: 'Global' },
    { value: 'continent', label: 'Continent' },
    { value: 'region', label: 'Region' },
    { value: 'special', label: 'Special' }
  ];
}

/**
 * Get region type badge color
 * @param {string} type - Region type
 * @returns {string} Tailwind CSS classes
 */
export function getRegionTypeColor(type) {
  switch (type) {
    case 'global':
      return 'bg-blue-100 text-blue-800';
    case 'continent':
      return 'bg-green-100 text-green-800';
    case 'region':
      return 'bg-orange-100 text-orange-800';
    case 'special':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
