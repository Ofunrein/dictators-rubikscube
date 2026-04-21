/**
 * ThemeContext.jsx — Global dark/light mode toggle with localStorage persistence
 *
 * Wraps the entire app (see main.jsx) so any component can read isDark or call
 * toggleTheme without prop drilling. The preference is written to localStorage
 * under the key 'simulator-theme' so it survives page reloads.
 *
 * This replaces the old per-component useTheme.js hook that lived in the simulator
 * folder. That hook only shared state within the simulator page; this context shares
 * it across all pages (simulator, learn, leaderboard, profile).
 *
 * Usage anywhere in the app:
 *   const { isDark, toggleTheme } = useTheme();
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'simulator-theme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
