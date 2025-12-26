'use client';

import React from 'react';
import { Globe, MapPin, Star, Flag } from 'lucide-react';

const RegionTypeBadge = ({ type }) => {
  switch (type) {
    case 'global':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Globe className="w-3 h-3" />
          Global
        </span>
      );
    case 'regional':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <MapPin className="w-3 h-3" />
          Regional
        </span>
      );
    case 'special':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <Star className="w-3 h-3" />
          Special
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Flag className="w-3 h-3" />
          Other
        </span>
      );
  }
};

export default RegionTypeBadge;
