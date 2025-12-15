import { parsePrice } from '@esim/shared/utils/priceUtils';

// Pre-coded countries for each region (8 per region for 2x4 grid)
export const REGION_COUNTRIES = {
  europe: ['spain', 'france', 'united-kingdom', 'italy', 'germany', 'netherlands', 'portugal', 'greece'],
  asia: ['japan', 'thailand', 'south-korea', 'singapore', 'vietnam', 'malaysia', 'indonesia', 'philippines'],
  americas: ['united-states', 'canada', 'mexico', 'brazil', 'argentina', 'colombia', 'chile', 'peru'],
  africa: ['south-africa', 'egypt', 'morocco', 'kenya', 'nigeria', 'ghana', 'tanzania', 'tunisia'],
  oceania: ['australia', 'new-zealand', 'fiji', 'indonesia', 'philippines', 'malaysia', 'vietnam', 'thailand'],
};

// Region slug mappings - some regions use multiple slugs
export const REGION_SLUGS = {
  europe: ['europe'],
  asia: ['asia'],
  americas: ['north-america', 'latin-america'],
  africa: ['africa'],
  oceania: ['oceania'],
};

// Count unique countries from plans' operator_coverages
export const countCountriesFromPlans = (plans) => {
  const countrySet = new Set();
  plans.forEach(plan => {
    if (plan.operator_coverages && Array.isArray(plan.operator_coverages)) {
      plan.operator_coverages.forEach(cov => {
        if (cov.code) countrySet.add(cov.code);
      });
    }
  });
  return countrySet.size;
};

// Get best 3 plans (cheapest + mid-tier/best value + unlimited)
export const getBestPlans = (plans) => {
  if (!plans || plans.length === 0) return { plan1: null, plan2: null, plan3: null, hasUnlimited: false };
  
  const sortedByPrice = [...plans].sort((a, b) => 
    (parsePrice(a.price) || 999) - (parsePrice(b.price) || 999)
  );
  
  // Plan 1: Cheapest
  const cheapestPlan = sortedByPrice[0];
  const usedIds = new Set([cheapestPlan.id]);
  
  // Find unlimited plans
  const unlimitedPlans = plans.filter(p => 
    (p.data || '').toLowerCase().includes('unlimited') || 
    (p.data || '').includes('∞') ||
    p.is_unlimited === true
  );
  
  // Find mid-tier plans (5-10GB)
  const midTierPlans = plans.filter(p => {
    const mb = p.data_amount_mb || p.capacity || 0;
    const dataStr = (p.data || '').toLowerCase();
    // Check for 5GB-10GB range
    const is5to10GB = (mb >= 5120 && mb <= 10240) || 
      /^(5|6|7|8|9|10)\s*gb/i.test(dataStr);
    return is5to10GB && !usedIds.has(p.id);
  });
  
  // Find larger data plans (>10GB, not unlimited)
  const largerDataPlans = plans.filter(p => {
    const mb = p.data_amount_mb || p.capacity || 0;
    const isUnlimited = (p.data || '').toLowerCase().includes('unlimited') || p.is_unlimited;
    return mb > 10240 && !isUnlimited && !usedIds.has(p.id);
  });
  
  let plan2 = null;
  let plan3 = null;
  let hasUnlimited = false;
  
  // Plan 2: Best value mid-tier (5-10GB) or next cheapest
  if (midTierPlans.length > 0) {
    plan2 = midTierPlans.reduce((min, p) => 
      (parsePrice(p.price) || 999) < (parsePrice(min.price) || 999) ? p : min
    );
    usedIds.add(plan2.id);
  } else if (sortedByPrice.length > 1 && !usedIds.has(sortedByPrice[1].id)) {
    plan2 = sortedByPrice[1];
    usedIds.add(plan2.id);
  }
  
  // Plan 3: Unlimited (preferred) or larger data plan
  if (unlimitedPlans.length > 0) {
    const availableUnlimited = unlimitedPlans.filter(p => !usedIds.has(p.id));
    if (availableUnlimited.length > 0) {
      plan3 = availableUnlimited.reduce((min, p) => 
        (parsePrice(p.price) || 999) < (parsePrice(min.price) || 999) ? p : min
      );
      hasUnlimited = true;
      usedIds.add(plan3.id);
    }
  }
  
  // If no unlimited, try larger data plans
  if (!plan3 && largerDataPlans.length > 0) {
    const availableLarger = largerDataPlans.filter(p => !usedIds.has(p.id));
    if (availableLarger.length > 0) {
      plan3 = availableLarger.reduce((min, p) => 
        (parsePrice(p.price) || 999) < (parsePrice(min.price) || 999) ? p : min
      );
      usedIds.add(plan3.id);
    }
  }
  
  // Fallback: use next available plan from sorted list
  if (!plan3 && sortedByPrice.length > 2) {
    const remaining = sortedByPrice.filter(p => !usedIds.has(p.id));
    if (remaining.length > 0) {
      plan3 = remaining[0];
    }
  }
  
  return { plan1: cheapestPlan, plan2, plan3, hasUnlimited };
};

// Region display names getter
export const getRegionNames = (t) => ({
  europe: t('region.europe', 'Europe'),
  asia: t('region.asia', 'Asia'),
  americas: t('region.americas', 'Americas'),
  africa: t('region.africa', 'Africa'),
  oceania: t('region.oceania', 'Oceania'),
});

// Region icons (emoji-based for simplicity)
export const REGION_ICONS = {
  europe: '🇪🇺',
  asia: '🌏',
  americas: '🌎',
  africa: '🌍',
  oceania: '🌊',
};
