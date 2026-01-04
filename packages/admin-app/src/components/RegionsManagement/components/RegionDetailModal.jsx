'use client';

import React from 'react';
import {
  X,
  Globe,
  Edit2,
  MapPin,
  DollarSign,
  Package,
  Phone,
  MessageSquare,
  Wifi,
  Calendar,
  Loader2,
  ExternalLink,
  Star
} from 'lucide-react';
import { getRegionTypeColor } from '../../../services/regionService';

const RegionDetailModal = ({
  isOpen,
  onClose,
  region,
  tariffs,
  loadingTariffs,
  onEdit,
  onToggleFeatured
}) => {
  if (!isOpen) return null;

  const popularCountries = region.countries?.filter(c => c.is_popular) || [];
  const otherCountries = region.countries?.filter(c => !c.is_popular) || [];

  // Count featured tariffs
  const featuredCount = tariffs.filter(t => t.is_featured).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with Image */}
        <div className="relative">
          {region.image_url ? (
            <div className="h-48 overflow-hidden">
              <img
                src={region.image_url}
                alt={region.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          ) : (
            <div className="h-48 bg-gradient-to-br from-blue-500 to-indigo-600" />
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Region info overlay */}
          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex items-end justify-between">
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRegionTypeColor(region.type)} mb-2`}>
                  {region.type}
                </span>
                <h2 className="text-2xl font-bold text-white">{region.name}</h2>
                {region.display_name && region.display_name !== region.name && (
                  <p className="text-white/80">{region.display_name}</p>
                )}
              </div>
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600">Countries</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {region.country_count || region.countries?.length || 0}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">Tariffs</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {region.tariff_count || region.plan_count || 0}
              </p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-gray-600">Popular</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {popularCountries.length}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-gray-600">Min Price</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {region.min_price ? `$${region.min_price.toFixed(2)}` : '-'}
              </p>
            </div>
          </div>

          {/* Region Tariffs */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Region Tariffs ({tariffs.length})
              <span className="text-sm font-normal text-gray-500 ml-2">
                ⭐ = Featured ({featuredCount}) - Click star to toggle
              </span>
            </h3>
            {loadingTariffs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading tariffs...</span>
              </div>
            ) : tariffs.length > 0 ? (
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Validity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Features</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tariffs.map((tariff) => (
                      <tr key={tariff.id} className={tariff.is_featured ? 'bg-amber-50' : ''}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onToggleFeatured?.(tariff.id, !tariff.is_featured)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title={tariff.is_featured ? 'Remove from featured' : 'Add to featured'}
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  tariff.is_featured
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-gray-300 hover:text-amber-400'
                                }`}
                              />
                            </button>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{tariff.name}</p>
                              <p className="text-xs text-gray-500">{tariff.operator_name || tariff.country_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm">
                            <Wifi className="w-4 h-4 text-gray-400" />
                            <span>
                              {tariff.is_unlimited
                                ? 'Unlimited'
                                : tariff.data_amount_mb >= 1024
                                  ? `${(tariff.data_amount_mb / 1024).toFixed(tariff.data_amount_mb % 1024 === 0 ? 0 : 1)} GB`
                                  : `${tariff.data_amount_mb} MB`}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{tariff.validity_days} days</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {tariff.has_voice && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded text-xs">
                                <Phone className="w-3 h-3" />
                              </span>
                            )}
                            {tariff.has_sms && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                                <MessageSquare className="w-3 h-3" />
                              </span>
                            )}
                            {!tariff.has_voice && !tariff.has_sms && (
                              <span className="text-xs text-gray-400">Data only</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-bold ${tariff.is_featured ? 'text-amber-600' : 'text-gray-900'}`}>
                            ${tariff.price?.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No tariffs found for this region</p>
              </div>
            )}
          </div>

          {/* Popular Countries */}
          {popularCountries.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Popular Countries ({popularCountries.length})
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {popularCountries.map((country) => (
                  <div
                    key={country.id}
                    className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    {country.image_url ? (
                      <img
                        src={country.image_url}
                        alt={country.name}
                        className="w-8 h-6 rounded object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-8 h-6 bg-gray-100 rounded flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{country.name}</p>
                      <p className="text-xs text-gray-500">{country.plan_count} plans</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Countries */}
          {otherCountries.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-500" />
                All Countries ({otherCountries.length})
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {otherCountries.slice(0, 20).map((country) => (
                  <div
                    key={country.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                  >
                    {country.image_url ? (
                      <img
                        src={country.image_url}
                        alt={country.name}
                        className="w-6 h-4 rounded object-cover"
                      />
                    ) : (
                      <span className="text-sm">{country.iso_code}</span>
                    )}
                    <span className="text-sm text-gray-700 truncate">{country.name}</span>
                  </div>
                ))}
                {otherCountries.length > 20 && (
                  <div className="flex items-center justify-center p-2 bg-gray-100 rounded-lg">
                    <span className="text-sm text-gray-500">+{otherCountries.length - 20} more</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state for countries */}
          {region.countries?.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No countries assigned to this region</p>
              <button
                onClick={onEdit}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Edit region to add countries
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{region.id}</code>
            <span className="mx-2">|</span>
            Status: <span className={region.is_active ? 'text-green-600' : 'text-gray-500'}>
              {region.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegionDetailModal;
