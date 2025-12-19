import { memo, useMemo } from 'react';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { 
  GlobeIcon, 
  MapPinIcon, 
  DollarSignIcon, 
  InfinityIcon,
  ArrowRightIcon 
} from './PlanIcons';
import { getBestPlans, getRegionNames, REGION_ICONS } from './planUtils';

// Region flags for visual display
const REGION_FLAGS = {
  europe: ['🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸', '🇬🇧', '🇳🇱', '🇵🇹','🇵🇱','🇦🇱','🇩🇰'],
  asia: ['🇯🇵', '🇰🇷', '🇹🇭', '🇸🇬', '🇻🇳', '🇮🇩', '🇹🇼',], 
  americas: ['🇺🇸', '🇨🇦', '🇲🇽', '🇧🇷', '🇦🇷', '🇨🇴', '🇨🇺' , '🇨🇷', '🇨🇻'],
  africa: ['🇿🇦', '🇪🇬', '🇲🇦', '🇰🇪', '🇳🇬', '🇬🇭', '🇸🇩', '🇸🇱'],
  oceania: ['🇦🇺', '🇳🇿', '🇫🇯', '🇮🇩', '🇵🇭', '🇲🇾', '🇸🇧' , '🇸🇨'],
};

// Regional Deal Card - Clean design matching FeaturesSection
const RegionalDealCard = memo(function RegionalDealCard({ 
  region, 
  plans, 
  countriesCount, 
  onPlanClick, 
  t, 
  isLoading 
}) {
  const { plan1, plan2, hasUnlimited } = useMemo(() => getBestPlans(plans), [plans]);
  const regionNames = useMemo(() => getRegionNames(t), [t]);
  const flags = REGION_FLAGS[region] || REGION_FLAGS.europe;

  return (
    <div className="group relative bg-gray-50 overflow-hidden hover:bg-white transition-all duration-500 h-full flex flex-col">
      {/* Visual Header Area - Clean gray background with flags */}
      <div className="relative h-32 sm:h-36 lg:h-40 overflow-hidden bg-gray-100">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.05) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }} />
        </div>
        
        {/* Floating flags display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2">
            {flags.map((flag, i) => (
              <span 
                key={i} 
                className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-500"
                style={{ 
                  transform: `translateY(${i % 2 === 0 ? '-4px' : '4px'})`
                }}
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
        
        
        
        {/* Region icon - bottom left */}
        <div className="absolute bottom-3 left-3 w-12 h-12 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center text-2xl shadow-sm">
          {REGION_ICONS[region] || '🌍'}
        </div>
        
        {/* Countries count badge */}
        <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full flex items-center gap-1.5 shadow-sm">
          <GlobeIcon className="w-3.5 h-3.5 text-tufts-blue" />
          <span className="text-xs font-semibold text-eerie-black">
            {countriesCount > 0 ? `${countriesCount}` : '30+'} {t('deals.countries', 'countries')}
          </span>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="p-4 lg:p-5 flex-1 flex flex-col">
        {/* Description text first */}
        <p className="text-gray-500 text-sm leading-relaxed mb-2">
          {t('deals.oneEsimAll', 'One eSIM covers all countries in')} {regionNames[region]}
        </p>
        
        {/* Title */}
        <h3 className="text-lg lg:text-xl font-semibold text-eerie-black mb-4">
          {regionNames[region]} {t('deals.regionalEsim', 'Regional eSIM')}
        </h3>

        {/* Plans Options */}
        <div className="flex-1 flex flex-col gap-2">
          {isLoading ? (
            <>
              <div className="bg-gray-100 rounded-lg p-3 animate-pulse h-14" />
              <div className="bg-gray-100 rounded-lg p-3 animate-pulse h-14" />
            </>
          ) : (
            <>
              {plan1 && (
                <button
                  onClick={() => onPlanClick(plan1)}
                  className="group/plan bg-white hover:bg-gray-50 rounded-lg p-3 text-left transition-all duration-200 hover:shadow-sm border border-gray-100"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                        <DollarSignIcon className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-eerie-black">
                          {plan1.data} · {plan1.period || plan1.validity}d
                        </p>
                        <p className="text-[11px] text-gray-500">{t('deals.bestPrice', 'Best price')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-tufts-blue">
                        {formatPrice(plan1.price)}
                      </span>
                      <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover/plan:text-tufts-blue group-hover/plan:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </button>
              )}

              {plan2 && (
                <button
                  onClick={() => onPlanClick(plan2)}
                  className="group/plan bg-white hover:bg-gray-50 rounded-lg p-3 text-left transition-all duration-200 hover:shadow-sm border border-gray-100"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${hasUnlimited ? 'bg-purple-50' : 'bg-blue-50'}`}>
                        {hasUnlimited ? (
                          <InfinityIcon className="w-4 h-4 text-purple-600" />
                        ) : (
                          <span className="text-[10px] font-bold text-blue-600">+GB</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-eerie-black">
                          {plan2.data} · {plan2.period || plan2.validity}d
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {hasUnlimited ? t('deals.unlimited', 'Unlimited data') : t('deals.moreData', 'More data')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-tufts-blue">
                        {formatPrice(plan2.price)}
                      </span>
                      <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover/plan:text-tufts-blue group-hover/plan:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </button>
              )}

              {!plan1 && !plan2 && !isLoading && (
                <div className="bg-gray-100 rounded-lg p-3 text-center text-gray-400 text-xs">
                  {t('deals.comingSoon', 'Coming soon')}
                </div>
              )}
            </>
          )}
        </div>

        {/* View All Button */}
        {plans && plans.length > 2 && (
          <button
            onClick={() => onPlanClick(null, true)}
            className="mt-3 w-full py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-eerie-black font-semibold flex items-center justify-center gap-1.5 transition-colors group/view"
          >
            {t('deals.viewAllPlans', 'View all plans')} ({plans.length})
            <ArrowRightIcon className="w-3.5 h-3.5 group-hover/view:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
});

export default RegionalDealCard;
