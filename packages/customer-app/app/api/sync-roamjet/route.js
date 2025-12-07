import { NextResponse } from 'next/server';
import { db } from '@esim/shared/firebase/config';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';

export async function POST(request) {
  try {
    const { countries_only } = await request.json().catch(() => ({}));
    
    const roamjetBaseUrl = process.env.ROAMJET_BASE_URL || 'https://api.roamjet.net';
    
    let countriesSynced = 0;
    let plansSynced = 0;

    // 1. Sync Countries from RoamJet
    const countriesResponse = await fetch(`${roamjetBaseUrl}/api/public/countries`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!countriesResponse.ok) {
      throw new Error(`Failed to fetch countries: ${countriesResponse.statusText}`);
    }

    const countriesResult = await countriesResponse.json();
    
    if (!countriesResult.success || !countriesResult.data?.countries) {
      throw new Error('Invalid response from RoamJet countries API');
    }

    const countries = countriesResult.data.countries;

    // Save countries to Firebase
    const batch = writeBatch(db);
    let batchCount = 0;

    for (const country of countries) {
      if (!country.code) continue;

      const countryRef = doc(db, 'countries', country.code);
      const countryData = {
        name: country.name || '',
        code: country.code,
        flag: country.flag || '',
        flagEmoji: country.flagEmoji || '',
        region: country.region || '',
        continent: country.continent || '',
        lastSync: serverTimestamp(),
        syncSource: 'roamjet'
      };

      batch.set(countryRef, countryData, { merge: true });
      batchCount++;
      countriesSynced++;

      // Commit batch every 500 operations (Firestore limit)
      if (batchCount >= 500) {
        await batch.commit();
        batchCount = 0;
      }
    }

    // Commit remaining operations
    if (batchCount > 0) {
      await batch.commit();
    }


    // If only syncing countries, return now
    if (countries_only) {
      return NextResponse.json({
        success: true,
        total_synced: countriesSynced,
        details: {
          countries_synced: countriesSynced
        }
      });
    }

    // 2. Sync Plans from RoamJet
    const plansResponse = await fetch(`${roamjetBaseUrl}/api/public/plans`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!plansResponse.ok) {
      throw new Error(`Failed to fetch plans: ${plansResponse.statusText}`);
    }

    const plansResult = await plansResponse.json();
    
    if (!plansResult.success || !plansResult.data?.plans) {
      throw new Error('Invalid response from RoamJet plans API');
    }

    const plans = plansResult.data.plans;

    // Save plans to Firebase
    const plansBatch = writeBatch(db);
    let plansBatchCount = 0;

    for (const plan of plans) {
      if (!plan.id && !plan.slug) continue;

      const planId = plan.id || plan.slug;
      const planRef = doc(db, 'dataplans', planId);
      
      const planData = {
        slug: plan.slug || planId,
        name: plan.name || plan.title || '',
        title: plan.title || plan.name || '',
        price: parseFloat(plan.price) || 0,
        data: plan.data || plan.capacity || '',
        capacity: plan.capacity || plan.data || '',
        validity: plan.validity || plan.period || 0,
        validity_unit: plan.validity_unit || 'days',
        period: plan.period || plan.validity || 0,
        countries: plan.countries || plan.country_codes || [],
        country_codes: plan.country_codes || plan.countries || [],
        country_ids: plan.country_ids || [],
        operator: plan.operator || '',
        type: plan.type || 'data',
        is_unlimited: plan.is_unlimited || false,
        enabled: plan.enabled !== false,
        day: plan.day,
        amount: plan.amount,
        lastSync: serverTimestamp(),
        syncSource: 'roamjet'
      };

      plansBatch.set(planRef, planData, { merge: true });
      plansBatchCount++;
      plansSynced++;

      // Commit batch every 500 operations
      if (plansBatchCount >= 500) {
        await plansBatch.commit();
        plansBatchCount = 0;
      }
    }

    // Commit remaining operations
    if (plansBatchCount > 0) {
      await plansBatch.commit();
    }

    // 3. Update country plan counts and min prices
    const statsResponse = await fetch(`${roamjetBaseUrl}/api/public/plans`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (statsResponse.ok) {
      const statsResult = await statsResponse.json();
      const allPlans = statsResult.data?.plans || [];

      // Group plans by country
      const countryStats = {};
      for (const plan of allPlans) {
        const countryCodes = plan.country_codes || plan.countries || [];
        const price = parseFloat(plan.price) || 0;

        for (const countryCode of countryCodes) {
          if (!countryStats[countryCode]) {
            countryStats[countryCode] = {
              count: 0,
              prices: []
            };
          }
          countryStats[countryCode].count++;
          if (price > 0) {
            countryStats[countryCode].prices.push(price);
          }
        }
      }

      // Update each country with stats
      const statsBatch = writeBatch(db);
      let statsBatchCount = 0;

      for (const [countryCode, stats] of Object.entries(countryStats)) {
        const minPrice = stats.prices.length > 0 ? Math.min(...stats.prices) : 0;
        const countryRef = doc(db, 'countries', countryCode);
        
        statsBatch.update(countryRef, {
          planCount: stats.count,
          minPrice: minPrice,
          lastPriceSync: serverTimestamp()
        });
        
        statsBatchCount++;

        if (statsBatchCount >= 500) {
          await statsBatch.commit();
          statsBatchCount = 0;
        }
      }

      if (statsBatchCount > 0) {
        await statsBatch.commit();
      }

    }

    return NextResponse.json({
      success: true,
      total_synced: countriesSynced + plansSynced,
      details: {
        countries_synced: countriesSynced,
        plans_synced: plansSynced
      }
    });

  } catch {
    return NextResponse.json({
      success: false,
      error: 'Failed to sync from RoamJet'
    }, { status: 500 });
  }
}

