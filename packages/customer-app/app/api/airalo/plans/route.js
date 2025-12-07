export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@esim/shared/firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('country');
    const limit = parseInt(searchParams.get('limit')) || 50;

    let plansQuery = query(
      collection(db, 'dataplans'),
      where('status', '==', 'active'),
      orderBy('price', 'asc')
    );

    // If country filter is provided
    if (countryCode) {
      plansQuery = query(
        collection(db, 'dataplans'),
        where('status', '==', 'active'),
        where('country_codes', 'array-contains', countryCode.toUpperCase()),
        orderBy('price', 'asc')
      );
    }

    const plansSnapshot = await getDocs(plansQuery);
    const plans = [];

    plansSnapshot.forEach((doc) => {
      const planData = doc.data();
      plans.push({
        id: doc.id,
        ...planData
      });
    });

    // Limit results
    const limitedPlans = plans.slice(0, limit);


    return NextResponse.json({
      success: true,
      plans: limitedPlans,
      total: plans.length,
      message: 'Plans retrieved successfully'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
