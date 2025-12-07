/**
 * Price Utilities
 * Centralized price formatting functions for consistent display across the application
 * 
 * IMPORTANT: All price displays should use these utilities to ensure consistency
 * between admin panel, customer app, and dashboard
 */

/**
 * Format price for display with currency symbol
 * @param {number|string} price - The price to format
 * @param {string} currency - Currency code (default: 'USD')
 * @param {object} options - Additional formatting options
 * @returns {string} Formatted price string (e.g., "$1.53")
 */
export const formatPrice = (price, currency = 'USD', options = {}) => {
  const {
    showCurrencySymbol = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  // Handle null, undefined, or invalid values
  if (price === null || price === undefined || price === '') {
    return showCurrencySymbol ? '$0.00' : '0.00';
  }

  // Parse price to number
  let numericPrice = typeof price === 'string' 
    ? parseFloat(price.replace(/[^0-9.-]/g, '')) 
    : parseFloat(price);

  // Handle NaN
  if (isNaN(numericPrice)) {
    return showCurrencySymbol ? '$0.00' : '0.00';
  }

  // Format the number
  const formattedNumber = numericPrice.toFixed(maximumFractionDigits);

  // Return with or without currency symbol
  if (showCurrencySymbol) {
    const currencySymbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CNY: '¥',
      KRW: '₩',
      INR: '₹',
      BRL: 'R$',
      MXN: '$',
      CAD: 'C$',
      AUD: 'A$',
    };
    const symbol = currencySymbols[currency.toUpperCase()] || '$';
    return `${symbol}${formattedNumber}`;
  }

  return formattedNumber;
};

/**
 * Format price without currency symbol (just the number)
 * @param {number|string} price - The price to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted price string (e.g., "1.53")
 */
export const formatPriceNumber = (price, decimals = 2) => {
  return formatPrice(price, 'USD', { 
    showCurrencySymbol: false, 
    maximumFractionDigits: decimals 
  });
};

/**
 * Parse price from various formats to a clean number
 * @param {number|string} price - The price to parse
 * @returns {number} Parsed price as number
 */
export const parsePrice = (price) => {
  if (price === null || price === undefined || price === '') {
    return 0;
  }

  if (typeof price === 'number') {
    return isNaN(price) ? 0 : price;
  }

  // Remove currency symbols and parse
  const cleaned = String(price).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Format price for Stripe (convert to cents)
 * @param {number|string} price - The price in dollars
 * @returns {number} Price in cents (integer)
 */
export const formatPriceForStripe = (price) => {
  const numericPrice = parsePrice(price);
  return Math.round(numericPrice * 100);
};

/**
 * Format price from Stripe (convert from cents to dollars)
 * @param {number} cents - The price in cents
 * @returns {number} Price in dollars
 */
export const formatPriceFromStripe = (cents) => {
  if (!cents || isNaN(cents)) return 0;
  return cents / 100;
};

/**
 * Calculate discount price
 * @param {number|string} originalPrice - Original price
 * @param {number} discountPercentage - Discount percentage (e.g., 10 for 10%)
 * @param {number} minimumPrice - Minimum price floor (default: 0.50)
 * @returns {number} Discounted price
 */
export const calculateDiscountedPrice = (originalPrice, discountPercentage, minimumPrice = 0.50) => {
  const price = parsePrice(originalPrice);
  const discounted = price * (100 - discountPercentage) / 100;
  return Math.max(minimumPrice, discounted);
};

/**
 * Format price range (e.g., "From $1.53")
 * @param {number|string} minPrice - Minimum price
 * @param {string} prefix - Prefix text (default: 'From')
 * @param {string} currency - Currency code
 * @returns {string} Formatted price range string
 */
export const formatPriceRange = (minPrice, prefix = 'From', currency = 'USD') => {
  const formatted = formatPrice(minPrice, currency);
  return prefix ? `${prefix} ${formatted}` : formatted;
};

/**
 * Compare two prices (useful for sorting)
 * @param {number|string} priceA - First price
 * @param {number|string} priceB - Second price
 * @returns {number} Comparison result (-1, 0, 1)
 */
export const comparePrices = (priceA, priceB) => {
  const a = parsePrice(priceA);
  const b = parsePrice(priceB);
  return a - b;
};

/**
 * Check if price is valid (positive number)
 * @param {number|string} price - Price to validate
 * @returns {boolean} True if valid price
 */
export const isValidPrice = (price) => {
  const parsed = parsePrice(price);
  return parsed > 0 && isFinite(parsed);
};

/**
 * Get price display object with all common formats
 * Useful for components that need multiple price formats
 * @param {number|string} price - The price
 * @param {string} currency - Currency code
 * @returns {object} Object with various price formats
 */
export const getPriceDisplay = (price, currency = 'USD') => {
  const numeric = parsePrice(price);
  return {
    raw: numeric,
    formatted: formatPrice(numeric, currency),
    number: formatPriceNumber(numeric),
    cents: formatPriceForStripe(numeric),
    isValid: isValidPrice(numeric),
  };
};

export default {
  formatPrice,
  formatPriceNumber,
  parsePrice,
  formatPriceForStripe,
  formatPriceFromStripe,
  calculateDiscountedPrice,
  formatPriceRange,
  comparePrices,
  isValidPrice,
  getPriceDisplay,
};

