'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';

// Inline SVG icons to avoid lucide-react bundle overhead
const CookieIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/>
  </svg>
);

const XIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);

const SettingsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

// Translations object for cookie consent
const translations = {
  title: {
    en: 'We value your privacy',
    es: 'Valoramos tu privacidad',
    fr: 'Nous respectons votre vie privée',
    de: 'Wir schätzen Ihre Privatsphäre',
    ar: 'نحن نقدر خصوصيتك',
    he: 'אנו מעריכים את הפרטיות שלך',
    ru: 'Мы ценим вашу конфиденциальность'
  },
  description: {
    en: 'We use cookies to enhance your browsing experience, provide personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
    es: 'Usamos cookies para mejorar tu experiencia de navegación, proporcionar contenido personalizado y analizar nuestro tráfico. Al hacer clic en "Aceptar todo", consientes nuestro uso de cookies.',
    fr: 'Nous utilisons des cookies pour améliorer votre expérience de navigation, fournir un contenu personnalisé et analyser notre trafic. En cliquant sur "Tout accepter", vous consentez à notre utilisation des cookies.',
    de: 'Wir verwenden Cookies, um Ihr Surferlebnis zu verbessern, personalisierte Inhalte bereitzustellen und unseren Verkehr zu analysieren. Durch Klicken auf "Alle akzeptieren" stimmen Sie unserer Cookie-Nutzung zu.',
    ar: 'نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح الخاصة بك وتقديم محتوى مخصص وتحليل حركة المرور. بالنقر على "قبول الكل"، فإنك توافق على استخدامنا لملفات تعريف الارتباط.',
    he: 'אנו משתמשים בעוגיות כדי לשפר את חוויית הגלישה שלך, לספק תוכן מותאם אישית ולנתח את התנועה שלנו. בלחיצה על "קבל הכל", אתה מסכים לשימוש שלנו בעוגיות.',
    ru: 'Мы используем файлы cookie для улучшения вашего просмотра, предоставления персонализированного контента и анализа трафика. Нажимая "Принять все", вы соглашаетесь с использованием файлов cookie.'
  },
  acceptAll: {
    en: 'Accept All',
    es: 'Aceptar todo',
    fr: 'Tout accepter',
    de: 'Alle akzeptieren',
    ar: 'قبول الكل',
    he: 'קבל הכל',
    ru: 'Принять все'
  },
  rejectAll: {
    en: 'Reject All',
    es: 'Rechazar todo',
    fr: 'Tout refuser',
    de: 'Alle ablehnen',
    ar: 'رفض الكل',
    he: 'דחה הכל',
    ru: 'Отклонить все'
  },
  customize: {
    en: 'Customize',
    es: 'Personalizar',
    fr: 'Personnaliser',
    de: 'Anpassen',
    ar: 'تخصيص',
    he: 'התאמה אישית',
    ru: 'Настроить'
  },
  cookiePolicy: {
    en: 'Cookie Policy',
    es: 'Política de cookies',
    fr: 'Politique de cookies',
    de: 'Cookie-Richtlinie',
    ar: 'سياسة ملفات تعريف الارتباط',
    he: 'מדיניות עוגיות',
    ru: 'Политика cookies'
  },
  privacyPolicy: {
    en: 'Privacy Policy',
    es: 'Política de privacidad',
    fr: 'Politique de confidentialité',
    de: 'Datenschutzrichtlinie',
    ar: 'سياسة الخصوصية',
    he: 'מדיניות פרטיות',
    ru: 'Политика конфиденциальности'
  },
  essential: {
    en: 'Essential',
    es: 'Esenciales',
    fr: 'Essentiels',
    de: 'Erforderlich',
    ar: 'أساسية',
    he: 'חיוניות',
    ru: 'Обязательные'
  },
  analytics: {
    en: 'Analytics',
    es: 'Análisis',
    fr: 'Analytiques',
    de: 'Analyse',
    ar: 'التحليلات',
    he: 'אנליטיקה',
    ru: 'Аналитика'
  },
  marketing: {
    en: 'Marketing',
    es: 'Marketing',
    fr: 'Marketing',
    de: 'Marketing',
    ar: 'التسويق',
    he: 'שיווק',
    ru: 'Маркетинг'
  },
  functional: {
    en: 'Functional',
    es: 'Funcionales',
    fr: 'Fonctionnels',
    de: 'Funktional',
    ar: 'وظيفية',
    he: 'פונקציונליות',
    ru: 'Функциональные'
  },
  savePreferences: {
    en: 'Save Preferences',
    es: 'Guardar preferencias',
    fr: 'Enregistrer les préférences',
    de: 'Einstellungen speichern',
    ar: 'حفظ التفضيلات',
    he: 'שמור העדפות',
    ru: 'Сохранить настройки'
  },
  alwaysActive: {
    en: 'Always Active',
    es: 'Siempre activo',
    fr: 'Toujours actif',
    de: 'Immer aktiv',
    ar: 'نشط دائماً',
    he: 'פעיל תמיד',
    ru: 'Всегда активны'
  }
};

const CookieConsent = () => {
  const pathname = usePathname();
  const { locale } = useI18n();
  
  const detectedLanguage = locale || detectLanguageFromPath(pathname) || 'en';
  const isRTL = getLanguageDirection(detectedLanguage) === 'rtl';
  
  const [showBanner, setShowBanner] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    marketing: false,
    functional: false
  });

  // Translation helper
  const t = (key) => translations[key]?.[detectedLanguage] || translations[key]?.en || key;

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (consent) => {
    const consentData = {
      ...consent,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookieConsent', JSON.stringify(consentData));
    setShowBanner(false);
    setShowCustomize(false);
    
    // Dispatch event for analytics and tracking integrations
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', {
      detail: consentData
    }));
  };

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      functional: true
    });
  };

  const handleRejectAll = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      functional: false
    });
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  const togglePreference = (key) => {
    if (key === 'essential') return; // Can't disable essential cookies
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!showBanner) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-in-up"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-3xl">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Main Banner */}
          {!showCustomize ? (
            <div className="p-5 lg:p-6">
              {/* Header */}
              <div className={`flex items-start gap-3 mb-4 `}>
                <div className="w-10 h-10 bg-tufts-blue/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CookieIcon className="w-5 h-5 text-tufts-blue" />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold text-eerie-black mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('title')}
                  </h3>
                  <p className={`text-sm text-gray-600 leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('description')}
                  </p>
                </div>
                <button
                  onClick={() => setShowBanner(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100 flex-shrink-0"
                  aria-label="Close"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Links */}
              <div className={`flex flex-wrap gap-4 text-sm mb-5 `}>
                <Link 
                  href="/cookie-policy" 
                  className="text-tufts-blue hover:text-tufts-blue/80 underline-offset-2 hover:underline transition-colors"
                >
                  {t('cookiePolicy')}
                </Link>
                <Link 
                  href="/privacy-policy" 
                  className="text-tufts-blue hover:text-tufts-blue/80 underline-offset-2 hover:underline transition-colors"
                >
                  {t('privacyPolicy')}
                </Link>
              </div>

              {/* Action Buttons */}
              <div className={`flex flex-col sm:flex-row gap-3 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                <button
                  onClick={handleRejectAll}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  {t('rejectAll')}
                </button>
                <button
                  onClick={() => setShowCustomize(true)}
                  className={`px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-2 `}
                >
                  <SettingsIcon className="w-4 h-4" />
                  {t('customize')}
                </button>
                <button
                  onClick={handleAcceptAll}
                  className={`btn-primary px-5 py-2.5 text-sm inline-flex items-center justify-center gap-2 flex-1 sm:flex-none `}
                >
                  <CheckIcon className="w-4 h-4" />
                  {t('acceptAll')}
                </button>
              </div>
            </div>
          ) : (
            /* Customize Panel */
            <div className="p-5 lg:p-6">
              <div className={`flex items-center justify-between mb-5 `}>
                <h3 className="text-lg font-semibold text-eerie-black">
                  {t('customize')}
                </h3>
                <button
                  onClick={() => setShowCustomize(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Cookie Categories */}
              <div className="space-y-3 mb-5">
                {/* Essential */}
                <div className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg `}>
                  <span className="text-sm font-medium text-eerie-black">{t('essential')}</span>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                    {t('alwaysActive')}
                  </span>
                </div>

                {/* Analytics */}
                <div className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg `}>
                  <span className="text-sm font-medium text-eerie-black">{t('analytics')}</span>
                  <button
                    onClick={() => togglePreference('analytics')}
                    className={`w-11 h-6 rounded-full transition-colors ${
                      preferences.analytics ? 'bg-tufts-blue' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      preferences.analytics 
                        ? (isRTL ? '-translate-x-5' : 'translate-x-5') 
                        : (isRTL ? '-translate-x-0.5' : 'translate-x-0.5')
                    }`} />
                  </button>
                </div>

                {/* Functional */}
                <div className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg `}>
                  <span className="text-sm font-medium text-eerie-black">{t('functional')}</span>
                  <button
                    onClick={() => togglePreference('functional')}
                    className={`w-11 h-6 rounded-full transition-colors ${
                      preferences.functional ? 'bg-tufts-blue' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      preferences.functional 
                        ? (isRTL ? '-translate-x-5' : 'translate-x-5') 
                        : (isRTL ? '-translate-x-0.5' : 'translate-x-0.5')
                    }`} />
                  </button>
                </div>

                {/* Marketing */}
                <div className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg `}>
                  <span className="text-sm font-medium text-eerie-black">{t('marketing')}</span>
                  <button
                    onClick={() => togglePreference('marketing')}
                    className={`w-11 h-6 rounded-full transition-colors ${
                      preferences.marketing ? 'bg-tufts-blue' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      preferences.marketing 
                        ? (isRTL ? '-translate-x-5' : 'translate-x-5') 
                        : (isRTL ? '-translate-x-0.5' : 'translate-x-0.5')
                    }`} />
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSavePreferences}
                className={`btn-primary w-full py-2.5 text-sm inline-flex items-center justify-center gap-2 `}
              >
                <CheckIcon className="w-4 h-4" />
                {t('savePreferences')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
