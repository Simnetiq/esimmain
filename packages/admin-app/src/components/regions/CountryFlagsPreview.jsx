'use client';

import React from 'react';
import Image from 'next/image';

const CountryFlagsPreview = ({ countries, maxDisplay = 8 }) => {
  if (!countries || countries.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-1">
        {countries.slice(0, maxDisplay).map((country) => (
          <div
            key={country.code || country.id}
            className="w-8 h-6 rounded overflow-hidden border border-gray-200"
            title={country.name}
          >
            {country.image?.url ? (
              <Image
                src={country.image.url}
                alt={country.name}
                width={32}
                height={24}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs">
                {country.code}
              </div>
            )}
          </div>
        ))}
        {countries.length > maxDisplay && (
          <div className="w-8 h-6 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500 border border-gray-200">
            +{countries.length - maxDisplay}
          </div>
        )}
      </div>
    </div>
  );
};

export default CountryFlagsPreview;
