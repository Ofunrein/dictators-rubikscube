import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext.tsx';

vi.mock('../lib/auth', () => ({
  getCurrentSession: vi.fn().mockResolvedValue({ session: null, error: null }),
  getUserProfile: vi.fn().mockResolvedValue({ profile: null }),
  getUserStats: vi.fn().mockResolvedValue({ twoByTwo: null, threeByThree: null }),
  signIn: vi.fn().mockResolvedValue({ user: null, error: null }),
  signUp: vi.fn().mockResolvedValue({ user: null, session: null, error: null }),
  signOut: vi.fn().mockResolvedValue(undefined),
  deleteAccount: vi.fn().mockResolvedValue({ error: null }),
}));

function AuthConsumer() {
  const { currentUser, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? 'loading' : 'ready'}</span>
      <span data-testid="user">{currentUser ? currentUser.email : 'none'}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('currentUser is null on load with no session', async () => {
    render(<AuthProvider><AuthConsumer /></AuthProvider>);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    }, { timeout: 3000 });
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('useAuth throws when outside AuthProvider', () => {
    expect(() => render(<AuthConsumer />)).toThrow();
  });
});
