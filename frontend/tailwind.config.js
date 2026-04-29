/*
 * Tailwind CSS Config — defines our project's custom design tokens.
 *
 * Tailwind gives us utility classes like "bg-blue-500", but here we extend it
 * with our own brand-specific values:
 *
 * Colors (used as e.g. "bg-dictator-void", "text-dictator-red"):
 *   - dictator-void:    #0D0D0D  (near-black, our main dark background)
 *   - dictator-red:     #CC1A1A  (red accent color)
 *   - dictator-chrome:  #B0B0B0  (metallic gray for subtle text)
 *   - dictator-smoke:   #F2F0ED  (off-white page background)
 *   - dictator-charcoal:#1A1A1A  (dark gray for body text)
 *   - dictator-deep:    #8B0000  (dark red for hover states)
 *
 * Fonts (used as e.g. "font-heading", "font-drama"):
 *   - Space Grotesk — clean modern font for headings
 *   - Anton — bold dramatic font for big hero text
 *   - Inter — readable body text font
 *   - IBM Plex Mono — monospace font for code-style text
 *
 * The "content" array tells Tailwind which files to scan for class names
 * so it only generates CSS for classes we actually use (keeps the bundle small).
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dictator: {
          void: '#0D0D0D',
          red: 'var(--color-dictator-red)',
          'red-light': '#EF4444',
          'red-base': '#CC1A1A',
          chrome: '#B0B0B0',
          smoke: '#F2F0ED',
          charcoal: '#1A1A1A',
          deep: '#8B0000',
          // Light mode palette (warm cream)
          cream: '#FAF8F5',
          linen: '#F0EDE8',
          sand: '#E5E0D8',
          ink: '#2C2A26',
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
