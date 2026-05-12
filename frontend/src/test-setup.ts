/**
 * test-setup.ts — Global test environment setup for Vitest + jsdom
 *
 * Polyfills and stubs that jsdom doesn't implement fully.
 * Runs before every test file via vitest.config.ts setupFiles.
 */

// jsdom implements localStorage but some versions omit clear/key methods.
// Replacing with a full in-memory implementation avoids "not a function" errors.
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
