'use client';

import React from 'react';
import {
  Smartphone,
  Trash2,
  Globe,
  MapPin,
  Flag,
  MessageSquare,
  Phone
} from 'lucide-react';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { getFlagEmoji, categorizePlan, planHasSms, planHasVoice } from '../utils/helpers';

/**
 * Standard table for Legacy/Airalo/Topups data
 */
const StandardTable = ({
  plans,
  dataSource,
  loading,
  editingPrices,
  pendingPriceChanges,
  onStartEditingPrice,
  onPriceChange,
  onSavePrice,
  onCancelPriceEdit,
  onDeletePlan,
  isRTL,
  t
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
              {t?.('plansManagement.plan', 'Plan') || 'Plan'}
            </th>
            <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
              Type
            </th>
            <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
              {t?.('plansManagement.dataDuration', 'Data & Duration') || 'Data & Duration'}
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              SMS / Voice
            </th>
            <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
              {t?.('plansManagement.countries', 'Countries') || 'Countries'}
            </th>
            <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
              {dataSource === 'airalo' ? 'Original / Discounted Price' : (t?.('plansManagement.price', 'Price') || 'Price')}
            </th>
            <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
              {t?.('plansManagement.actions', 'Actions') || 'Actions'}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {plans.length > 0 ? (
            plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-gray-50">
                {/* Plan Name & Operator */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    <div className={`${isRTL ? 'mr-4' : 'ml-4'}`}>
                      <div className={`text-sm font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {plan.name || plan.title || (t?.('plansManagement.unnamedPlan', 'Unnamed Plan') || 'Unnamed Plan')}
                      </div>
                      {(plan.operator || plan.brand) && (
                        <div className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                          {plan.operator || plan.brand}
                        </div>
                      )}
                      {dataSource === 'airalo' && (
                        <div className={`text-xs text-blue-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                          Airalo Plan
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Plan Type/Category */}
                <td className="px-4 py-4 whitespace-nowrap">
                  {(() => {
                    const category = categorizePlan(plan);
                    if (category === 'global') {
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Globe className="w-3 h-3" />
                          Global
                        </span>
                      );
                    } else if (category === 'regional') {
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <MapPin className="w-3 h-3" />
                          Regional
                        </span>
                      );
                    } else {
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <Flag className="w-3 h-3" />
                          Country
                        </span>
                      );
                    }
                  })()}
                </td>

                {/* Data & Duration */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {plan.data ? (
                      plan.data === 'Unlimited' || plan.is_unlimited
                        ? (t?.('plansManagement.unlimited', 'Unlimited') || 'Unlimited')
                        : plan.data
                    ) : (
                      t?.('plansManagement.unlimited', 'Unlimited') || 'Unlimited'
                    )}
                  </div>
                  <div className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {dataSource === 'airalo' ? (
                      plan.validity ? `${plan.validity} ${plan.validity_unit || 'days'}` : (t?.('plansManagement.notAvailable', 'N/A') || 'N/A')
                    ) : (
                      plan.period ? (t?.('plansManagement.days', '{{days}} days', { days: plan.period }) || `${plan.period} days`) : (t?.('plansManagement.notAvailable', 'N/A') || 'N/A')
                    )}
                  </div>
                </td>

                {/* SMS / Voice */}
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <div className="flex flex-col items-center gap-1">
                    {planHasSms(plan) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        <MessageSquare className="w-3 h-3" />
                        {plan.sms || plan.sms_count || 0}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                    {planHasVoice(plan) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                        <Phone className="w-3 h-3" />
                        {plan.voice || plan.calls || plan.voice_minutes || 0}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                </td>

                {/* Countries */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {dataSource === 'airalo' ? (
                      plan.country_code ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {getFlagEmoji(plan.country_code)} {plan.country_code}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          🌍 Global
                        </span>
                      )
                    ) : (
                      (plan.country_codes || plan.country_ids || []).length > 0 ? (
                        <>
                          {(plan.country_codes || plan.country_ids || []).slice(0, 3).map((code, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {getFlagEmoji(code)}
                            </span>
                          ))}
                          {(plan.country_codes || plan.country_ids || []).length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              +{(plan.country_codes || plan.country_ids || []).length - 3}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          🌍
                        </span>
                      )
                    )}
                  </div>
                </td>

                {/* Price */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {dataSource === 'airalo' ? (
                    <div className="text-sm font-medium text-gray-900">
                      {formatPrice(plan.price || 0)}
                      <span className="text-xs text-gray-500 ml-1">(wholesale)</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      {editingPrices[plan.id] ? (
                        <input
                          type="number"
                          value={pendingPriceChanges[plan.id] !== undefined ? pendingPriceChanges[plan.id] : (plan.price || 0)}
                          onChange={(e) => onPriceChange(plan.id, e.target.value)}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          step="0.01"
                          min="0"
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => onStartEditingPrice(plan.id)}
                          className="w-20 px-2 py-1 text-sm text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                        >
                          {formatPrice(plan.price || 0)}
                        </div>
                      )}
                      {editingPrices[plan.id] && (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => onSavePrice(plan.id)}
                            disabled={loading}
                            className="px-2 py-1 bg-gray-900 text-white text-xs rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
                          >
                            {t?.('plansManagement.save', 'Save') || 'Save'}
                          </button>
                          <button
                            onClick={() => onCancelPriceEdit(plan.id)}
                            disabled={loading}
                            className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                          >
                            {t?.('plansManagement.cancel', 'Cancel') || 'Cancel'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {dataSource === 'supabase' ? (
                    <button
                      onClick={() => onDeletePlan(plan.id, plan.name || 'Unnamed Plan')}
                      disabled={loading}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="text-xs text-gray-400 italic">
                      Read-only
                    </div>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="px-6 py-12 text-center">
                <div className="text-gray-500">
                  <Smartphone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">{t?.('plansManagement.noPlansFound', 'No plans found') || 'No plans found'}</p>
                  <p className="text-sm">{t?.('plansManagement.tryAdjusting', 'Try adjusting your search or filters') || 'Try adjusting your search or filters'}</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StandardTable;
