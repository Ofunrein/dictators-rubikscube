import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase.js', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import { supabase } from './supabase.js';
import {
  deleteAccount,
  getCurrentSession,
  getUserProfile,
  getUserStats,
  signIn,
  signOut,
  signUp,
} from './auth.js';

function makeChain(resolvedValue) {
  const single = vi.fn().mockResolvedValue(resolvedValue);
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  return { select, eq, single };
}

afterEach(() => vi.clearAllMocks());

describe('signUp', () => {
  it('returns user and session on success', async () => {
    const user = { id: 'u1', email: 'a@b.com' };
    const session = { access_token: 'tok' };
    supabase.auth.signUp.mockResolvedValue({ data: { user, session }, error: null });

    const result = await signUp('a@b.com', 'pass', 'alice');

    expect(result.user).toEqual(user);
    expect(result.session).toEqual(session);
    expect(result.error).toBeNull();
  });

  it('returns error when Supabase auth rejects', async () => {
    const authError = new Error('Email taken');
    supabase.auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: authError });

    const result = await signUp('a@b.com', 'pass', 'alice');

    expect(result.user).toBeNull();
    expect(result.error).toBe(authError);
  });

  it('returns error when signUp resolves with no user', async () => {
    supabase.auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: null });

    const result = await signUp('a@b.com', 'pass', 'alice');

    expect(result.user).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });

  it('forwards username in metadata options', async () => {
    const user = { id: 'u1' };
    supabase.auth.signUp.mockResolvedValue({ data: { user, session: null }, error: null });

    await signUp('a@b.com', 'pass', 'alice');

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pass',
      options: { data: { username: 'alice' } },
    });
  });
});

describe('signIn', () => {
  it('returns user and session on success', async () => {
    const user = { id: 'u1' };
    const session = { access_token: 'tok' };
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { user, session }, error: null });

    const result = await signIn('a@b.com', 'pass');

    expect(result.user).toEqual(user);
    expect(result.session).toEqual(session);
    expect(result.error).toBeNull();
  });

  it('returns error on bad credentials', async () => {
    const err = new Error('Invalid login');
    supabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: err });

    const result = await signIn('a@b.com', 'wrong');

    expect(result.user).toBeNull();
    expect(result.error).toBe(err);
  });
});

describe('signOut', () => {
  it('returns null error on success', async () => {
    supabase.auth.signOut.mockResolvedValue({ error: null });

    const result = await signOut();

    expect(result.error).toBeNull();
  });

  it('returns error when Supabase sign-out fails', async () => {
    const err = new Error('Network error');
    supabase.auth.signOut.mockResolvedValue({ error: err });

    const result = await signOut();

    expect(result.error).toBe(err);
  });
});

describe('getCurrentSession', () => {
  it('returns session when one exists', async () => {
    const session = { access_token: 'tok' };
    supabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });

    const result = await getCurrentSession();

    expect(result.session).toEqual(session);
    expect(result.error).toBeNull();
  });

  it('returns null session with error when getSession fails', async () => {
    const err = new Error('Token expired');
    supabase.auth.getSession.mockResolvedValue({ data: {}, error: err });

    const result = await getCurrentSession();

    expect(result.session).toBeNull();
    expect(result.error).toBe(err);
  });
});

describe('getUserProfile', () => {
  it('returns profile data on success', async () => {
    const profile = { id: 'u1', username: 'alice' };
    const chain = makeChain({ data: profile, error: null });
    supabase.from.mockReturnValue(chain);

    const result = await getUserProfile('u1');

    expect(result.profile).toEqual(profile);
    expect(result.error).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('users');
  });

  it('returns error when user is not found', async () => {
    const err = new Error('Not found');
    const chain = makeChain({ data: null, error: err });
    supabase.from.mockReturnValue(chain);

    const result = await getUserProfile('missing');

    expect(result.profile).toBeNull();
    expect(result.error).toBe(err);
  });
});

describe('getUserStats', () => {
  it('returns stats for both cube sizes', async () => {
    const stats2 = { num_solves: 5, avg_solve: 12.3 };
    const stats3 = { num_solves: 10, avg_solve: 25.6 };
    const single = vi.fn()
      .mockResolvedValueOnce({ data: stats2, error: null })
      .mockResolvedValueOnce({ data: stats3, error: null });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    supabase.from.mockReturnValue({ select });

    const result = await getUserStats('u1');

    expect(result.twoByTwo).toEqual(stats2);
    expect(result.threeByThree).toEqual(stats3);
  });

  it('returns null for a size when that query errors', async () => {
    const err = new Error('No rows');
    const single = vi.fn()
      .mockResolvedValueOnce({ data: null, error: err })
      .mockResolvedValueOnce({ data: { num_solves: 3 }, error: null });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    supabase.from.mockReturnValue({ select });

    const result = await getUserStats('u1');

    expect(result.twoByTwo).toBeNull();
    expect(result.threeByThree).toEqual({ num_solves: 3 });
  });
});

describe('deleteAccount', () => {
  it('signs out and returns no error on success', async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    supabase.auth.signOut.mockResolvedValue({ error: null });

    const result = await deleteAccount('u1');

    expect(result.error).toBeNull();
    expect(supabase.rpc).toHaveBeenCalledWith('delete_account', { p_user_id: 'u1' });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('returns error without signing out when RPC fails', async () => {
    const err = new Error('RPC failed');
    supabase.rpc.mockResolvedValue({ error: err });

    const result = await deleteAccount('u1');

    expect(result.error).toBe(err);
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });
});
