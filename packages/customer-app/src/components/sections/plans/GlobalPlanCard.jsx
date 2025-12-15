import { memo, useMemo } from 'react';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { ArrowRightIcon } from './PlanIcons';

// Representative flags for global coverage display
const GLOBAL_FLAGS = ['🇺🇸', '🇬🇧', '🇫🇷', '🇩🇪', '🇯🇵', '🇦🇺', '🇧🇷', '🇨🇦'];

// Global Plan Card - for Discover Global featured plans
const GlobalPlanCard = memo(function GlobalPlanCard({ plan, onClick, t }) {
  const isUnlimited = (plan.data || '').toLowerCase().includes('unlimited') || plan.is_unlimited;
  
  // Get a subset of flags to display (rotate based on plan data for variety)
  const displayFlags = useMemo(() => {
    const startIndex = (plan.data?.length || 0) % 4;
    return GLOBAL_FLAGS.slice(startIndex, startIndex + 4);
  }, [plan.data]);
  
  return (
    <button
      onClick={onClick}
      className="group relative bg-gradient-to-br from-tufts-blue/5 to-blue-50 hover:from-tufts-blue/10 hover:to-blue-100 rounded-xl p-4 text-left transition-all duration-300"
    >
      {/* Header with flags and badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          {displayFlags.map((flag, i) => (
            <span 
              key={i} 
              className="text-sm"
              style={{ marginLeft: i > 0 ? '-4px' : 0 }}
            >
              {flag}
            </span>
          ))}
          <span className="ml-1 text-[10px] text-gray-400">+130</span>
        </div>
        {isUnlimited && (
          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[10px] font-semibold rounded">
            ∞
          </span>
        )}
      </div>
      
      {/* Plan details */}
      <div className="mb-2">
        <p className="text-lg font-bold text-eerie-black">{plan.data}</p>
        <p className="text-xs text-gray-500">{plan.period || plan.validity} {t('planSelection.days', 'days')}</p>
      </div>
      
      {/* Price and action */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-tufts-blue">{formatPrice(plan.price)}</span>
        <ArrowRightIcon className="w-4 h-4 text-gray-400 group-hover:text-tufts-blue group-hover:translate-x-0.5 transition-all" />
      </div>
      
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-black/5 group-hover:ring-tufts-blue/20 transition-all" />
    </button>
  );
});

export default GlobalPlanCard;
