'use client';

import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Globe,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  ExternalLink,
  MapPin,
  DollarSign,
  Package,
  Loader2
} from 'lucide-react';
import { getRegionTypeColor } from '../../../services/regionService';

// Type for region data with stats
interface RegionWithStats {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  type: string;
  display_order: number;
  image_url?: string;
  is_active: boolean;
  country_count?: number;
  plan_count?: number;
  tariff_count?: number;
  min_price?: number;
  countries?: Array<{ id: string; name: string; iso_code: string; is_popular: boolean }>;
  top_tariffs?: Array<{ id: string; name: string; data_amount_mb: number; is_unlimited: boolean; price: number }>;
}

interface SortableHeaderProps {
  column: string;
  label: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  denseMode: boolean;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  column,
  label,
  sortColumn,
  sortDirection,
  onSort,
  denseMode
}) => (
  <th className={`${denseMode ? 'px-2 py-2' : 'px-4 py-3'} text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-blue-50 select-none whitespace-nowrap`}
    onClick={() => onSort(column)}
  >
    <div className="flex items-center gap-1">
      {label}
      {sortColumn === column ? (
        sortDirection === 'asc' ? (
          <ChevronUp className="w-3 h-3 text-blue-600" />
        ) : (
          <ChevronDown className="w-3 h-3 text-blue-600" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 text-gray-400" />
      )}
    </div>
  </th>
);

interface RegionsTableProps {
  regions: RegionWithStats[];
  selectedRows: string[];
  onRowClick: (event: React.MouseEvent | null, id: string | null, clearAll?: boolean) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  denseMode: boolean;
  onEdit: (region: RegionWithStats) => void;
  onView: (region: RegionWithStats) => void;
  onDelete: (regionId: string) => void;
  onToggleVisibility: (regionId: string, currentlyActive: boolean) => void;
  loading: boolean;
}

const RegionsTable: React.FC<RegionsTableProps> = ({
  regions,
  selectedRows,
  onRowClick,
  onSelectAllClick,
  sortColumn,
  sortDirection,
  onSort,
  denseMode,
  onEdit,
  onView,
  onDelete,
  onToggleVisibility,
  loading
}) => {
  const isRowSelected = (id: string) => selectedRows.indexOf(id) !== -1;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading regions...</span>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className={`px-4 py-3 flex items-center justify-between border-b border-gray-200 ${
        selectedRows.length > 0 ? 'bg-blue-50' : 'bg-gray-50'
      }`}>
        {selectedRows.length > 0 ? (
          <span className="text-sm font-medium text-blue-800">
            {selectedRows.length} selected
          </span>
        ) : (
          <span className="text-sm font-medium text-gray-700">
            Supabase Regions
          </span>
        )}
        <div className="flex items-center gap-4">
          {selectedRows.length > 0 && (
            <button
              onClick={() => onRowClick(null, null, true)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear selection
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-50 sticky top-0">
            <tr>
              {/* Checkbox column */}
              <th className={`${denseMode ? 'px-2 py-2' : 'px-4 py-3'} text-left`}>
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={regions.length > 0 && selectedRows.length === regions.length}
                  onChange={onSelectAllClick}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = selectedRows.length > 0 && selectedRows.length < regions.length;
                    }
                  }}
                />
              </th>
              <SortableHeader column="display_order" label="Order" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="name" label="Name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="type" label="Type" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="country_count" label="Countries" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="plan_count" label="Tariffs" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="min_price" label="Min Price" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <th className={`${denseMode ? 'px-2 py-2' : 'px-4 py-3'} text-left text-xs font-medium text-gray-500 uppercase`}>
                Top 4 Tariffs
              </th>
              <th className={`${denseMode ? 'px-2 py-2' : 'px-4 py-3'} text-left text-xs font-medium text-gray-500 uppercase`}>
                Status
              </th>
              <th className={`${denseMode ? 'px-2 py-2' : 'px-4 py-3'} text-right text-xs font-medium text-gray-500 uppercase`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {regions.length > 0 ? (
              regions.map((region) => {
                const isSelected = isRowSelected(region.id);
                const popularCountries = region.countries?.filter(c => c.is_popular).slice(0, 4) || [];
                const topTariffs = region.top_tariffs?.slice(0, 4) || [];

                return (
                  <tr
                    key={region.id}
                    onClick={(event) => onRowClick(event, region.id)}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={-1}
                    className={`${denseMode ? 'text-xs' : 'text-sm'} cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-blue-50/30'
                    } ${!region.is_active ? 'opacity-60' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className={`${denseMode ? 'px-2 py-2' : 'px-4 py-3'} whitespace-nowrap`}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        checked={isSelected}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>

                    {/* Display Order */}
                    <td className={`${denseMode ? 'px-2 py-2' : 'px-4 py-3'} whitespace-nowrap text-center text-gray-600`}>
                      {region.display_order}
                    </td>

                    {/* Name with Image */}
                    <td className={`${denseMode ? 'px-2 py-2' : 'px-4 py-3'} whitespace-nowrap`}>
                      <div className="flex items-center gap-3">
                        {region.image_url ? (
                          <img
                            src={region.image_url}
                            alt={region.name}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{region.name}</div>
                          <div className="text-xs text-gray-500">{region.display_name || region.slug}</div>
                        </div>
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className={`${denseMode ? 'px-2 py-2' : 'px-4 py-3'} whitespace-nowrap`}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRegionTypeColor(region.type)}`}>
                        {region.type}
                      </span>
                    </td>

                    {/* Country Count */}
                    <td className={`${denseMode ? 'px-2 py-2' : 'px-4 py-3'} whitespace-nowrap`}>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{region.country_count || region.countries?.length || 0}</span>
                      </div>
                      {popularCountries.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          {popularCountries.slice(0, 3).map((country) => (
                            <span
                              key={country.id}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-800"
                              title={country.name}
                            >
                              {country.iso_code}
                            </span>
                          ))}
                          {popularCountries.length > 3 && (
                            <span className="text-xs text-gray-400">+{popularCountries.length - 3}</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Tariff Count */}
                    <td className={`${denseMode ? 'px-2 py-2' : 'px-4 py-3'} whitespace-nowrap`}>
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{region.tariff_count || region.plan_count || 0}</span>
                      </div>
                    </td>

                    {/* Min Price */}
                    <td className={`${denseMode ? 'px-2 py-2' : 'px-4 py-3'} whitespace-nowrap`}>
                      {region.min_price ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-green-500" />
                          <span className="font-medium text-gray-900">{region.min_price.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Top 4 Tariffs */}
                    <td className={`${denseMode ? 'px-2 py-2' : 'px-4 py-3'}`}>
                      {topTariffs.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {topTariffs.map((tariff) => {
                            const dataDisplay = tariff.is_unlimited
                              ? 'Unlimited'
                              : tariff.data_amount_mb >= 1024
                                ? `${(tariff.data_amount_mb / 1024).toFixed(tariff.data_amount_mb % 1024 === 0 ? 0 : 1)} GB`
                                : `${tariff.data_amount_mb} MB`;
                            return (
                              <span
                                key={tariff.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                                title={`${tariff.name} - $${tariff.price}`}
                              >
                                {dataDisplay} / ${tariff.price}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No tariffs</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className={`${denseMode ? 'px-2 py-2' : 'px-4 py-3'} whitespace-nowrap`}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        region.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {region.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className={`${denseMode ? 'px-2 py-2' : 'px-4 py-3'} whitespace-nowrap text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onView(region);
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(region);
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit region"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility(region.id, region.is_active);
                          }}
                          className={`p-1.5 rounded transition-colors ${
                            region.is_active
                              ? 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={region.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {region.is_active ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(region.id);
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete region"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <Globe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No regions found</p>
                    <p className="text-sm">Adjust your filters or create a new region</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default RegionsTable;
