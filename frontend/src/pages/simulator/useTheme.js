/**
 * useTheme.js — Light/dark mode toggle with localStorage persistence
 *
 * Provides a simple hook that any simulator component can use to check
 * the current theme and toggle it. The preference is saved to localStorage
 * so it persists across page reloads and sessions.
 *
 * Usage:
 *   const { theme, isDark, toggleTheme } = useTheme();
 *   // theme = 'dark' | 'light'
 *   // isDark = true | false
 *   // toggleTheme() flips it and saves to localStorage
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'simulator-theme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
  };
}
