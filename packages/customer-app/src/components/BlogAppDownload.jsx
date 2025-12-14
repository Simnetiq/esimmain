"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { appStoreLinks } from '@esim/shared/utils/appStoreLinks';
import { trackAppDownloadClick } from '@esim/shared/utils/trackingPixels';
import { subscribeToNewsletter } from '@esim/shared/services/newsletterService';

/**
 * Blog App Download & Newsletter CTA Component
 * Features two beautiful cards:
 * 1. App download CTA with background image
 * 2. Newsletter signup that saves to Firebase
 */

// Translations
const translations = {
  // App Download Section
  appTitle: {
    en: 'Stay connected wherever you travel',
    es: 'Mantente conectado dondequiera que viajes',
    fr: 'Restez connecté où que vous voyagiez',
    de: 'Bleiben Sie verbunden, wohin Sie auch reisen',
    ar: 'ابق على اتصال أينما سافرت',
    he: 'הישאר מחובר לאן שתיסע',
    ru: 'Оставайтесь на связи, куда бы вы ни путешествовали'
  },
  appDescription: {
    en: 'Get instant eSIM data plans for 200+ countries. No physical SIM needed, activate in minutes.',
    es: 'Obtén planes de datos eSIM instantáneos para más de 200 países. Sin SIM física, activa en minutos.',
    fr: 'Obtenez des forfaits eSIM instantanés pour plus de 200 pays. Pas de SIM physique, activation en minutes.',
    de: 'Erhalten Sie sofortige eSIM-Datentarife für über 200 Länder. Keine physische SIM erforderlich, Aktivierung in Minuten.',
    ar: 'احصل على خطط بيانات eSIM فورية لأكثر من 200 دولة. لا حاجة لشريحة SIM فعلية، قم بالتفعيل في دقائق.',
    he: 'קבל תוכניות נתונים eSIM מיידיות ליותר מ-200 מדינות. לא צריך SIM פיזי, הפעלה בדקות.',
    ru: 'Получите мгновенные тарифы eSIM для 200+ стран. Физическая SIM не нужна, активация за минуты.'
  },
  getApp: {
    en: 'App Store',
    es: 'App Store',
    fr: 'Télécharger l\'app iOS',
    de: 'App Store',
    ar: 'App Store',
    he: 'App Store',
    ru: 'App Store'
  },
  getAndroidApp: {
    en: 'Google Play',
    es: 'Google Play',
    fr: 'Google Play',
    de: 'Google Play',
    ar: 'Google Play',
    he: 'Google Play',
    ru: 'Google Play'
  },
  // Newsletter Section
  newsletterTitle: {
    en: 'Get travel tips & exclusive deals',
    es: 'Obtén consejos de viaje y ofertas exclusivas',
    fr: 'Recevez des conseils de voyage et offres exclusives',
    de: 'Erhalten Sie Reisetipps und exklusive Angebote',
    ar: 'احصل على نصائح السفر والعروض الحصرية',
    he: 'קבל טיפים לטיולים והצעות בלעדיות',
    ru: 'Получайте советы путешественникам и эксклюзивные предложения'
  },
  newsletterDescription: {
    en: 'Subscribe to our newsletter for the latest eSIM news, travel guides, and special offers.',
    es: 'Suscríbete a nuestro boletín para las últimas noticias de eSIM, guías de viaje y ofertas especiales.',
    fr: 'Abonnez-vous à notre newsletter pour les dernières nouvelles eSIM, guides de voyage et offres spéciales.',
    de: 'Abonnieren Sie unseren Newsletter für die neuesten eSIM-Nachrichten, Reiseführer und Sonderangebote.',
    ar: 'اشترك في نشرتنا الإخبارية للحصول على أحدث أخبار eSIM وأدلة السفر والعروض الخاصة.',
    he: 'הירשם לניוזלטר שלנו לחדשות eSIM העדכניות, מדריכי נסיעות והצעות מיוחדות.',
    ru: 'Подпишитесь на нашу рассылку для получения последних новостей eSIM, путеводителей и специальных предложений.'
  },
  emailPlaceholder: {
    en: 'Enter your email',
    es: 'Ingresa tu email',
    fr: 'Entrez votre email',
    de: 'E-Mail eingeben',
    ar: 'أدخل بريدك الإلكتروني',
    he: 'הכנס את האימייל שלך',
    ru: 'Введите ваш email'
  },
  subscribe: {
    en: 'Subscribe',
    es: 'Suscribirse',
    fr: "S'abonner",
    de: 'Abonnieren',
    ar: 'اشترك',
    he: 'הירשם',
    ru: 'Подписаться'
  },
  subscribing: {
    en: 'Subscribing...',
    es: 'Suscribiendo...',
    fr: 'Inscription...',
    de: 'Abonnieren...',
    ar: 'جارٍ الاشتراك...',
    he: 'נרשם...',
    ru: 'Подписка...'
  },
  successMessage: {
    en: 'Thanks for subscribing! 🎉',
    es: '¡Gracias por suscribirte! 🎉',
    fr: 'Merci pour votre inscription ! 🎉',
    de: 'Danke für Ihre Anmeldung! 🎉',
    ar: 'شكراً لاشتراكك! 🎉',
    he: 'תודה שנרשמת! 🎉',
    ru: 'Спасибо за подписку! 🎉'
  },
  alreadySubscribed: {
    en: 'You\'re already subscribed!',
    es: '¡Ya estás suscrito!',
    fr: 'Vous êtes déjà inscrit !',
    de: 'Sie sind bereits angemeldet!',
    ar: 'أنت مشترك بالفعل!',
    he: 'אתה כבר רשום!',
    ru: 'Вы уже подписаны!'
  },
  errorMessage: {
    en: 'Something went wrong. Please try again.',
    es: 'Algo salió mal. Por favor intenta de nuevo.',
    fr: 'Une erreur est survenue. Veuillez réessayer.',
    de: 'Etwas ist schief gelaufen. Bitte versuchen Sie es erneut.',
    ar: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    he: 'משהו השתבש. אנא נסה שוב.',
    ru: 'Что-то пошло не так. Пожалуйста, попробуйте снова.'
  }
};

const BlogAppDownload = ({ 
  language = 'en', 
  isRTL = false, 
  className = '', 
  location = 'unknown',
  context = {}
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'already_subscribed', 'error'

  const t = (key) => translations[key]?.[language] || translations[key]?.en || key;

  const handleDownloadClick = (platform) => {
    trackAppDownloadClick(platform, location, context);
  };

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) return;
    
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const result = await subscribeToNewsletter({
        email: email.trim().toLowerCase(),
        source: 'blog',
        tags: ['blog_subscriber']
      });

      if (result.success) {
        setSubmitStatus('success');
        setEmail('');
      } else if (result.message === 'Email already subscribed') {
        setSubmitStatus('already_subscribed');
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`mt-16 space-y-6 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* App Download CTA Section */}
      <div className="relative isolate overflow-hidden">
        {/* Blurry gradient background from #5374CD to white */}
        <div className="absolute inset-0 -z-10">
          {/* Base gradient */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #5374CD 0%, #7B93DB 30%, #A8B8E8 50%, #D4DCF4 70%, #F0F3FA 85%, #FFFFFF 100%)'
            }}
          />
          {/* Blur overlay for softer effect */}
          <div 
            className="absolute inset-0 backdrop-blur-3xl"
            style={{
              background: 'radial-gradient(ellipse at 30% 20%, rgba(83, 116, 205, 0.4) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(255, 255, 255, 0.8) 0%, transparent 50%)'
            }}
          />
          {/* Optional: Background image overlay */}
          <Image
            src="/images/blog-cta-bg.jpg"
            alt=""
            fill
            className="object-cover opacity-10 mix-blend-overlay"
            sizes="100vw"
            priority={false}
          />
            </div>

        <div className="px-6 py-16 md:px-12 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-balance text-gray-900 md:text-3xl lg:text-4xl">
              {t('appTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base font-normal text-pretty text-gray-700 md:text-lg">
              {t('appDescription')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {/* iOS Download */}
              <a
                href={appStoreLinks.ios}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleDownloadClick('iOS')}
                className="group inline-flex items-center gap-3 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:bg-gray-800 hover:scale-105"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <span className="text-base">{t('getApp')}</span>
              </a>

              {/* Android Download */}
              <a
                href={appStoreLinks.android}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleDownloadClick('Android')}
                className="group inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-gray-900 ring-1 ring-gray-200 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:scale-105"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4483-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993.0001.5511-.4482.9997-.9993.9997zm-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993 0 .5511-.4483.9997-.9993.9997zm11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396z"/>
                </svg>
                <span className="text-base">{t('getAndroidApp')}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter Signup Section */}
      <div className="bg-gray-50/80">
        <div className="flex min-h-40 flex-col flex-wrap items-start justify-center gap-6 px-6 py-10 md:px-10 lg:flex-row lg:items-center">
          {/* Text Content */}
          <div className="max-w-md shrink grow">
            <h3 className={`text-lg font-semibold tracking-tight text-balance text-gray-900 md:text-xl ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('newsletterTitle')}
            </h3>
            <p className={`mt-1 text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('newsletterDescription')}
            </p>
          </div>

          {/* Email Form */}
          <div className="w-full max-w-md grow-0 lg:w-auto">
            {submitStatus === 'success' ? (
              <div className="flex h-14 items-center justify-center rounded-xl bg-green-50 px-6 text-green-700 font-medium">
                {t('successMessage')}
              </div>
            ) : submitStatus === 'already_subscribed' ? (
              <div className="flex h-14 items-center justify-center rounded-xl bg-blue-50 px-6 text-blue-700 font-medium">
                {t('alreadySubscribed')}
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="relative flex w-full">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  required
                  disabled={isSubmitting}
                  className={`h-14 w-full rounded-xl bg-white px-4 text-gray-900 shadow-sm ring-1 ring-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${isRTL ? 'pl-28 pr-4 text-right' : 'pr-28 pl-4 text-left'}`}
                  style={{ direction: isRTL ? 'rtl' : 'ltr' }}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className={`absolute top-1/2 h-10 -translate-y-1/2 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition-all duration-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 ${isRTL ? 'left-2' : 'right-2'}`}
                >
                  {isSubmitting ? t('subscribing') : t('subscribe')}
                </button>
              </form>
            )}
            
            {submitStatus === 'error' && (
              <p className="mt-2 text-sm text-red-600">
                {t('errorMessage')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogAppDownload;
