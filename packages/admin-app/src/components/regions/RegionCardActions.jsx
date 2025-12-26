'use client';

import React from 'react';
import { Edit2, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, Settings } from 'lucide-react';

const RegionCardActions = ({
  region,
  togglingVisibility,
  onToggleVisibility,
  onEdit,
  onDelete
}) => {
  return (
    <div className="flex items-center gap-0.5">
      {/* Visibility Toggle */}
      <button
        onClick={() => onToggleVisibility(region.id, region.isHidden)}
        disabled={togglingVisibility === region.id}
        className={`p-2 rounded-lg transition-all duration-200 ${
          region.isHidden
            ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        } disabled:opacity-50`}
        title={region.isHidden ? 'Show region' : 'Hide region'}
      >
        {togglingVisibility === region.id ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : region.isHidden ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>

      {/* Edit Button */}
      <button
        onClick={() => onEdit(region)}
        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
        title="Edit region"
      >
        <Edit2 className="w-4 h-4" />
      </button>

      {/* Delete Button */}
      <button
        onClick={() => onDelete(region.id)}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
        title="Delete region"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export const RegionCardFooterActions = ({ region, isExpanded, onEdit, onToggleExpand }) => {
  return (
    <div className="flex gap-2 mt-4">
      {/* Edit Button - Primary */}
      <button
        onClick={() => onEdit(region)}
        className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow"
      >
        <Settings className="w-4 h-4" />
        Manage
      </button>

      {/* Details Toggle - Secondary */}
      <button
        onClick={onToggleExpand}
        className={`px-4 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all duration-200 ${
          isExpanded
            ? 'bg-gray-200 text-gray-800'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
        }`}
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Hide
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Details
          </>
        )}
      </button>
    </div>
  );
};

export default RegionCardActions;
