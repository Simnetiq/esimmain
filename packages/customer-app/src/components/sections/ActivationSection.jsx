'use client';

import { useEffect, useState, useRef } from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import Image from 'next/image';
import { appStoreLinks } from '@esim/shared/utils/appStoreLinks';
import Link from 'next/link';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import { Smartphone, Download, QrCode, Wifi } from 'lucide-react';

export default function ActivationSection() {
  const { t, isLoading: translationsLoading } = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);
  
  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);
  
  // Grid pattern style
  const gridPatternStyle = {
    backgroundSize: '10px 10px',
    backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
  };
  
  // Use hardcoded app store links
  const appStoreLinksData = {
    iosUrl: appStoreLinks.ios,
    androidUrl: appStoreLinks.android
  };
  const loading = false;

  // Track iOS download
  const handleIOSDownload = () => {
    trackCustomFacebookEvent('DownloadIOSApp', {
      platform: 'iOS',
      source: 'activation_section',
      content_type: 'app_download',
      button_location: 'activation_ios_button',
      event_category: 'engagement',
      timestamp: new Date().toISOString()
    });
  };

  // Track Android download
  const handleAndroidDownload = () => {
    trackCustomFacebookEvent('DownloadAndroidApp', {
      platform: 'Android',
      source: 'activation_section',
      content_type: 'app_download',
      button_location: 'activation_android_button',
      event_category: 'engagement',
      timestamp: new Date().toISOString()
    });
  };

  if (translationsLoading) {
    return (
      <div className="bg-white flex flex-col overflow-hidden">
        <div className="relative flex-1 flex flex-col">
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
              <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="h-10 w-96 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="w-full h-px bg-gray-100" />
          </div>
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl">
              <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-6 h-48 animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="bg-white flex flex-col overflow-hidden" id="how-it-works">
      <div className="relative flex-1 flex flex-col">
        {/* Grid Pattern - Left Side */}
        <div 
          className="hidden xl:block absolute left-0 top-0 bottom-0 w-32"
          style={gridPatternStyle}
        />

        {/* Grid Pattern - Right Side */}
        <div 
          className="hidden xl:block absolute right-0 top-0 bottom-0 w-32"
          style={gridPatternStyle}
        />

        {/* App Downloads Header */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className={`text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500 rtl:font-semibold rtl:tracking-tight transform transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {t('activation.downloads')}
              </p>
              <h2 className={`mt-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl transform transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {t('activation.appAvailable')}
              </h2>
            </div>
          </div>
          <div className="w-full h-px bg-gray-100" />
        </div>

        {/* App Download Section - Grid Layout */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="grid gap-4 md:grid-cols-2">
                
                {/* Phone Image Card */}
                <div className={`relative bg-gray-50 rounded-lg overflow-hidden transform transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                  <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
                    <Image
                      src="/images/logo_icon/phones.avif"
                      alt="Mobile App on iPhone and Android"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-black/5" />
                </div>

                {/* Download Cards Container */}
                <div className="flex flex-col gap-4">
                  {/* iOS Download Card */}
                  <div className={`group relative bg-gray-50 rounded-lg overflow-hidden hover:bg-white transition-all duration-500 transform ${isVisible ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-8'}`}>
                    <div className="p-5 lg:p-6">
                      {/* Icon */}
                      <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Smartphone className="w-5 h-5 text-tufts-blue" />
                      </div>
                      
                      {/* Content */}
                      <p className="text-gray-500 text-sm leading-relaxed mb-3">
                        {t('activation.appDescriptionIos')}
                      </p>
                      <h3 className="text-lg lg:text-xl font-semibold text-eerie-black mb-4">
                        {t('activation.downloadForIOS')}
                      </h3>
                      
                      {/* Button */}
                      {loading ? (
                        <div className="text-gray-600">{t('activation.loadingAppLinks')}</div>
                      ) : appStoreLinksData.iosUrl ? (
                        <a
                          href={appStoreLinksData.iosUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleIOSDownload}
                          className="btn-primary text-white shadow-sm inline-flex items-center w-full justify-center"
                        >
                          <Image 
                            src="/images/logo_icon/apple.svg" 
                            alt="iOS" 
                            width={20}
                            height={20}
                            className="w-5 h-5 mr-2"
                          />
                          <span className="text-base">{t('activation.downloadOnIOS', 'Download on iOS')}</span>
                        </a>
                      ) : (
                        <div className="text-gray-600">{t('activation.appLinksSoon')}</div>
                      )}
                    </div>
                    <div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-black/5" />
                  </div>

                  {/* Android Download Card */}
                  <div className={`group relative bg-gray-50 rounded-lg overflow-hidden hover:bg-white transition-all duration-500 transform ${isVisible ? 'opacity-100 translate-y-0 delay-400' : 'opacity-0 translate-y-8'}`}>
                    <div className="p-5 lg:p-6">
                      {/* Icon */}
                      <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Download className="w-5 h-5 text-tufts-blue" />
                      </div>
                      
                      {/* Content */}
                      <p className="text-gray-500 text-sm leading-relaxed mb-3">
                        {t('activation.appDescriptionAndroid')}
                      </p>
                      <h3 className="text-lg lg:text-xl font-semibold text-eerie-black mb-4">
                        {t('activation.downloadForAndroid')}
                      </h3>
                      
                      {/* Button */}
                      {loading ? (
                        <div className="text-gray-600">{t('activation.loadingAppLinks')}</div>
                      ) : appStoreLinksData.androidUrl ? (
                        <a
                          href={appStoreLinksData.androidUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleAndroidDownload}
                          className="btn-primary text-white shadow-sm inline-flex items-center w-full justify-center"
                        >
                          <Image 
                            src="/images/logo_icon/android.svg" 
                            alt="Android" 
                            width={18}
                            height={18}
                            className="w-4 h-4 mr-2"
                          />
                          <span className="text-base">{t('activation.downloadOnAndroid', 'Download on Android')}</span>
                        </a>
                      ) : (
                        <div className="text-gray-600">{t('activation.appLinksSoon')}</div>
                      )}
                    </div>
                    <div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-black/5" />
                  </div>
                </div>

              </div>
            </div>
          </div>
          <div className="w-full h-px bg-gray-100" />
        </div>

        {/* Affiliate Program Section */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className={`px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl transform transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-sm lg:text-base text-gray-600 leading-relaxed text-start rtl:text-right">
                  {t('activation.earnWithReferrals', 'Want to earn money? Join our affiliate program and get paid for every referral.')}{' '}
                  <Link 
                    href="/affiliate" 
                    className="text-tufts-blue hover:text-cobalt-blue font-semibold underline transition-colors"
                  >
                    {t('activation.learnMore', 'Learn more')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
          <div className="w-full h-px bg-gray-100" />
        </div>

        {/* Activation Process Header */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-16 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className={`text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500 rtl:font-semibold rtl:tracking-tight transform transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {t('activation.activationProcess')}
              </p>
              <h2 className={`mt-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl transform transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {t('activation.followSteps')}
              </h2>
            </div>
          </div>
          <div className="w-full h-px bg-gray-100" />
        </div>

        {/* Steps Section - Card Grid */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Step 1 */}
                <div className={`group relative bg-gray-50 rounded-lg overflow-hidden hover:bg-white transition-all duration-500 transform ${isVisible ? 'opacity-100 translate-y-0 delay-100' : 'opacity-0 translate-y-8'}`}>
                  <div className="p-5 lg:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-tufts-blue/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-tufts-blue">1</span>
                      </div>
                      <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Download className="w-5 h-5 text-tufts-blue" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-eerie-black mb-2">{t('activation.step1.title')}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      {t('activation.step1.description').split('\n').map((line, index) => (
                        <span key={index}>{line}{index < t('activation.step1.description').split('\n').length - 1 && <br />}</span>
                      ))}
                    </p>
                  </div>
                  <div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-black/5" />
                </div>

                {/* Step 2 */}
                <div className={`group relative bg-gray-50 rounded-lg overflow-hidden hover:bg-white transition-all duration-500 transform ${isVisible ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 translate-y-8'}`}>
                  <div className="p-5 lg:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-tufts-blue/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-tufts-blue">2</span>
                      </div>
                      <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <QrCode className="w-5 h-5 text-tufts-blue" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-eerie-black mb-2">{t('activation.step2.title')}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      {t('activation.step2.description').split('\n').map((line, index) => (
                        <span key={index}>{line}{index < t('activation.step2.description').split('\n').length - 1 && <br />}</span>
                      ))}
                    </p>
                  </div>
                  <div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-black/5" />
                </div>

                {/* Step 3 */}
                <div className={`group relative bg-gray-50 rounded-lg overflow-hidden hover:bg-white transition-all duration-500 transform ${isVisible ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-8'}`}>
                  <div className="p-5 lg:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-tufts-blue/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-tufts-blue">3</span>
                      </div>
                      <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Smartphone className="w-5 h-5 text-tufts-blue" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-eerie-black mb-2">{t('activation.step3.title')}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      {t('activation.step3.description').split('\n').map((line, index) => (
                        <span key={index}>{line}{index < t('activation.step3.description').split('\n').length - 1 && <br />}</span>
                      ))}
                    </p>
                  </div>
                  <div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-black/5" />
                </div>

                {/* Step 4 */}
                <div className={`group relative bg-gray-50 rounded-lg overflow-hidden hover:bg-white transition-all duration-500 transform ${isVisible ? 'opacity-100 translate-y-0 delay-400' : 'opacity-0 translate-y-8'}`}>
                  <div className="p-5 lg:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-tufts-blue/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-tufts-blue">4</span>
                      </div>
                      <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Wifi className="w-5 h-5 text-tufts-blue" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-eerie-black mb-2">{t('activation.step4.title')}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      {t('activation.step4.description').split('\n').map((line, index) => (
                        <span key={index}>{line}{index < t('activation.step4.description').split('\n').length - 1 && <br />}</span>
                      ))}
                    </p>
                  </div>
                  <div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-black/5" />
                </div>

              </div>

              {/* App Preview Image */}
              <div className={`mt-8 transform transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <div className="relative bg-gray-50 rounded-lg overflow-hidden">
                  <div className="p-6 flex justify-center">
                    <Image 
                      src="/images/frontend/example.avif" 
                      alt="eSIM Mobile App Interface" 
                      width={665}
                      height={437}
                      sizes="(max-width: 768px) 100vw, 665px"
                      className="w-full max-w-2xl h-auto rounded-lg"
                      loading="lazy"
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-black/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}