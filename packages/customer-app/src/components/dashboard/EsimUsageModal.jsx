import React from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { Wifi, Phone, MessageSquare, Clock, Signal, X, AlertCircle, CheckCircle } from 'lucide-react';

const EsimUsageModal = ({ esimUsage, onClose }) => {
  const { t } = useI18n();
  
  if (!esimUsage) return null;

  // Calculate usage percentages with safety checks - clamp between 0 and 100
  const getUsagePercentage = (used, total) => {
    if (!total || total === 0 || isNaN(used) || isNaN(total)) return 0;
    const percentage = Math.round((used / total) * 100);
    return Math.max(0, Math.min(100, percentage)); // Clamp between 0-100
  };

  // Safe number conversion - ensures non-negative values
  const safeNumber = (val) => {
    const num = Number(val);
    return isNaN(num) || num < 0 ? 0 : num;
  };

  const total = safeNumber(esimUsage.total);
  const remaining = safeNumber(esimUsage.remaining);
  // Clamp dataUsed to be non-negative (handles case where remaining > total due to API inconsistency)
  const dataUsed = Math.max(0, total - remaining);
  const dataPercentage = getUsagePercentage(dataUsed, total);
  
  const totalVoice = safeNumber(esimUsage.total_voice);
  const remainingVoice = safeNumber(esimUsage.remaining_voice);
  const voiceUsed = Math.max(0, totalVoice - remainingVoice);
  const voicePercentage = getUsagePercentage(voiceUsed, totalVoice);
  
  const totalText = safeNumber(esimUsage.total_text);
  const remainingText = safeNumber(esimUsage.remaining_text);
  const textUsed = Math.max(0, totalText - remainingText);
  const textPercentage = getUsagePercentage(textUsed, totalText);

  // Format data display - handles negative values by using absolute value
  const formatData = (mb) => {
    const absMb = Math.abs(mb);
    if (absMb >= 1024) {
      return `${(absMb / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(absMb)} MB`;
  };

  // Get status info
  const getStatusInfo = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return { 
          color: 'bg-emerald-500', 
          bgColor: 'bg-emerald-50', 
          borderColor: 'border-emerald-100',
          textColor: 'text-emerald-700',
          icon: CheckCircle,
          label: t('dashboard.status.active', 'Active') 
        };
      case 'EXPIRED':
      case 'RECYCLED':
        return { 
          color: 'bg-red-500', 
          bgColor: 'bg-red-50', 
          borderColor: 'border-red-100',
          textColor: 'text-red-700',
          icon: AlertCircle,
          label: t('dashboard.status.expired', 'Expired') 
        };
      case 'FINISHED':
        return { 
          color: 'bg-amber-500', 
          bgColor: 'bg-amber-50', 
          borderColor: 'border-amber-100',
          textColor: 'text-amber-700',
          icon: AlertCircle,
          label: t('dashboard.status.finished', 'Finished') 
        };
      case 'NOT_ACTIVE':
        return { 
          color: 'bg-gray-500', 
          bgColor: 'bg-gray-50', 
          borderColor: 'border-gray-100',
          textColor: 'text-gray-700',
          icon: Clock,
          label: t('dashboard.status.notActive', 'Not Active') 
        };
      default:
        return { 
          color: 'bg-gray-400', 
          bgColor: 'bg-gray-50', 
          borderColor: 'border-gray-100',
          textColor: 'text-gray-600',
          icon: Signal,
          label: status || t('dashboard.unknown', 'Unknown') 
        };
    }
  };

  const statusInfo = getStatusInfo(esimUsage.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-hidden bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-tufts-blue to-blue-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                <Wifi className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{t('dashboard.esimUsageAndStatus', 'eSIM Usage & Status')}</h3>
                <p className="text-xs text-blue-100">{t('dashboard.realTimeUsage', 'Real-time usage data')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-5 space-y-4">
          {/* Status Badge */}
          <div className={`flex items-center justify-between p-4 rounded-lg border ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
            <div className="flex items-center gap-3">
              <StatusIcon className={`w-5 h-5 ${statusInfo.textColor}`} />
              <div>
                <p className="text-sm text-gray-500">{t('dashboard.status', 'Status')}</p>
                <p className={`font-semibold ${statusInfo.textColor}`}>{statusInfo.label}</p>
              </div>
            </div>
            {esimUsage.expired_at && (
              <div className="text-right">
                <p className="text-sm text-gray-500">{t('dashboard.expiresAt', 'Expires')}</p>
                <p className="text-sm font-medium text-gray-700">{new Date(esimUsage.expired_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {/* Data Usage */}
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-tufts-blue/10 rounded-lg flex items-center justify-center">
                  <Wifi className="w-4 h-4 text-tufts-blue" />
                </div>
                <span className="font-medium text-gray-900">{t('dashboard.dataUsage', 'Data Usage')}</span>
              </div>
              {esimUsage.is_unlimited ? (
                <span className="text-sm font-semibold text-tufts-blue">{t('dashboard.unlimited', 'Unlimited')}</span>
              ) : (
                <span className="text-sm font-semibold text-gray-900">
                  {formatData(remaining)} / {formatData(total)}
                </span>
              )}
            </div>
            
            {!esimUsage.is_unlimited && total > 0 && (
              <>
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-tufts-blue to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${100 - dataPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>{formatData(dataUsed)} {t('dashboard.used', 'used')}</span>
                  <span>{dataPercentage}%</span>
                </div>
              </>
            )}
          </div>

          {/* Voice Usage */}
          {totalVoice > 0 && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="font-medium text-gray-900">{t('dashboard.voiceUsage', 'Voice Usage')}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {remainingVoice} / {totalVoice} {t('dashboard.min', 'min')}
                </span>
              </div>
              
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${100 - voicePercentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{voiceUsed} {t('dashboard.min', 'min')} {t('dashboard.used', 'used')}</span>
                <span>{voicePercentage}%</span>
              </div>
            </div>
          )}

          {/* SMS Usage */}
          {totalText > 0 && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="font-medium text-gray-900">{t('dashboard.textUsage', 'SMS Usage')}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {remainingText} / {totalText} SMS
                </span>
              </div>
              
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                  style={{ width: `${100 - textPercentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{textUsed} SMS {t('dashboard.used', 'used')}</span>
                <span>{textPercentage}%</span>
              </div>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EsimUsageModal;
