'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import RegionTypeBadge from './RegionTypeBadge';
import RegionStats from './RegionStats';
import CountryFlagsPreview from './CountryFlagsPreview';
import RegionCardActions, { RegionCardFooterActions } from './RegionCardActions';
import RegionExpandedDetails from './RegionExpandedDetails';

const RegionCard = ({
  region,
  countries,
  planCount,
  isExpanded,
  togglingVisibility,
  onToggleVisibility,
  onEdit,
  onDelete,
  onToggleExpand
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${
        region.isHidden
          ? 'border-amber-300 bg-amber-50/30'
          : 'border-gray-200'
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Region Image or Icon */}
            <div className="flex-shrink-0">
              <div
                className="w-14 h-14 rounded-lg border-2 border-gray-200 overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: region.color || '#f3f4f6' }}
              >
                {region.imageUrl && typeof region.imageUrl === 'string' && region.imageUrl.trim().length > 0 ? (
                  <Image
                    src={region.imageUrl}
                    alt={region.name}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-3xl">{region.icon}</span>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900">
                  {region.name}
                </h3>
                {region.isHidden && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                    HIDDEN
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{region.id}</p>
            </div>
          </div>

          <RegionCardActions
            region={region}
            isExpanded={isExpanded}
            togglingVisibility={togglingVisibility}
            onToggleVisibility={onToggleVisibility}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleExpand={onToggleExpand}
          />
        </div>

        {/* Type Badge */}
        <div className="mb-4">
          <RegionTypeBadge type={region.type} />
        </div>

        {/* Stats */}
        <RegionStats
          countriesCount={region.popularCountries?.length || 0}
          planCount={planCount}
          order={region.order}
        />

        {/* Country Flags Preview */}
        <CountryFlagsPreview countries={countries} maxDisplay={8} />

        {/* Footer Actions */}
        <RegionCardFooterActions
          region={region}
          isExpanded={isExpanded}
          onEdit={onEdit}
          onToggleExpand={onToggleExpand}
        />

        {/* Expanded Details */}
        <RegionExpandedDetails
          isExpanded={isExpanded}
          region={region}
          countries={countries}
        />
      </div>
    </motion.div>
  );
};

export default RegionCard;
