/*
 * PostCSS Config — processes our CSS files after we write them.
 *
 * PostCSS runs two plugins on every CSS file:
 *   1. Tailwind CSS — our utility-class styling framework. Instead of writing
 *      custom CSS, we use class names like "bg-red-500" or "text-center" directly
 *      in our HTML/JSX.
 *   2. Autoprefixer — automatically adds browser-specific CSS prefixes like
 *      -webkit- or -moz- so our styles work correctly in all browsers
 *      (Chrome, Safari, Firefox, etc.) without us having to think about it.
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
