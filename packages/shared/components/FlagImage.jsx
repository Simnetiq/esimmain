/**
 * Shared FlagImage component — renders SVG flag or emoji fallback.
 * Flag SVGs live at /flags/{code}.svg in each app's public directory.
 */

const FLAG_SVG_SET = new Set([
  // Original set (language selector)
  'us', 'es', 'ru', 'de', 'fr', 'il', 'sa', 'br', 'jp', 'cn', 'pl', 'ua', 'in', 'kr', 'th', 'nl', 'tr',
  // CoverageStats regions
  'it', 'gb', 'sg', 'ca', 'mx', 'ar', 'za', 'ke', 'ng', 'eg', 'ma', 'au', 'nz', 'fj', 'pg', 'ws', 'ae', 'jo', 'qa',
]);

export { FLAG_SVG_SET };

export default function FlagImage({ code, emoji, className = 'w-5 h-5 rounded-full object-cover' }) {
  if (FLAG_SVG_SET.has(code)) {
    return (
      <img
        src={`/flags/${code}.svg`}
        alt=""
        className={className}
        loading="lazy"
      />
    );
  }
  return <span className="text-xl leading-none">{emoji}</span>;
}
