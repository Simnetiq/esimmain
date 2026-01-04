'use client';

import React from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown, Database, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Sortable header component
 */
const SortableHeader = ({ column, label, sortColumn, sortDirection, onSort, denseMode }) => (
  <th
    className={`${denseMode ? 'px-2 py-2' : 'px-3 py-3'} text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-emerald-100 select-none whitespace-nowrap`}
    onClick={() => onSort(column)}
  >
    <div className="flex items-center gap-1">
      {label}
      {sortColumn === column ? (
        sortDirection === 'asc' ? (
          <ChevronUp className="w-3 h-3 text-emerald-600" />
        ) : (
          <ChevronDown className="w-3 h-3 text-emerald-600" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 text-gray-400" />
      )}
    </div>
  </th>
);

/**
 * Supabase-specific table with all columns, sorting, and selection
 */
const SupabaseTable = ({
  plans,
  selectedRows,
  onRowClick,
  onSelectAllClick,
  sortColumn,
  sortDirection,
  onSort,
  denseMode,
  emptyRows
}) => {
  const isRowSelected = (id) => selectedRows.indexOf(id) !== -1;

  return (
    <>
      {/* Toolbar */}
      <div className={`px-4 py-3 flex items-center justify-between border-b border-gray-200 ${
        selectedRows.length > 0 ? 'bg-emerald-50' : 'bg-gray-50'
      }`}>
        {selectedRows.length > 0 ? (
          <span className="text-sm font-medium text-emerald-800">
            {selectedRows.length} selected
          </span>
        ) : (
          <span className="text-sm font-medium text-gray-700">
            Supabase Dataplans
          </span>
        )}
        <div className="flex items-center gap-4">
          {selectedRows.length > 0 && (
            <button
              onClick={() => {
                toast.success(`${selectedRows.length} plans selected (actions coming soon)`);
              }}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onRowClick(null, null, true)} // Clear selection
            className={`text-xs text-gray-500 hover:text-gray-700 ${selectedRows.length === 0 ? 'invisible' : ''}`}
          >
            Clear selection
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-max divide-y divide-gray-200">
          <thead className="bg-emerald-50 sticky top-0">
            <tr>
              {/* Checkbox column */}
              <th className={`${denseMode ? 'px-2 py-2' : 'px-3 py-3'} text-left`}>
                <input
                  type="checkbox"
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  checked={plans.length > 0 && selectedRows.length === plans.length}
                  onChange={onSelectAllClick}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = selectedRows.length > 0 && selectedRows.length < plans.length;
                    }
                  }}
                />
              </th>
              <SortableHeader column="id" label="ID" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="name" label="Name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="title" label="Title" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="type" label="Type" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="plan_category" label="Category" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="country_id" label="Country ID" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="country_name" label="Country" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="country_iso" label="ISO" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="region_id" label="Region" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="is_regional" label="Regional?" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="covered_countries_count" label="Covered" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="data_display" label="Data Display" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="data_amount_mb" label="Data (MB)" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="is_unlimited" label="Unlimited?" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="validity_days" label="Validity" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="has_voice" label="Voice?" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="voice_minutes" label="Voice Min" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="has_sms" label="SMS?" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="sms_count" label="SMS Count" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="price" label="Price" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="net_price" label="Net Price" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="currency" label="Currency" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="operator_id" label="Op. ID" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="operator_name" label="Operator" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="operator_style" label="Op. Style" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="operator_gradient_start" label="Gradient Start" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="operator_gradient_end" label="Gradient End" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="activation_policy" label="Activation" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="fair_usage_policy" label="Fair Usage" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="short_info" label="Short Info" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="apn_type" label="APN Type" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="apn_value" label="APN Value" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="status" label="Status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="enabled" label="Enabled?" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="provider" label="Provider" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
              <SortableHeader column="synced_at" label="Synced At" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} denseMode={denseMode} />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {plans.length > 0 ? (
              plans.map((plan) => {
                const isSelected = isRowSelected(plan.id);
                return (
                  <tr
                    key={plan.id}
                    onClick={(event) => onRowClick(event, plan.id)}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={-1}
                    className={`${denseMode ? 'text-xs' : 'text-sm'} cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50' : 'hover:bg-emerald-50/30'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap`}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                        checked={isSelected}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    {/* ID */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap font-mono text-xs text-gray-600 max-w-[120px] truncate`} title={plan.id}>
                      {plan.id?.substring(0, 15)}...
                    </td>
                    {/* Name */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap`}>
                      <div className="font-medium text-gray-900 max-w-[150px] truncate" title={plan.name}>
                        {plan.name}
                      </div>
                    </td>
                    {/* Title */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap`}>
                      <div className="text-gray-700 max-w-[150px] truncate" title={plan.title}>
                        {plan.title || '-'}
                      </div>
                    </td>
                    {/* Type */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-gray-600`}>
                      {plan.type || '-'}
                    </td>
                    {/* Plan Category */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap`}>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        plan.plan_category === 'global' ? 'bg-blue-100 text-blue-800' :
                        plan.plan_category === 'regional' ? 'bg-green-100 text-green-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {plan.plan_category || 'country'}
                      </span>
                    </td>
                    {/* Country ID */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-xs text-gray-600`}>
                      {plan.country_id || '-'}
                    </td>
                    {/* Country Name */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-gray-900`}>
                      {plan.country_name || '-'}
                    </td>
                    {/* Country ISO */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-gray-600`}>
                      {plan.country_iso || '-'}
                    </td>
                    {/* Region ID */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-gray-600`}>
                      {plan.region_id || '-'}
                    </td>
                    {/* Is Regional */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-center`}>
                      {plan.is_regional ? <span className="text-green-600">Yes</span> : <span className="text-gray-400">No</span>}
                    </td>
                    {/* Covered Countries Count */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-center text-gray-600`}>
                      {plan.covered_countries_count || 0}
                    </td>
                    {/* Data Display */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-gray-900`}>
                      {plan.data_display || '-'}
                    </td>
                    {/* Data Amount MB */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-right text-gray-600`}>
                      {plan.data_amount_mb || '-'}
                    </td>
                    {/* Is Unlimited */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-center`}>
                      {plan.is_unlimited ? <span className="text-green-600">Yes</span> : <span className="text-gray-400">No</span>}
                    </td>
                    {/* Validity Days */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-right text-gray-600`}>
                      {plan.validity_days}
                    </td>
                    {/* Has Voice */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-center`}>
                      {plan.has_voice ? <span className="text-teal-600">Yes</span> : <span className="text-gray-400">No</span>}
                    </td>
                    {/* Voice Minutes */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-right text-gray-600`}>
                      {plan.voice_minutes || '-'}
                    </td>
                    {/* Has SMS */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-center`}>
                      {plan.has_sms ? <span className="text-purple-600">Yes</span> : <span className="text-gray-400">No</span>}
                    </td>
                    {/* SMS Count */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-right text-gray-600`}>
                      {plan.sms_count || '-'}
                    </td>
                    {/* Price */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-right font-medium text-gray-900`}>
                      ${plan.price?.toFixed(2) || '0.00'}
                    </td>
                    {/* Net Price */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-right text-gray-600`}>
                      ${plan.net_price?.toFixed(2) || '0.00'}
                    </td>
                    {/* Currency */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-gray-600`}>
                      {plan.currency || 'USD'}
                    </td>
                    {/* Operator ID */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-xs text-gray-600`}>
                      {plan.operator_id || '-'}
                    </td>
                    {/* Operator Name */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap`}>
                      <div className="text-gray-900 max-w-[100px] truncate" title={plan.operator_name}>
                        {plan.operator_name || '-'}
                      </div>
                    </td>
                    {/* Operator Style */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-xs text-gray-600 max-w-[80px] truncate`} title={plan.operator_style}>
                      {plan.operator_style || '-'}
                    </td>
                    {/* Gradient Start */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap`}>
                      {plan.operator_gradient_start ? (
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded border" style={{ backgroundColor: plan.operator_gradient_start }} />
                          <span className="text-xs text-gray-600">{plan.operator_gradient_start}</span>
                        </div>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    {/* Gradient End */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap`}>
                      {plan.operator_gradient_end ? (
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded border" style={{ backgroundColor: plan.operator_gradient_end }} />
                          <span className="text-xs text-gray-600">{plan.operator_gradient_end}</span>
                        </div>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    {/* Activation Policy */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-xs text-gray-600 max-w-[100px] truncate`} title={plan.activation_policy}>
                      {plan.activation_policy || '-'}
                    </td>
                    {/* Fair Usage Policy */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-xs text-gray-600 max-w-[100px] truncate`} title={plan.fair_usage_policy}>
                      {plan.fair_usage_policy || '-'}
                    </td>
                    {/* Short Info */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-xs text-gray-600 max-w-[150px] truncate`} title={plan.short_info}>
                      {plan.short_info || '-'}
                    </td>
                    {/* APN Type */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-gray-600`}>
                      {plan.apn_type || '-'}
                    </td>
                    {/* APN Value */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-gray-600 max-w-[80px] truncate`} title={plan.apn_value}>
                      {plan.apn_value || '-'}
                    </td>
                    {/* Status */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap`}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        plan.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {plan.status}
                      </span>
                    </td>
                    {/* Enabled */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-center`}>
                      {plan.enabled ? <span className="text-green-600">Yes</span> : <span className="text-gray-400">No</span>}
                    </td>
                    {/* Provider */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-gray-600`}>
                      {plan.provider || '-'}
                    </td>
                    {/* Synced At */}
                    <td className={`${denseMode ? 'px-2 py-1' : 'px-3 py-2'} whitespace-nowrap text-xs text-gray-500`}>
                      {plan.synced_at ? new Date(plan.synced_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="37" className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No plans found</p>
                    <p className="text-sm">Adjust your filters or sync data from Airalo</p>
                  </div>
                </td>
              </tr>
            )}
            {/* Empty rows to prevent layout jump */}
            {emptyRows > 0 && (
              <tr style={{ height: (denseMode ? 33 : 53) * emptyRows }}>
                <td colSpan="37" />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default SupabaseTable;
