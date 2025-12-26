'use client';

import React from 'react';

const RegionStats = ({ countriesCount, planCount, order }) => {
  return (
    <div className="grid grid-cols-3 gap-4 mb-4">
      <div className="text-center">
        <div className="text-xl font-bold text-gray-900">
          {countriesCount}
        </div>
        <div className="text-xs text-gray-500">Countries</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-gray-900">
          {planCount}
        </div>
        <div className="text-xs text-gray-500">Plans</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-gray-900">
          {order}
        </div>
        <div className="text-xs text-gray-500">Order</div>
      </div>
    </div>
  );
};

export default RegionStats;
