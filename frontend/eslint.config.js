/*
 * ESLint Config — our code quality tool.
 *
 * ESLint scans our JavaScript/JSX files and catches common mistakes like
 * unused variables, missing imports, or incorrect React hook usage.
 * Think of it like a spell-checker but for code.
 *
 * What this config does:
 *   - Turns on React-specific rules (hooks must follow the Rules of Hooks, etc.)
 *   - Ignores unused variables that start with an uppercase letter (like
 *     imported React component names that get used in JSX, not plain JS)
 *   - Excludes the dist/ folder since that's generated build output, not our code
 */
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])
