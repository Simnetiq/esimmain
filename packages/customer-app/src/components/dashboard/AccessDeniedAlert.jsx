import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useI18n } from '@esim/shared/contexts/I18nContext';

const AccessDeniedAlert = ({ show }) => {
  const { t } = useI18n();
  
  if (!show) return null;

  return (
    <section className="bg-[var(--bg-primary)]">
      <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8 mb-8">
        <div className="relative">
          <div className="absolute inset-px rounded-xl bg-red-50"></div>
          <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
            <div className="px-8 pt-6 pb-6">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">{t('dashboard.accessDenied', 'Access Denied')}</h3>
                  <p className="text-sm text-red-700 mt-1">
                    {t('dashboard.accessDeniedMessage', "You don't have permission to access the admin panel. Only administrators can access this area.")}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-red-200"></div>
        </div>
      </div>
    </section>
  );
};

export default AccessDeniedAlert;
