import { NextResponse } from 'next/server';

export async function GET() {
  try {
    
    // Get Airalo credentials from Firestore
    const { db } = await import('@esim/shared/firebase/config');
    const { doc, getDoc } = await import('firebase/firestore');
    
    const airaloConfigRef = doc(db, 'config', 'airalo');
    const airaloConfig = await getDoc(airaloConfigRef);
    
    if (!airaloConfig.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Airalo configuration not found'
      }, { status: 400 });
    }
    
    const configData = airaloConfig.data();
    const clientId = configData.api_key;
    const clientSecret = process.env.AIRALO_CLIENT_SECRET_PRODUCTION;
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'Missing Airalo credentials'
      }, { status: 400 });
    }

    
    const baseUrl = 'https://partners-api.airalo.com';
    
    // Authenticate
    const authResponse = await fetch(`${baseUrl}/v2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      })
    });
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      return NextResponse.json({
        success: false,
        error: `Authentication failed: ${errorText}`,
        status: authResponse.status
      }, { status: 400 });
    }
    
    const authData = await authResponse.json();
    const accessToken = authData.data?.access_token;
    
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'No access token received'
      }, { status: 400 });
    }
    
    // Fetch packages
    const packagesResponse = await fetch(`${baseUrl}/v2/packages`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      }
    });
    
    if (!packagesResponse.ok) {
      const errorText = await packagesResponse.text();
      return NextResponse.json({
        success: false,
        error: `Failed to fetch packages: ${errorText}`,
        status: packagesResponse.status
      }, { status: 400 });
    }
    
    const packagesData = await packagesResponse.json();
    
    // Analyze the response
    const analysis = {
      responseKeys: Object.keys(packagesData),
      dataType: typeof packagesData.data,
      dataLength: packagesData.data?.length,
      totalPlans: 0,
      countriesFound: new Set(),
      sampleStructures: [],
      pagination: {
        links: packagesData.links || {},
        meta: packagesData.meta || {}
      }
    };
    
    if (packagesData.data && Array.isArray(packagesData.data)) {
      analysis.totalPlans = packagesData.data.length;
      
      // Get sample structures
      analysis.sampleStructures = packagesData.data.slice(0, 3).map(item => ({
        title: item.title,
        id: item.id,
        hasPackages: !!item.packages,
        hasCountries: !!item.countries,
        hasOperators: !!item.operators,
        countryCode: item.country_code,
        keys: Object.keys(item)
      }));
      
      // Count countries
      packagesData.data.forEach(plan => {
        // From plan.countries
        if (plan.countries && Array.isArray(plan.countries)) {
          plan.countries.forEach(country => {
            if (country.country_code) {
              analysis.countriesFound.add(country.country_code);
            }
          });
        }
        
        // From plan.operators
        if (plan.operators && Array.isArray(plan.operators)) {
          plan.operators.forEach(operator => {
            if (operator.countries && Array.isArray(operator.countries)) {
              operator.countries.forEach(country => {
                if (country.country_code) {
                  analysis.countriesFound.add(country.country_code);
                }
              });
            }
          });
        }
        
        // From individual country entries
        if (plan.country_code && plan.title && !plan.packages && !plan.countries) {
          analysis.countriesFound.add(plan.country_code);
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Direct Airalo API test completed',
      analysis: {
        ...analysis,
        countriesFound: Array.from(analysis.countriesFound).sort(),
        totalCountries: analysis.countriesFound.size
      },
      rawResponse: {
        responseKeys: Object.keys(packagesData),
        dataLength: packagesData.data?.length,
        pagination: {
          links: packagesData.links,
          meta: packagesData.meta
        },
        firstItem: packagesData.data?.[0] ? {
          title: packagesData.data[0].title,
          id: packagesData.data[0].id,
          keys: Object.keys(packagesData.data[0])
        } : null
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
