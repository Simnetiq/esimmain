'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCurrency } from '@esim/shared/contexts/CurrencyContext';
import { SUPPORTED_CURRENCIES, getCurrencyByCode } from '@esim/shared/config/currencies';

const ChevronDownIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CurrencyToggle = () => {
  const { currency, setCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentCurrency = getCurrencyByCode(currency);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleClose = () => setIsOpen(false);

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('closeNavbarDropdowns', handleClose);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('closeNavbarDropdowns', handleClose);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex rtl-native-flex items-center gap-1 py-2 px-2 lg:px-3 text-sm font-medium text-eerie-black hover:text-tufts-blue transition-colors rounded-md"
        aria-label="Select Currency"
      >
        <span className="text-sm">{currentCurrency.symbol}</span>
        <span className="hidden lg:inline text-sm">{currentCurrency.code}</span>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 hidden lg:block transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute end-0 mt-2 w-52 bg-[var(--bg-primary)] border border-[var(--card-border)] shadow-xl shadow-gray-100/30 z-50">
            <ul className="p-2 text-sm font-medium text-text-primary">
              {SUPPORTED_CURRENCIES.map((c) => (
                <li key={c.code}>
                  <button
                    onClick={() => {
                      setCurrency(c.code);
                      setIsOpen(false);
                    }}
                    className={`inline-flex rtl-native-flex items-center justify-between w-full p-2 rounded hover:bg-[var(--hover-bg)] hover:text-eerie-black transition-colors ${
                      c.code === currency ? 'bg-tufts-blue/10 text-tufts-blue' : ''
                    }`}
                  >
                    <span>{c.symbol} {c.code} &mdash; {c.name}</span>
                    {c.code === currency && <CheckIcon className="w-4 h-4 flex-shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default CurrencyToggle;
