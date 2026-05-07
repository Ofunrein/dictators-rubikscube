import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext.tsx';

function ThemeConsumer() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{isDark ? 'dark' : 'light'}</span>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => { localStorage.clear(); });

  it('provides a default theme', () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);
    expect(['dark', 'light']).toContain(screen.getByTestId('theme').textContent);
  });

  it('toggleTheme switches isDark', async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);
    const initial = screen.getByTestId('theme').textContent;
    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('theme').textContent).not.toBe(initial);
  });

  it('persists theme to localStorage after toggle', async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);
    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(localStorage.length).toBeGreaterThan(0);
  });

  it('useTheme throws when used outside ThemeProvider', () => {
    expect(() => render(<ThemeConsumer />)).toThrow();
  });
});
