/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    // Include shared package for class detection
    '../shared/**/*.{js,ts,jsx,tsx}',
  ],
  // Remove safelist - custom colors defined in globals.css utilities layer
  // Tailwind will purge unused classes automatically
  theme: {
    extend: {
      // Use CSS variables for custom colors (already defined in globals.css)
      colors: {
        'jordy-blue': 'var(--jordy-blue)',
        'tufts-blue': 'var(--tufts-blue)',
        'alice-blue': 'var(--alice-blue)',
        'cobalt-blue': 'var(--cobalt-blue)',
        'cool-black': 'var(--cool-black)',
        'eerie-black': 'var(--eerie-black)',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'var(--font-heebo)', 'var(--font-ibm-plex-arabic)', 'var(--font-rubik)', 'system-ui', 'sans-serif'],
        hebrew: ['var(--font-heebo)', 'var(--font-rubik)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-ibm-plex-arabic)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    // Typography plugin for blog prose styling
    require('@tailwindcss/typography'),
    // Forms plugin for input styling
    require('@tailwindcss/forms')({
      strategy: 'class', // Only generate form styles when class is used
    }),
  ],
}
