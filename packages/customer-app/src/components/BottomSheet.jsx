'use client';

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { usePathname } from 'next/navigation';

const BottomSheet = ({ 
  isOpen, 
  onClose, 
  children, 
  title = "Select Plan",
  maxHeight = "90vh",
  variant = "bottom" // "bottom" or "center"
}) => {
  const sheetRef = useRef(null);
  const backdropRef = useRef(null);
  const { locale } = useI18n();
  const pathname = usePathname();
  
  // Get current language for RTL detection - Memoized
  const currentLanguage = useMemo(() => {
    if (locale) return locale;
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('Simnetiq-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname);
  }, [locale, pathname]);

  const isRTL = useMemo(() => getLanguageDirection(currentLanguage) === 'rtl', [currentLanguage]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  }, [onClose]);

  // Close on drag down (only for bottom variant) - Memoized
  const handleDragEnd = useCallback((event, info) => {
    if (variant === "bottom" && info.offset.y > 100) {
      onClose();
    }
  }, [variant, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={backdropRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
          />

          {variant === "center" ? (
            /* Centered Modal */
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                ref={sheetRef}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ 
                  type: "spring", 
                  damping: 25, 
                  stiffness: 300
                }}
                className="w-full max-w-4xl bg-white shadow-2xl max-h-[85vh] flex flex-col pointer-events-auto overflow-hidden"
              >
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0 bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
                  <div className={`flex items-center justify-between `}>
                    <h2 className={`text-lg font-semibold text-eerie-black tracking-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                      {title}
                    </h2>
                    <button
                      onClick={onClose}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-eerie-black bg-white hover:bg-gray-100 transition-all duration-200 border border-gray-200"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div
                  className="overflow-y-auto flex-1 bg-white"
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  {children}
                </div>
              </motion.div>
            </div>
          ) : (
            /* Bottom Sheet */
            <motion.div
              ref={sheetRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300
              }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              className="fixed bottom-0 left-0 right-0 z-[9999] bg-white shadow-2xl overflow-hidden"
              style={{ maxHeight }}
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-2 bg-gray-50">
                <div className="w-10 h-1 bg-gray-300" />
              </div>

              {/* Header */}
              <div className="px-5 pb-4 pt-2 border-b border-gray-100 bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className={`flex items-center justify-between `}>
                  <h2 className={`text-lg font-semibold text-eerie-black tracking-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                    {title}
                  </h2>
                  <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-eerie-black bg-white hover:bg-gray-100 transition-all duration-200 border border-gray-200"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div
                className="overflow-y-auto bg-white" 
                style={{ maxHeight: `calc(${maxHeight} - 100px)` }}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {children}
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
