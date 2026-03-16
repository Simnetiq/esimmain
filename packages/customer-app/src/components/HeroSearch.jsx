'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';

// Popular travel destinations — static list for zero-latency search
const POPULAR_COUNTRIES = [
  { name: 'Turkey', code: 'tr', nameKey: 'country.turkey' },
  { name: 'Thailand', code: 'th', nameKey: 'country.thailand' },
  { name: 'United States', code: 'us', nameKey: 'country.usa' },
  { name: 'Japan', code: 'jp', nameKey: 'country.japan' },
  { name: 'Germany', code: 'de', nameKey: 'country.germany' },
  { name: 'France', code: 'fr', nameKey: 'country.france' },
  { name: 'Spain', code: 'es', nameKey: 'country.spain' },
  { name: 'Italy', code: 'it', nameKey: 'country.italy' },
  { name: 'United Kingdom', code: 'gb', nameKey: 'country.uk' },
  { name: 'Brazil', code: 'br', nameKey: 'country.brazil' },
  { name: 'Egypt', code: 'eg', nameKey: 'country.egypt' },
  { name: 'India', code: 'in', nameKey: 'country.india' },
  { name: 'South Korea', code: 'kr', nameKey: 'country.southKorea' },
  { name: 'Australia', code: 'au', nameKey: 'country.australia' },
  { name: 'Canada', code: 'ca', nameKey: 'country.canada' },
  { name: 'Mexico', code: 'mx', nameKey: 'country.mexico' },
  { name: 'Greece', code: 'gr', nameKey: 'country.greece' },
  { name: 'Portugal', code: 'pt', nameKey: 'country.portugal' },
  { name: 'Netherlands', code: 'nl', nameKey: 'country.netherlands' },
  { name: 'Switzerland', code: 'ch', nameKey: 'country.switzerland' },
  { name: 'UAE', code: 'ae', nameKey: 'country.uae' },
  { name: 'Saudi Arabia', code: 'sa', nameKey: 'country.saudiArabia' },
  { name: 'Singapore', code: 'sg', nameKey: 'country.singapore' },
  { name: 'China', code: 'cn', nameKey: 'country.china' },
  { name: 'Indonesia', code: 'id', nameKey: 'country.indonesia' },
  { name: 'Malaysia', code: 'my', nameKey: 'country.malaysia' },
  { name: 'Philippines', code: 'ph', nameKey: 'country.philippines' },
  { name: 'Vietnam', code: 'vn', nameKey: 'country.vietnam' },
  { name: 'Poland', code: 'pl', nameKey: 'country.poland' },
  { name: 'Czech Republic', code: 'cz', nameKey: 'country.czech' },
  { name: 'Argentina', code: 'ar', nameKey: 'country.argentina' },
  { name: 'Colombia', code: 'co', nameKey: 'country.colombia' },
  { name: 'Morocco', code: 'ma', nameKey: 'country.morocco' },
  { name: 'South Africa', code: 'za', nameKey: 'country.southAfrica' },
  { name: 'New Zealand', code: 'nz', nameKey: 'country.newZealand' },
  { name: 'Israel', code: 'il', nameKey: 'country.israel' },
  { name: 'Croatia', code: 'hr', nameKey: 'country.croatia' },
  { name: 'Hungary', code: 'hu', nameKey: 'country.hungary' },
  { name: 'Austria', code: 'at', nameKey: 'country.austria' },
  { name: 'Sweden', code: 'se', nameKey: 'country.sweden' },
];

export default function HeroSearch({ esimPlansUrl }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const router = useRouter();
  const { t } = useI18n();
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return POPULAR_COUNTRIES.slice(0, 8); // Show popular when empty
    const q = query.toLowerCase();
    return POPULAR_COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query]);

  const navigateToCountry = useCallback((countryName) => {
    setIsOpen(false);
    setQuery('');
    router.push(`${esimPlansUrl}?country=${encodeURIComponent(countryName)}`);
  }, [router, esimPlansUrl]);

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => (prev <= 0 ? filtered.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && filtered[highlightIndex]) {
        navigateToCountry(filtered[highlightIndex].name);
      } else if (query.trim()) {
        router.push(`${esimPlansUrl}?search=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }, [isOpen, highlightIndex, filtered, navigateToCountry, query, router, esimPlansUrl]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (!inputRef.current?.contains(e.target) && !dropdownRef.current?.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Reset highlight when query changes
  useEffect(() => {
    setHighlightIndex(-1);
  }, [query]);

  return (
    <div className="relative w-full sm:max-w-md mb-8">
      {/* Search input */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 rtl-native-flex"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: `1px solid ${isOpen ? 'var(--tufts-blue, #4975D4)' : 'var(--card-border)'}`,
          color: 'var(--text-muted)',
        }}
      >
        <svg className="w-5 h-5 flex-shrink-0 text-tufts-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t('hero.searchPlaceholder', 'Where are you traveling?')}
          className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-label={t('hero.searchPlaceholder', 'Where are you traveling?')}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="flex-shrink-0 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (filtered.length > 0 || query.trim()) && (
        <div
          ref={dropdownRef}
          role="listbox"
          className="absolute top-full mt-2 w-full rounded-2xl shadow-xl z-50 overflow-hidden backdrop-blur-xl"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }}
        >
          {!query.trim() && (
            <p className="px-4 pt-3 pb-1 text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)]">
              {t('hero.popularDestinations', 'Popular destinations')}
            </p>
          )}
          <div className="py-1 max-h-[280px] overflow-y-auto">
            {filtered.map((country, idx) => (
              <button
                key={country.code}
                role="option"
                aria-selected={idx === highlightIndex}
                onClick={() => navigateToCountry(country.name)}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-start transition-colors rtl-native-flex ${
                  idx === highlightIndex
                    ? 'bg-[var(--hover-bg)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]'
                }`}
              >
                <img
                  src={`/flags/${country.code}.svg`}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                  loading="lazy"
                />
                <span className="font-medium">{country.name}</span>
              </button>
            ))}
          </div>
          {query.trim() && filtered.length === 0 && (
            <p className="px-4 py-3 text-sm text-[var(--text-muted)]">
              {t('hero.noResults', 'No destinations found')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
