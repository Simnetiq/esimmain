'use client';

import React from 'react';
import { getISOCode } from '@esim/shared/utils/countryCodeMap';

/**
 * FlagIcon component using local SVG flags
 * Based on flag-icons library: https://github.com/lipis/flag-icons
 * 
 * Uses regular img tag for local SVGs (Next.js Image optimization has issues with local SVGs)
 * 
 * @param {string} countryCode - Country code (ISO or slug, e.g., "us", "united-states")
 * @param {string} size - Size variant: "sm", "md", "lg", "xl"
 * @param {boolean} squared - Use 1x1 aspect ratio (default: false, uses 4x3)
 * @param {string} className - Additional CSS classes
 */
const FlagIcon = ({ 
  countryCode, 
  size = 'md', 
  squared = false,
  className = '' 
}) => {
  if (!countryCode) {
    return null;
  }

  // Convert to proper ISO code (handles both slugs and ISO codes)
  const code = getISOCode(countryCode);
  
  // Determine flag path based on aspect ratio
  const aspectRatio = squared ? '1x1' : '4x3';
  const flagPath = `/flags/${aspectRatio}/${code}.svg`;
  
  // Size mappings for 4:3 aspect ratio flags
  const sizeMap = {
    'xs': 'w-4 h-3',      // 16px × 12px (4:3)
    'sm': 'w-6 h-5',      // 24px × 20px (4:3)
    'md': 'w-8 h-6',      // 32px × 24px (4:3)
    'lg': 'w-12 h-9',     // 48px × 36px (4:3)
    'xl': 'w-16 h-12',    // 64px × 48px (4:3)
    '2xl': 'w-24 h-18',   // 96px × 72px (4:3)
    '3xl': 'w-32 h-24',   // 128px × 96px (4:3)
  };
  
  // Size mappings for 1:1 aspect ratio flags
  const squaredSizeMap = {
    'xs': 'w-4 h-4',      // 16px × 16px
    'sm': 'w-6 h-6',      // 24px × 24px
    'md': 'w-8 h-8',      // 32px × 32px
    'lg': 'w-12 h-12',    // 48px × 48px
    'xl': 'w-16 h-16',    // 64px × 64px
    '2xl': 'w-24 h-24',   // 96px × 96px
    '3xl': 'w-32 h-32',   // 128px × 128px
  };
  
  const sizeClass = squared ? squaredSizeMap[size] : sizeMap[size];

  return (
    <span 
      className={`inline-flex items-center justify-center overflow-hidden rounded-sm ${sizeClass} ${className}`}
      title={countryCode.toUpperCase()}
    >
      {/* Using regular img tag for local SVGs - more reliable than Next.js Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flagPath}
        alt={`${countryCode.toUpperCase()} flag`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </span>
  );
};

export default FlagIcon;

