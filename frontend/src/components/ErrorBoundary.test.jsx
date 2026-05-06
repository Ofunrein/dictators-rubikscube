import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary.jsx';

const originalError = console.error;
beforeAll(() => { console.error = vi.fn(); });
afterAll(() => { console.error = originalError; });

function Bomb({ shouldThrow }) {
  if (shouldThrow) throw new Error('test explosion');
  return <p>Safe content</p>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeTruthy();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    expect(screen.getByText('test explosion')).toBeTruthy();
  });

  it('resets when Try again is clicked', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeTruthy();
  });
});
