/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#171717',
        paper: '#FAFAF8',
        line: '#E4E2DD',
        accent: '#0F6E5C',
        accentSoft: '#E4F3EF',
        muted: '#6B6B66',
      },
      fontFamily: {
        display: ['"IBM Plex Serif"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
