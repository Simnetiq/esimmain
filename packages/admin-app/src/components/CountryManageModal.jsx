'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Globe,
  Infinity,
  RefreshCw,
  Download
} from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { fetchCountryPlansWithRegional } from '../services/planService';
import { formatPrice } from '@esim/shared/utils/priceUtils';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

const TABLE_COLUMNS = [
  { key: 'id', label: 'ID', sortable: true, width: 'w-32' },
  { key: 'name', label: 'Name', sortable: true, width: 'w-48' },
  { key: 'has_voice', label: 'Has Voice', sortable: true, width: 'w-24', type: 'boolean' },
  { key: 'is_unlimited', label: 'Is Unlimited', sortable: true, width: 'w-28', type: 'boolean' },
  { key: 'voice_minutes', label: 'Voice Minutes', sortable: true, width: 'w-28', type: 'number' },
  { key: 'operator_name', label: 'Operator', sortable: true, width: 'w-36' },
  { key: 'data_display', label: 'Data Amount', sortable: true, width: 'w-28' },
  { key: 'net_price', label: 'Net Price', sortable: true, width: 'w-24', type: 'currency' },
  { key: 'price', label: 'Retail Price', sortable: true, width: 'w-28', type: 'currency' },
  { key: 'airalo_price', label: 'Airalo Price', sortable: true, width: 'w-28', type: 'currency' }
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Sortable table header
 */
const SortableHeader = ({ column, sortColumn, sortDirection, onSort }) => (
  <th
    className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap ${column.width}`}
    onClick={() => column.sortable && onSort(column.key)}
  >
    <div className="flex items-center gap-1">
      <span>{column.label}</span>
      {column.sortable && (
        sortColumn === column.key ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
        )
      )}
    </div>
  </th>
);

/**
 * Boolean indicator cell
 */
const BooleanCell = ({ value }) => (
  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
    value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
  }`}>
    {value ? (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    )}
  </span>
);

/**
 * Currency cell with proper formatting
 */
const CurrencyCell = ({ value }) => (
  <span className="font-medium text-gray-900">
    {value > 0 ? formatPrice(value) : '-'}
  </span>
);

/**
 * Loading skeleton for table rows
 */
const TableSkeleton = ({ rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="animate-pulse">
        {TABLE_COLUMNS.map((col) => (
          <td key={col.key} className="px-4 py-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/**
 * Empty state component
 */
const EmptyState = ({ searchTerm }) => (
  <tr>
    <td colSpan={TABLE_COLUMNS.length} className="px-6 py-16 text-center">
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No plans found</h3>
        <p className="text-sm text-gray-500 max-w-sm">
          {searchTerm
            ? `No plans match "${searchTerm}". Try adjusting your search.`
            : 'This country has no data plans configured yet.'}
        </p>
      </div>
    </td>
  </tr>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CountryManageModal = ({
  isOpen,
  onClose,
  country,
  onEditCountry // Callback to open the edit country modal
}) => {
  // State
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('price');
  const [sortDirection, setSortDirection] = useState('asc');

  // Load plans when country changes - uses same service as TariffManagement
  const loadPlans = useCallback(async () => {
    // Use country.code like TariffManagement does
    const countryCode = country?.code || country?.id;
    if (!countryCode) {
      console.warn('No country code available');
      return;
    }

    try {
      setLoading(true);
      console.log('Loading plans for country:', countryCode);
      // Use the same service function that TariffManagement uses
      const plansData = await fetchCountryPlansWithRegional(countryCode);
      console.log('Plans loaded:', plansData.length);

      // Map to include additional fields needed for our table
      const mappedPlans = plansData.map(plan => ({
        ...plan,
        // Ensure all table columns have values
        operator_name: plan.operator_name || plan.operator || '-',
        data_display: plan.data || plan.data_display || '-',
        net_price: plan.net_price || 0,
        airalo_price: plan.airalo_price ?? plan.net_price ?? 0,
        voice_minutes: plan.voice_minutes || 0,
        has_voice: plan.has_voice === true,
        is_unlimited: plan.is_unlimited === true
      }));

      setPlans(mappedPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error(`Failed to load plans: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [country]);

  useEffect(() => {
    if (isOpen && country) {
      loadPlans();
      setSearchTerm('');
    }
  }, [isOpen, country, loadPlans]);

  // Sort handler
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filtered and sorted plans
  const filteredPlans = useMemo(() => {
    let result = [...plans];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(plan =>
        plan.name?.toLowerCase().includes(term) ||
        plan.operator_name?.toLowerCase().includes(term) ||
        plan.id?.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      // Handle null/undefined
      if (aVal == null) aVal = sortColumn.includes('price') ? 0 : '';
      if (bVal == null) bVal = sortColumn.includes('price') ? 0 : '';

      // Numeric comparison
      if (typeof aVal === 'number' || sortColumn.includes('price') || sortColumn === 'voice_minutes') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      // String comparison
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      let comparison = 0;
      if (aVal > bVal) comparison = 1;
      else if (aVal < bVal) comparison = -1;

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [plans, searchTerm, sortColumn, sortDirection]);

  // Stats summary
  const stats = useMemo(() => {
    const activePlans = plans.filter(p => p.is_enabled !== false);
    const prices = activePlans.map(p => p.price).filter(p => p > 0);
    const voicePlans = activePlans.filter(p => p.has_voice);
    const unlimitedPlans = activePlans.filter(p => p.is_unlimited);

    return {
      totalPlans: plans.length,
      activePlans: activePlans.length,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      withVoice: voicePlans.length,
      unlimited: unlimitedPlans.length
    };
  }, [plans]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredPlans.length === 0) {
      toast.error('No plans to export');
      return;
    }

    const headers = TABLE_COLUMNS.map(col => col.label);
    const rows = filteredPlans.map(plan =>
      TABLE_COLUMNS.map(col => {
        const value = plan[col.key];
        if (col.type === 'boolean') return value ? 'Yes' : 'No';
        if (col.type === 'currency') return value?.toFixed(2) || '0.00';
        return value ?? '';
      })
    );

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${country?.code || 'country'}-plans.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredPlans.length} plans`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-4">
              {/* Country Flag */}
              <div className="w-16 h-12 rounded-lg border-2 border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50 shadow-sm">
                {country?.imageUrl ? (
                  <Image
                    src={country.imageUrl}
                    alt={country.name || 'Country'}
                    width={64}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <Globe className="w-6 h-6 text-gray-400" />
                )}
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {country?.name || 'Country'}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({country?.code || 'N/A'})
                  </span>
                </h2>
                <p className="text-sm text-gray-500">
                  Manage plans and pricing for this country
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadPlans}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh plans"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalPlans}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Total Plans</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.activePlans}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.minPrice > 0 ? formatPrice(stats.minPrice) : '-'}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Min Price</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.maxPrice > 0 ? formatPrice(stats.maxPrice) : '-'}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Max Price</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">{stats.withVoice}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">With Voice</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.unlimited}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Unlimited</div>
            </div>
          </div>

          {/* Search & Actions Bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search plans by name, operator, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              {onEditCountry && (
                <button
                  onClick={() => onEditCountry(country)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Country
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {TABLE_COLUMNS.map((column) => (
                    <SortableHeader
                      key={column.key}
                      column={column}
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <TableSkeleton rows={8} />
                ) : filteredPlans.length > 0 ? (
                  filteredPlans.map((plan) => (
                    <tr
                      key={plan.id}
                      className="hover:bg-blue-50/50 transition-colors"
                    >
                      {/* ID */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-600 max-w-[120px] truncate block" title={plan.id}>
                          {plan.id?.substring(0, 20)}...
                        </span>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 truncate max-w-[180px]" title={plan.name}>
                          {plan.name}
                        </div>
                      </td>

                      {/* Has Voice */}
                      <td className="px-4 py-3">
                        <BooleanCell value={plan.has_voice} />
                      </td>

                      {/* Is Unlimited */}
                      <td className="px-4 py-3">
                        <BooleanCell value={plan.is_unlimited} />
                      </td>

                      {/* Voice Minutes */}
                      <td className="px-4 py-3 text-right">
                        <span className="text-gray-700">
                          {plan.voice_minutes > 0 ? plan.voice_minutes : '-'}
                        </span>
                      </td>

                      {/* Operator Name */}
                      <td className="px-4 py-3">
                        <span className="text-gray-700 truncate max-w-[140px] block" title={plan.operator_name}>
                          {plan.operator_name || '-'}
                        </span>
                      </td>

                      {/* Data Amount */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 ${plan.is_unlimited ? 'text-orange-600 font-medium' : 'text-gray-700'}`}>
                          {plan.is_unlimited ? (
                            <>
                              <Infinity className="w-4 h-4" />
                              Unlimited
                            </>
                          ) : (
                            plan.data_display || '-'
                          )}
                        </span>
                      </td>

                      {/* Net Price */}
                      <td className="px-4 py-3 text-right">
                        <CurrencyCell value={plan.net_price} />
                      </td>

                      {/* Retail Price */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-green-700">
                          {plan.price > 0 ? formatPrice(plan.price) : '-'}
                        </span>
                      </td>

                      {/* Airalo Price */}
                      <td className="px-4 py-3 text-right">
                        <CurrencyCell value={plan.airalo_price} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyState searchTerm={searchTerm} />
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-600">
              Showing {filteredPlans.length} of {plans.length} plans
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CountryManageModal;
