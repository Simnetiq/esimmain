'use client';

import { useI18n } from '@esim/shared/contexts/I18nContext';
import Image from 'next/image';
import { appStoreLinks } from '@esim/shared/utils/appStoreLinks';
import Link from 'next/link';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';

export default function ActivationSection() {
  const { t, isLoading: translationsLoading } = useI18n();
  
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
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="animate-pulse space-y-12">
            <div className="text-center">
              <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white lg:min-h-screen flex flex-col" id="how-it-works">
      <div className="relative isolate flex-1 flex flex-col">
     
        
    

        {/* Grid Pattern - Left Side */}
        <div 
          className="hidden xl:block absolute left-0 top-0 bottom-0 w-32 "
          style={{
            backgroundSize: '10px 10px',
            backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
          }}
        ></div>

        {/* Grid Pattern - Right Side */}
        <div 
          className="hidden xl:block absolute right-0 top-0 bottom-0 w-32 "
          style={{
            backgroundSize: '10px 10px',
            backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
          }}
        ></div>

  {/* App Downloads Section */}
  <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-6">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className="text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500 rtl:font-semibold rtl:tracking-tight">
                {t('activation.downloads')}
              </p>
              <h2 className="mt-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl">
                {t('activation.appAvailable')}
              </h2>
              </div>
            </div>
          </div>
          <div className="w-full h-px bg-gray-100"></div>

        {/* App Download Section - Grid Layout */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="grid gap-4 lg:grid-cols-2 lg:grid-rows-2">
                
                {/* iOS Download - Top right, first on mobile */}
                <div className="relative max-lg:row-start-1 lg:col-start-2 lg:row-start-1">
                  <div className="absolute inset-px bg-white"></div>
                  <div className="relative flex h-full flex-col overflow-hidden">
                    <div className="px-4 py-4 flex flex-col justify-between h-full items-start rtl:items-end">
                      <div className="w-full">
                        <p className="mt-2 text-base sm:text-lg font-medium tracking-tight text-cool-black text-start rtl:text-right">
                          {t('activation.downloadForIOS')}
                        </p>
                        <p className="mt-2 text-sm lg:text-base font-light text-cool-black text-start rtl:text-right">
                          {t('activation.appDescriptionIos')}
                        </p>
                      </div>
                      
                      <div className="my-2 space-y-2 w-full">
                        {loading ? (
                          <div className="text-gray-600">{t('activation.loadingAppLinks')}</div>
                        ) : appStoreLinksData.iosUrl ? (
                          <>
                            <a
                              href={appStoreLinksData.iosUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={handleIOSDownload}
                              className="btn-primary text-white shadow-sm inline-flex items-center w-full justify-center"
                            >
                              <img 
                                src="/images/logo_icon/apple.svg" 
                                alt="iOS" 
                                width="20"
                                height="20"
                                className="w-5 h-5 mr-2"
                              />
                              <span className="text-base">{t('activation.downloadOnIOS', 'Download on iOS')}</span>
                            </a>
                            
                          </>
                        ) : (
                          <div className="text-gray-600">{t('activation.appLinksSoon')}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-px shadow-sm ring-1 ring-black/5"></div>
                </div>

                {/* Android Download - Bottom right, second on mobile */}
                <div className="relative max-lg:row-start-2 lg:col-start-2 lg:row-start-2">
                  <div className="absolute inset-px bg-white"></div>
                  <div className="relative flex h-full flex-col overflow-hidden">
                    <div className="px-4 py-4 flex flex-col justify-between h-full items-start rtl:items-end">
                      <div className="w-full">
                        <p className="mt-2 text-base sm:text-lg font-medium tracking-tight text-cool-black text-start rtl:text-right">
                          {t('activation.downloadForAndroid')}
                        </p>
                        <p className="mt-2 text-sm lg:text-base font-light text-cool-black text-start rtl:text-right">
                          {t('activation.appDescriptionAndroid')}
                        </p>
                      </div>
                      
                      <div className="my-2 space-y-2 w-full">
                        {loading ? (
                          <div className="text-gray-600">{t('activation.loadingAppLinks')}</div>
                        ) : appStoreLinksData.androidUrl ? (
                          <>
                            <a
                              href={appStoreLinksData.androidUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={handleAndroidDownload}
                              className="btn-primary text-white shadow-sm inline-flex items-center w-full justify-center"
                            >
                              <img 
                                src="/images/logo_icon/android.svg" 
                                alt="Android" 
                                width="18"
                                height="18"
                                className="w-4 h-4 mr-2"
                              />
                              <span className="text-base">{t('activation.downloadOnAndroid', 'Download on Android')}</span>
                            </a>
                            
                          </>
                        ) : (
                          <div className="text-gray-600">{t('activation.appLinksSoon')}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-px shadow-sm ring-1 ring-black/5"></div>
                </div>

                {/* Phone Image - Large left card, third on mobile */}
                <div className="relative max-lg:row-start-3 lg:row-span-2 lg:col-start-1 lg:row-start-1">
                  <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
                    <Image
                      src="/images/logo_icon/phones.avif"
                      alt="Mobile App on iPhone and Android"
                      width={560}
                      height={560}
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="w-full h-full object-contain"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                  <div className="relative flex h-full min-h-[20rem] sm:min-h-[26rem] lg:min-h-[30rem] flex-col justify-between p-6">
                    <div>
                      {/* Optional: Add overlay content if needed */}
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-px shadow-sm ring-1 ring-black/5"></div>
                </div>

              </div>
            </div>
          </div>
          {/* Full width gray line */}
          <div className="w-full h-px bg-gray-100"></div>
        </div>

        {/* Affiliate Program Section */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="bg-alice-blue rounded-lg p-6">
                <p className="text-sm lg:text-base text-cool-black leading-relaxed text-start rtl:text-right">
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
          {/* Full width gray line */}
          <div className="w-full h-px bg-gray-100"></div>
        </div>
        {/* Activation Process Header */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-6">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className="text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500 rtl:font-semibold rtl:tracking-tight">
                {t('activation.activationProcess')}
              </p>
              <h2 className="mt-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl">
                {t('activation.followSteps')}
              </h2>
            </div>
          </div>
          {/* Full width gray line */}
          <div className="w-full h-px bg-gray-100"></div>
        </div>

        {/* Steps Section */}
        <div className="mx-auto w-full max-w-9xl mb-12">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="bg-white">
                <div className="lg:flex lg:gap-x-20">
                  {/* Content Section */}
                  <div className="mx-auto max-w-md text-start lg:mx-0 lg:flex-auto lg:text-left">
                    {/* Step-by-step Instructions */}
                    <div className="mt-6 lg:mt-12 space-y-4 lg:space-y-8 flex flex-col justify-start">
                      {/* Step 1 */}
                      <div className="flex items-start rtl:space-x-reverse rtl:items-end flex flex-col justify-start">
                        <div className="flex-shrink-0">
                          
                        </div>
                        <div className="rtl:text-right">
                          <h3 className="text-base lg:text-base font-semibold text-eerie-black mb-2">{t('activation.step1.title')}</h3>
                          <p className="text-gray-600 text-sm lg:text-base">{t('activation.step1.description').split('\n').map((line, index) => (
                              <span key={index}>
                                {line}
                                {index < t('activation.step1.description').split('\n').length - 1 && <br />}
                              </span>
                            ))}</p>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex items-start rtl:space-x-reverse rtl:flex-row-reverse flex flex-col justify-start">
                        <div className="flex-shrink-0">
                         
                        </div>
                        <div className="rtl:text-right">
                          <h3 className="text-base lg:text-base font-semibold text-eerie-black mb-2">{t('activation.step2.title')}</h3>
                          <p className="text-gray-600 text-sm lg:text-base">
                            {t('activation.step2.description').split('\n').map((line, index) => (
                              <span key={index}>
                                {line}
                                {index < t('activation.step2.description').split('\n').length - 1 && <br />}
                              </span>
                            ))}
                          </p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex items-start rtl:space-x-reverse rtl:flex-row-reverse flex flex-col justify-start">
                        <div className="flex-shrink-0">
                         
                        </div>
                        <div className="rtl:text-right">
                          <h3 className="text-base lg:text-base font-semibold text-eerie-black mb-2">{t('activation.step3.title')}</h3>
                          <p className="text-gray-600 text-sm lg:text-base">{t('activation.step3.description').split('\n').map((line, index) => (
                              <span key={index}>
                                {line}
                                {index < t('activation.step3.description').split('\n').length - 1 && <br />}
                              </span>
                            ))}</p>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div className="flex items-start rtl:space-x-reverse rtl:flex-row-reverse flex flex-col justify-start">
                        <div className="flex-shrink-0">
                          
                        </div>
                        <div className="rtl:text-right">
                          <h3 className="text-base lg:text-base font-semibold text-eerie-black mb-2">{t('activation.step4.title')}</h3>
                          <p className="text-gray-600 text-sm lg:text-base">{t('activation.step4.description').split('\n').map((line, index) => (
                              <span key={index}>
                                {line}
                                {index < t('activation.step4.description').split('\n').length - 1 && <br />}
                              </span>
                            ))}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Image Section - Right Column */}
                  <div className="relative">
                    <div className="flex justify-center lg:justify-end">
                      <div className="max-w-md lg:max-w-3xl xl:max-w-3xl mt-12">
                        <Image 
                          src="/images/frontend/example.avif" 
                          alt="eSIM Mobile App Interface" 
                          width={665}
                          height={437}
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 665px"
                          className="w-full h-auto"
                          loading="lazy"
                          unoptimized
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}