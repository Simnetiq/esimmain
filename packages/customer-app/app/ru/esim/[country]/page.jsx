'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

export default function CountryEsimPage() {
  const params = useParams();
  const router = useRouter();
  const countrySlug = params.country;
  const [country, setCountry] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCountry() {
      const supabase = getSupabase();
      if (!supabase) return;

      // Fetch country info
      const { data: countryData } = await supabase
        .from('countries')
        .select('*')
        .eq('slug', countrySlug)
        .eq('is_active', true)
        .single();

      if (!countryData) {
        router.push('/esim-plans');
        return;
      }
      setCountry(countryData);

      // Fetch plans for this country
      const { data: plansData } = await supabase
        .from('dataplans')
        .select('*')
        .eq('country_iso', countryData.iso_code)
        .eq('status', 'active')
        .eq('is_enabled', true)
        .order('price', { ascending: true });

      setPlans(plansData || []);
      setLoading(false);
    }
    loadCountry();
  }, [countrySlug, router]);

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4" style={{ borderColor: '#9039FF' }} />
      </div>
    );
  }

  if (!country) return null;

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
          <div className="flex items-center gap-4 mb-4">
            {country.image_url && (
              <div className="relative w-16 h-12 rounded-lg overflow-hidden shadow-lg">
                <Image
                  src={country.image_url}
                  alt={country.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                eSIM for {country.name}
              </h1>
              <p className="text-purple-200 mt-1">
                Stay connected with instant eSIM data plans
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-6 text-sm">
            <div className="bg-white/10 rounded-lg px-4 py-2">
              <span className="text-purple-200">Plans available</span>
              <span className="block font-semibold text-lg">{plans.length}</span>
            </div>
            {country.min_price && (
              <div className="bg-white/10 rounded-lg px-4 py-2">
                <span className="text-purple-200">Starting from</span>
                <span className="block font-semibold text-lg">${country.min_price} USD</span>
              </div>
            )}
            <div className="bg-white/10 rounded-lg px-4 py-2">
              <span className="text-purple-200">Activation</span>
              <span className="block font-semibold text-lg">Instant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Section */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {country.name} eSIM Data Plans
        </h2>

        {plans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No plans available for {country.name} at the moment.</p>
            <a href="/esim-plans" className="text-purple-600 hover:underline mt-2 inline-block">
              Browse all destinations →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="border rounded-xl p-5 hover:shadow-lg transition-shadow cursor-pointer bg-white"
              >
                <div className="flex items-center gap-3 mb-3">
                  {plan.operator_image_url && (
                    <div className="relative w-8 h-8 flex-shrink-0">
                      <Image
                        src={plan.operator_image_url}
                        alt={plan.operator_name || ''}
                        fill
                        className="rounded object-contain"
                        sizes="32px"
                      />
                    </div>
                  )}
                  <span className="text-sm text-gray-500">{plan.operator_name}</span>
                </div>

                <h3 className="font-semibold text-gray-900 mb-2">{plan.title || plan.name}</h3>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span>{plan.is_unlimited ? 'Unlimited' : `${(plan.data_amount_mb / 1024).toFixed(plan.data_amount_mb % 1024 === 0 ? 0 : 1)} GB`}</span>
                    <span className="mx-1">·</span>
                    <span>{plan.validity_days} days</span>
                  </div>
                  <div className="text-xl font-bold" style={{ color: '#9039FF' }}>
                    ${plan.price}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SEO content */}
        <div className="mt-12 prose prose-gray max-w-none">
          <h2>About eSIM for {country.name}</h2>
          <p>
            Get instant mobile data in {country.name} with a Simnetiq eSIM. No physical SIM card needed —
            just scan, activate, and connect. Our {country.name} eSIM plans work with all eSIM-compatible devices
            including iPhone, Samsung Galaxy, Google Pixel, and more.
          </p>
          <h3>Why choose Simnetiq for {country.name}?</h3>
          <ul>
            <li>Instant activation — no waiting, no shipping</li>
            <li>Plans starting from ${country.min_price || plans[0]?.price || '5'} USD</li>
            <li>No roaming charges or surprise fees</li>
            <li>Keep your main number active while using data abroad</li>
            <li>24/7 customer support</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
