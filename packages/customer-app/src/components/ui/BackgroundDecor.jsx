'use client';

import React from 'react';

/**
 * Shared decorative background used across key pages.
 * Renders gradient orbs for visual depth.
 * Grid pattern rails are now handled globally in layout.jsx.
 * Absolute positioned, pointer-events-none, no re-render flicker.
 */
const BackgroundDecor = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    {/* Gradient Orbs */}
    <div
      className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[100px] translate-x-1/4 translate-y-1/4"
      style={{ backgroundColor: 'rgba(83, 116, 205, 0.15)' }}
    />
    <div
      className="absolute top-1/2 right-1/3 w-[400px] h-[400px] rounded-full blur-[80px]"
      style={{ backgroundColor: 'rgba(83, 116, 205, 0.1)' }}
    />
  </div>
);

export default BackgroundDecor;
