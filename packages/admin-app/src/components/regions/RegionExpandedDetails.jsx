'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const RegionExpandedDetails = ({ isExpanded, region, countries }) => {
  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 pt-4 border-t border-gray-200"
        >
          <div className="space-y-4">
            {/* Countries List */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Countries ({countries.length})
              </h4>
              {countries.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {countries.map((country) => (
                    <div
                      key={country.code || country.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="w-6 h-4 rounded overflow-hidden border border-gray-200 flex-shrink-0">
                        {country.image?.url ? (
                          <Image
                            src={country.image.url}
                            alt={country.name}
                            width={24}
                            height={16}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200"></div>
                        )}
                      </div>
                      <span className="text-xs text-gray-700 truncate">
                        {country.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  No countries assigned to this region
                </p>
              )}
            </div>

            {/* Translations */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Translations</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(region.translations || {}).map(([lang, translation]) => (
                  <div key={lang} className="flex justify-between">
                    <span className="text-gray-500 uppercase">{lang}:</span>
                    <span className="text-gray-900">{translation || '-'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-gray-700">Color:</h4>
              <div
                className="w-6 h-6 rounded border border-gray-200"
                style={{ backgroundColor: region.color }}
              />
              <span className="text-xs text-gray-500">{region.color}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RegionExpandedDetails;
