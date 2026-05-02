import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase.js', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

import { supabase } from './supabase.js';
import { getLeaderboard, getUserRanks, saveSolveResult } from './stats.js';

afterEach(() => vi.clearAllMocks());

describe('getLeaderboard', () => {
  it('returns ranked entries from a successful RPC call', async () => {
    const rpcData = [
      { username: 'alice', value: 8.5 },
      { username: 'bob', value: 12.1 },
    ];
    supabase.rpc.mockResolvedValue({ data: rpcData, error: null });

    const result = await getLeaderboard('3x3', 'avg', 10);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({ rank: 1, username: 'alice' });
    expect(result.data[1]).toMatchObject({ rank: 2, username: 'bob' });
  });

  it('filters out entries where value is 0', async () => {
    const rpcData = [
      { username: 'alice', value: 0 },
      { username: 'bob', value: 9.1 },
    ];
    supabase.rpc.mockResolvedValue({ data: rpcData, error: null });

    const result = await getLeaderboard('3x3', 'avg', 10);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].username).toBe('bob');
  });

  it('calls the correct RPC function for 2x2 fastest', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    await getLeaderboard('2x2', 'fastest', 10);

    expect(supabase.rpc).toHaveBeenCalledWith(
      'get_leaderboard_fastest_2x2',
      { p_limit: 10 },
    );
  });

  it('calls the correct RPC function for 3x3 solves', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    await getLeaderboard('3x3', 'solves', 50);

    expect(supabase.rpc).toHaveBeenCalledWith(
      'get_leaderboard_num_solves_3x3',
      { p_limit: 50 },
    );
  });

  it('falls back to direct query when RPC fails', async () => {
    const rpcError = new Error('RPC unavailable');
    supabase.rpc.mockResolvedValue({ data: null, error: rpcError });

    const fallbackRows = [{ id: 'u1', num_solves: 5, avg_solve: 20.0, fastest_solve: 15.0 }];
    const users = [{ id: 'u1', username: 'alice' }];

    const limitMock = vi.fn().mockResolvedValue({ data: fallbackRows, error: null });
    const orderMock = vi.fn(() => ({ limit: limitMock }));
    const gtMock = vi.fn(() => ({ order: orderMock }));
    const selectMock = vi.fn(() => ({ gt: gtMock }));
    const inMock = vi.fn().mockResolvedValue({ data: users, error: null });
    const selectUsersMock = vi.fn(() => ({ in: inMock }));

    supabase.from
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ select: selectUsersMock });

    const result = await getLeaderboard('3x3', 'avg', 10);

    expect(result.error).toBeNull();
    expect(result.data[0]).toMatchObject({ rank: 1, username: 'alice' });
  });

  it('returns empty array and error when both RPC and fallback fail', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: new Error('RPC failed') });

    const fallbackError = new Error('DB offline');
    const limitMock = vi.fn().mockResolvedValue({ data: null, error: fallbackError });
    const orderMock = vi.fn(() => ({ limit: limitMock }));
    const gtMock = vi.fn(() => ({ order: orderMock }));
    const selectMock = vi.fn(() => ({ gt: gtMock }));
    supabase.from.mockReturnValueOnce({ select: selectMock });

    const result = await getLeaderboard('3x3', 'avg', 10);

    expect(result.data).toEqual([]);
    expect(result.error).toBe(fallbackError);
  });
});

describe('getUserRanks', () => {
  it('returns fastest, avg, and solves ranks on success', async () => {
    const rankRow = { fastest_rank: '2', avg_rank: '5', solves_rank: '1' };
    supabase.rpc.mockResolvedValue({ data: [rankRow], error: null });

    const result = await getUserRanks('u1', '3x3');

    expect(result.error).toBeNull();
    expect(result.ranks).toEqual({ fastest: 2, avg: 5, solves: 1 });
  });

  it('calls get_user_rank_2x2 for 2x2 size', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    await getUserRanks('u1', '2x2');

    expect(supabase.rpc).toHaveBeenCalledWith('get_user_rank_2x2', { p_user_id: 'u1' });
  });

  it('returns null ranks when user has no solves', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    const result = await getUserRanks('u1', '3x3');

    expect(result.ranks).toEqual({ fastest: null, avg: null, solves: null });
    expect(result.error).toBeNull();
  });

  it('returns error when RPC fails', async () => {
    const err = new Error('Permission denied');
    supabase.rpc.mockResolvedValue({ data: null, error: err });

    const result = await getUserRanks('u1', '3x3');

    expect(result.ranks).toBeNull();
    expect(result.error).toBe(err);
  });
});

describe('saveSolveResult', () => {
  it('calls the correct RPC with solve time converted from ms to seconds', async () => {
    supabase.rpc.mockResolvedValue({ error: null });

    const result = await saveSolveResult('u1', '3x3', 15500);

    expect(result.error).toBeNull();
    expect(supabase.rpc).toHaveBeenCalledWith('record_solve_3x3', {
      p_user_id: 'u1',
      p_solve_time: 15.5,
    });
  });

  it('calls record_solve_2x2 for 2x2 solves', async () => {
    supabase.rpc.mockResolvedValue({ error: null });

    await saveSolveResult('u1', '2x2', 8000);

    expect(supabase.rpc).toHaveBeenCalledWith('record_solve_2x2', {
      p_user_id: 'u1',
      p_solve_time: 8,
    });
  });

  it('returns error when RPC fails', async () => {
    const err = new Error('Write failed');
    supabase.rpc.mockResolvedValue({ error: err });

    const result = await saveSolveResult('u1', '3x3', 10000);

    expect(result.error).toBe(err);
  });
});
