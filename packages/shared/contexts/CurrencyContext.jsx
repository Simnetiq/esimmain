'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '../config/currencies';

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    return {
      currency: DEFAULT_CURRENCY,
      rates: null,
      setCurrency: () => {},
      isLoading: true,
    };
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY);
  const [rates, setRates] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = getSupabase();

  // Load exchange rates from Supabase cache
  const loadRates = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('target_currency, rate, fetched_at')
        .eq('base_currency', 'USD');

      if (error) throw error;
      if (!data || data.length === 0) return;

      const rateMap = {};
      let latestFetch = null;
      for (const row of data) {
        rateMap[row.target_currency] = parseFloat(row.rate);
        if (!latestFetch || new Date(row.fetched_at) > new Date(latestFetch)) {
          latestFetch = row.fetched_at;
        }
      }
      rateMap._fetchedAt = latestFetch;
      setRates(rateMap);
    } catch (err) {
      console.warn('Failed to load exchange rates, defaulting to USD:', err.message);
    }
  }, [supabase]);

  // Load user preference
  const loadPreference = useCallback(async () => {
    // Check localStorage first for instant display (anonymous or authenticated)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('simnetiq-currency');
      if (saved && SUPPORTED_CURRENCIES.some((c) => c.code === saved)) {
        setCurrencyState(saved);
      }
    }

    // Currency preference is stored in localStorage only.
    // The user_currency_preferences table does not exist yet.
    setIsLoading(false);
  }, [supabase, currentUser]);

  // Set currency with persistence
  const setCurrency = useCallback(async (code) => {
    setCurrencyState(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem('simnetiq-currency', code);
    }

    // Currency preference persisted via localStorage only.
    // DB table user_currency_preferences does not exist yet.
  }, [supabase, currentUser]);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  useEffect(() => {
    loadPreference();
  }, [loadPreference]);

  return (
    <CurrencyContext.Provider value={{ currency, rates, setCurrency, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
};
