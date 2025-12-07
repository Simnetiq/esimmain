'use client';

import React, { Suspense } from 'react';
import EsimPlans from '../../src/components/EsimPlans';

export default function EsimPlansPage() {
  return (
    <>
      <div className="bg-white min-h-screen flex flex-col" dir="ltr">
        <div className="relative isolate flex-1 flex flex-col">
          {/* Horizontal Line - Top */}
          <div className="hidden sm:block absolute top-0 left-0 right-0 h-px bg-gray-200"></div>
          
          {/* Horizontal Line - Bottom */}
          <div className="hidden sm:block absolute bottom-0 left-0 right-0 h-px bg-gray-200"></div>

          {/* Grid Pattern - Left Side */}
          <div 
            className="hidden xl:block absolute left-0 top-0 bottom-0 w-32 "
            style={{
              backgroundSize: '10px 10px',
              backgroundAttachment: 'fixed',
              backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
            }}
          ></div>

          {/* Grid Pattern - Right Side */}
          <div 
            className="hidden xl:block absolute right-0 top-0 bottom-0 w-32 "
            style={{
              backgroundSize: '10px 10px',
              backgroundAttachment: 'fixed',
              backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
            }}
          ></div>

          {/* Plans Component */}
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl">
              <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                <Suspense fallback={
                  <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 mx-auto" style={{ borderColor: '#9039FF' }}></div>
                    <p className="mt-4 text-eerie-black">Loading plans...</p>
                  </div>
                }>
                  <EsimPlans />
                </Suspense>
              </div>
            </div>
          </div>

         
        </div>
      </div>
    </>
  );
}
