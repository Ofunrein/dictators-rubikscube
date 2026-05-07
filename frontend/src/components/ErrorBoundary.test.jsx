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

// Controllable child — lets us flip throwing on/off via ref
function ControlledChild({ throwRef }) {
  // eslint-disable-next-line react-hooks/refs
  if (throwRef.current) throw new Error('controlled explosion');
  return <p>Recovered content</p>;
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

  it('shows Try again button in fallback UI', async () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
  });

  it('clears error state when Try again is clicked and children no longer throw', async () => {
    const user = userEvent.setup();
    const throwRef = { current: true };

    const { rerender } = render(
      <ErrorBoundary>
        <ControlledChild throwRef={throwRef} />
      </ErrorBoundary>
    );

    // Confirm fallback shown
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();

    // Stop the child from throwing, then click Try again
    throwRef.current = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    // Force React to re-render children now that error is cleared
    rerender(
      <ErrorBoundary>
        <ControlledChild throwRef={throwRef} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Recovered content')).toBeTruthy();
    expect(screen.queryByText(/something went wrong/i)).toBeNull();
  });

  it('logs error to console.error via componentDidCatch', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(console.error).toHaveBeenCalledWith(
      '[ErrorBoundary]',
      expect.any(Error),
      expect.anything()
    );
  });
});
