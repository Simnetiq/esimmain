'use client';

import React from 'react';
import { Globe, Zap, Shield, Users } from 'lucide-react';
import { useI18n } from '@esim/shared/contexts/I18nContext';

const About = () => {
  const { t } = useI18n?.() || {};
  const getText = (key, fallback) => (t ? t(key, fallback) : fallback);

  const values = [
    {
      icon: Globe,
      title: getText('about.value1Title', 'Global Connectivity'),
      desc: getText('about.value1Desc', 'Instant eSIMs for 190+ countries. Travel without borders, stay connected everywhere.')
    },
    {
      icon: Zap,
      title: getText('about.value2Title', 'Instant Activation'),
      desc: getText('about.value2Desc', 'Your eSIM is ready in seconds. No physical SIM, no waiting, no roaming fees.')
    },
    {
      icon: Shield,
      title: getText('about.value3Title', 'Secure & Reliable'),
      desc: getText('about.value3Desc', 'Enterprise-grade encryption and fraud protection for every transaction.')
    },
    {
      icon: Users,
      title: getText('about.value4Title', 'Built for Travelers'),
      desc: getText('about.value4Desc', 'Designed for digital nomads, frequent flyers, and everyone in between.')
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-tufts-blue to-blue-700 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            {getText('about.heroTitle', 'Connectivity freedom for everyone')}
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            {getText('about.heroSubtitle', 'Simnetiq provides instant eSIM plans so you can stay connected anywhere in the world — no contracts, no hassle.')}
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {getText('about.missionTitle', 'Our Mission')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {getText('about.missionDesc', "We believe connectivity is a fundamental right. Whether you're a traveler, expat, or digital nomad — you deserve fast, affordable internet without the friction of physical SIM cards or surprise roaming charges.")}
            </p>
          </div>

          {/* Values grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {values.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl border border-gray-100 hover:border-tufts-blue/30 hover:shadow-sm transition-all">
                <div className="flex-shrink-0 w-12 h-12 bg-tufts-blue/10 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-tufts-blue" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-gray-600 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {getText('about.ctaTitle', 'Ready to go global?')}
          </h2>
          <p className="text-gray-600 mb-8">
            {getText('about.ctaDesc', 'Get your eSIM in minutes. Works on any unlocked device.')}
          </p>
          <a
            href="/esim-plans"
            className="inline-flex items-center gap-2 px-8 py-3 bg-tufts-blue text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors"
          >
            {getText('about.ctaButton', 'Browse Plans')}
          </a>
        </div>
      </section>
    </div>
  );
};

export default About;
