'use client';

import React from 'react';

// Grid pattern style shared across Login, HeroSection, and content pages
const gridPatternStyle = {
  backgroundSize: '10px 10px',
  backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
};

/**
 * Shared decorative background used across key pages.
 * Renders gradient orbs and optional grid side-rails.
 * Absolute positioned, pointer-events-none, no re-render flicker.
 */
const BackgroundDecor = ({ showGrid = true }) => (
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

    {/* Grid Pattern Rails */}
    {showGrid && (
      <>
        <div
          className="hidden xl:block absolute left-0 top-0 bottom-0 w-32"
          style={gridPatternStyle}
        />
        <div
          className="hidden xl:block absolute right-0 top-0 bottom-0 w-32"
          style={gridPatternStyle}
        />
      </>
    )}
  </div>
);

export default BackgroundDecor;
