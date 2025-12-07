"use client";

import React from 'react';
import { translateViews } from '@esim/shared/utils/blogUtils';

/**
 * Reusable View Count Component
 * Can be used in blog cards, blog post pages, and anywhere view counts need to be displayed
 * 
 * @param {Object} props
 * @param {number} props.views - The number of views
 * @param {string} props.language - The language code (en, es, fr, de, ar, he, ru)
 * @param {string} props.size - Size variant: 'sm', 'md', 'lg' (default: 'md')
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showIcon - Whether to show the eye icon (default: true)
 * @param {boolean} props.isRTL - Whether the layout is RTL
 */
const BlogViewCount = ({ 
  views = 0, 
  language = 'en', 
  size = 'md',
  className = '',
  showIcon = true,
  isRTL = false
}) => {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm lg:text-base',
    lg: 'text-base lg:text-lg'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'} ${sizeClasses[size]} ${className}`}>
      {showIcon && (
        <svg 
          className={`${iconSizes[size]} flex-shrink-0`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
          />
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
          />
        </svg>
      )}
      <span>{translateViews(views, language)}</span>
    </div>
  );
};

export default BlogViewCount;

