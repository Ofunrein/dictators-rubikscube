/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dictator: {
          void: '#0D0D0D',
          red: '#CC1A1A',
          chrome: '#B0B0B0',
          smoke: '#F2F0ED',
          charcoal: '#1A1A1A',
          deep: '#8B0000',
        }
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        drama: ['"Anton"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      letterSpacing: {
        tight: '-0.02em',
        widest: '0.15em',
        superwide: '0.3em',
      }
    },
  },
  plugins: [],
}
