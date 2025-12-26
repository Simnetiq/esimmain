import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { ArrowRightIcon, GlobeIcon, InfinityIcon, PhoneIcon, MessageSquareIcon } from './PlanIcons';

const GlobalPlanCard = ({ plan, onClick, t }) => {
    const pathname = usePathname();
    const { locale, isLoading: i18nLoading } = useI18n();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const detectedLanguage = useMemo(() => {
        try {
            if (i18nLoading) {
                if (typeof window !== 'undefined') {
                    const savedLanguage = localStorage.getItem('Simnetiq-language');
                    if (savedLanguage) return savedLanguage;
                }
                return detectLanguageFromPath(pathname) || 'en';
            }
            return locale || 'en';
        } catch {
            return 'en';
        }
    }, [locale, pathname, i18nLoading]);

    const direction = mounted ? getLanguageDirection(detectedLanguage) : 'ltr';
    const isRTL = direction === 'rtl';
    const isUnlimited = (plan.data || '').toLowerCase().includes('unlimited') || plan.is_unlimited;

    // Check if plan has SMS or Voice
    const hasSms = parseInt(plan.sms) > 0;
    const hasVoice = parseInt(plan.voice) > 0 || parseInt(plan.calls) > 0;

    return (
        <button
            onClick={onClick}
            className={`group flex flex-col p-4 bg-white border border-gray-100 rounded-xl hover:shadow-lg hover:border-blue-100 transition-all duration-300 h-full items-start ${isRTL ? 'text-right' : 'text-left'}`}
            dir={direction}
            lang={detectedLanguage}
        >
            {/* Icon & Badges */}
            <div className={`flex items-start justify-between w-full mb-4 `}>
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <GlobeIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex items-center gap-1">
                    {isUnlimited && (
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                            {t('deals.unlimitedBadge', 'Unlimited')}
                        </span>
                    )}
                    {hasVoice && (
                        <span className="px-2 py-1 bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                            <PhoneIcon className="w-3 h-3" />
                            {t('deals.calls', 'Calls')}
                        </span>
                    )}
                    {hasSms && (
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                            <MessageSquareIcon className="w-3 h-3" />
                            SMS
                        </span>
                    )}
                </div>
            </div>

            {/* Plan Details */}
            <div className="flex-1 w-full">
                <div className={`flex items-baseline gap-1 mb-1 `}>
                    <span className="text-xl font-bold text-eerie-black">
                        {plan.data}
                    </span>
                    <span className="text-sm text-gray-500">
                        / {plan.period || plan.validity} {t('common.days', 'days')}
                    </span>
                </div>

                <p className={`text-xs text-gray-500 line-clamp-2 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('deals.globalCoverage', 'Coverage in 130+ countries')}
                </p>
            </div>

            {/* Price & Action */}
            <div className={`w-full flex items-center justify-between pt-3 border-t border-gray-50 `}>
                <div className={`flex flex-col ${isRTL ? 'text-right' : 'text-left'}`}>
                    <span className="text-xs text-gray-400 font-medium">
                        {t('common.from', 'From')}
                    </span>
                    <span className="text-lg font-bold text-tufts-blue">
                        {formatPrice(plan.price)}
                    </span>
                </div>

                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-tufts-blue group-hover:text-white transition-colors">
                    <ArrowRightIcon className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </div>
            </div>
        </button>
    );
};

export default GlobalPlanCard;
