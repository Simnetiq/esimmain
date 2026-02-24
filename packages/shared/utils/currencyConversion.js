import { getCurrencyByCode } from '../config/currencies';

/**
 * Convert a USD price to target currency using cached rates.
 * Returns the original USD price if conversion is unavailable.
 */
export const convertPrice = (usdPrice, targetCurrency, rates) => {
  if (!usdPrice || targetCurrency === 'USD' || !rates) return usdPrice;

  const rate = rates[targetCurrency];
  if (!rate || rate <= 0) return usdPrice;

  return Math.round(usdPrice * rate * 100) / 100;
};

/**
 * Format a converted price for display.
 * Uses Intl.NumberFormat for locale-aware formatting.
 */
export const formatDisplayPrice = (usdPrice, targetCurrency, rates) => {
  const currency = getCurrencyByCode(targetCurrency);
  const converted = convertPrice(usdPrice, targetCurrency, rates);

  if (converted === null || converted === undefined) {
    return `${currency.symbol}0.00`;
  }

  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  } catch {
    return `${currency.symbol}${Number(converted).toFixed(2)}`;
  }
};

/**
 * Check if exchange rates are stale (older than 2 hours).
 */
export const areRatesStale = (fetchedAt) => {
  if (!fetchedAt) return true;
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  return Date.now() - new Date(fetchedAt).getTime() > TWO_HOURS;
};
