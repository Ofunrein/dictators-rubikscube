/**
 * stats.ts — Supabase stats and leaderboard service
 */
import { supabase } from './supabase';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  value: number | null;
}

export async function getLeaderboard(
  size: string,
  statType: string = 'avg',
  limit: number = 10,
): Promise<{ data: LeaderboardEntry[]; error: Error | null }> {
  const statsTable = size === '2x2' ? 'two_by_two_user_stats' : 'three_by_three_user_stats';
  const orderColumn = statType === 'fastest' ? 'fastest_solve'
    : statType === 'solves' ? 'num_solves'
    : 'avg_solve';
  const orderDirection = statType === 'solves' ? 'DESC.NULLS LAST' : 'ASC.NULLS LAST';

  const statSuffix = statType === 'solves' ? 'num_solves' : statType;
  const functionName = `get_leaderboard_${statSuffix}_${size}`;

  const { data, error } = await supabase.rpc(functionName, {
    p_limit: limit,
  });

  if (error) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from(statsTable)
      .select('id, num_solves, avg_solve, fastest_solve')
      .gt('num_solves', 0)
      .order(orderColumn, { ascending: orderDirection.startsWith('ASC') })
      .limit(limit);

    if (fallbackError) return { data: [], error: fallbackError as Error };

    const fallbackRows = fallbackData as Array<Record<string, unknown>>;
    const userIds = fallbackRows.map(row => row['id'] as string);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username')
      .in('id', userIds);

    if (usersError) return { data: [], error: usersError as Error };

    const usernameMap: Record<string, string> = {};
    if (users) {
      (users as Array<{ id: string; username: string }>).forEach(u => { usernameMap[u.id] = u.username; });
    }

    const entries: LeaderboardEntry[] = fallbackRows.map((row, index) => ({
      rank: index + 1,
      username: usernameMap[row['id'] as string] || 'Unknown',
      value: row[orderColumn] as number | null,
    }));

    return { data: entries, error: null };
  }

  const rows = data as Array<Record<string, unknown>>;
  const filtered = rows.filter((row) => {
    const val = row['value'] ?? row['fastest_solve'] ?? row['avg_solve'] ?? row['num_solves'];
    return val !== null && val !== undefined && Number(val) > 0;
  });

  const entries: LeaderboardEntry[] = filtered.map((row, index) => ({
    rank: index + 1,
    username: row['username'] as string,
    value: (row['value'] ?? row['fastest_solve'] ?? row['avg_solve'] ?? row['num_solves']) as number | null,
  }));

  return { data: entries, error: null };
}

export async function getUserRanks(
  userId: string,
  size: string,
): Promise<{ ranks: { fastest: number | null; avg: number | null; solves: number | null } | null; error: Error | null }> {
  const functionName =
    size === '2x2' ? 'get_user_rank_2x2' : 'get_user_rank_3x3';

  const { data, error } = await supabase.rpc(functionName, {
    p_user_id: userId,
  });

  if (error) return { ranks: null, error: error as Error };

  const rows = data as Array<Record<string, unknown>>;
  if (!rows || rows.length === 0) {
    return { ranks: { fastest: null, avg: null, solves: null }, error: null };
  }

  return {
    ranks: {
      fastest: Number(rows[0]['fastest_rank']),
      avg: Number(rows[0]['avg_rank']),
      solves: Number(rows[0]['solves_rank']),
    },
    error: null,
  };
}

export async function saveSolveResult(
  userId: string,
  size: string,
  solveTimeMs: number,
): Promise<{ error: Error | null }> {
  const functionName =
    size === '2x2' ? 'record_solve_2x2' : 'record_solve_3x3';

  const solveTimeSeconds = solveTimeMs / 1000;

  const { error } = await supabase.rpc(functionName, {
    p_user_id: userId,
    p_solve_time: solveTimeSeconds,
  });

  if (error) return { error: error as Error };
  return { error: null };
}
