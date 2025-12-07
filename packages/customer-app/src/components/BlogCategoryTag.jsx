"use client";

import React from 'react';
import { getCategoryColor, translateCategory } from '@esim/shared/utils/blogUtils';

/**
 * Reusable Category Tag Component
 * Can be used in blog cards, blog post pages, and anywhere categories need to be displayed
 * 
 * @param {Object} props
 * @param {string} props.category - The category name
 * @param {string} props.language - The language code (en, es, fr, de, ar, he, ru)
 * @param {string} props.size - Size variant: 'sm', 'md', 'lg' (default: 'md')
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.absolute - Whether to position absolutely (for image overlays)
 * @param {boolean} props.isRTL - Whether the layout is RTL
 */
const BlogCategoryTag = ({ 
  category, 
  language = 'en', 
  size = 'md',
  className = '',
  absolute = false,
  isRTL = false
}) => {
  if (!category) return null;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs lg:text-sm',
    lg: 'px-4 py-2 text-sm lg:text-base'
  };

  const positionClass = absolute 
    ? `absolute top-0 ${isRTL ? 'left-0' : 'right-0'}` 
    : '';

  return (
    <div 
      className={`${getCategoryColor(category)} ${sizeClasses[size]} ${positionClass} font-medium ${className}`}
    >
      {translateCategory(category, language)}
    </div>
  );
};

export default BlogCategoryTag;

