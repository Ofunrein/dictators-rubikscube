/**
 * stats.js — Supabase stats and leaderboard service
 *
 * Fetches leaderboard data from the database functions and user stats.
 * Also saves solve results when a timed solve completes.
 */
import { supabase } from './supabase';

/**
 * Get the leaderboard for a given cube size and stat type.
 *
 * @param {string} size - '2x2' or '3x3'
 * @param {string} statType - 'fastest', 'avg', or 'solves'
 * @param {number} limit - number of results (10, 50, 100)
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getLeaderboard(size, statType = 'avg', limit = 10) {
  // Determine which table and column to query based on size and stat type
  const statsTable = size === '2x2' ? 'two_by_two_user_stats' : 'three_by_three_user_stats';
  const orderColumn = statType === 'fastest' ? 'fastest_solve'
    : statType === 'solves' ? 'num_solves'
    : 'avg_solve';
  const orderDirection = statType === 'solves' ? 'DESC.NULLS LAST' : 'ASC.NULLS LAST';

  // Use the Supabase RPC function to get leaderboard data.
  // The RPC functions should be set to SECURITY DEFINER in the database
  // so they work for both authenticated and unauthenticated users.
  // If they are SECURITY INVOKER, they will only return data for
  // authenticated users due to RLS policies on the underlying tables.
  const statSuffix = statType === 'solves' ? 'num_solves' : statType;
  const functionName = `get_leaderboard_${statSuffix}_${size}`;

  const { data, error } = await supabase.rpc(functionName, {
    p_limit: limit,
  });

  if (error) {
    // Fallback: try a direct query if the RPC fails (e.g., due to permissions)
    const { data: fallbackData, error: fallbackError } = await supabase
      .from(statsTable)
      .select('id, num_solves, avg_solve, fastest_solve')
      .gt('num_solves', 0)
      .order(orderColumn, { ascending: orderDirection.startsWith('ASC') })
      .limit(limit);

    if (fallbackError) return { data: [], error: fallbackError };

    // Fetch usernames for the returned user IDs
    const userIds = fallbackData.map(row => row.id);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username')
      .in('id', userIds);

    if (usersError) return { data: [], error: usersError };

    const usernameMap = {};
    if (users) {
      users.forEach(u => { usernameMap[u.id] = u.username; });
    }

    const entries = fallbackData.map((row, index) => ({
      rank: index + 1,
      username: usernameMap[row.id] || 'Unknown',
      value: row[orderColumn],
    }));

    return { data: entries, error: null };
  }

  // Filter out rows where the stat value is 0 (no solves recorded)
  // then map to the shape the LeaderboardPage expects.
  const filtered = data.filter((row) => {
    const val = row.value ?? row.fastest_solve ?? row.avg_solve ?? row.num_solves;
    return val !== null && val !== undefined && Number(val) > 0;
  });

  const entries = filtered.map((row, index) => ({
    rank: index + 1,
    username: row.username,
    value: row.value ?? row.fastest_solve ?? row.avg_solve ?? row.num_solves,
  }));

  return { data: entries, error: null };
}

/**
 * Get a user's ranks for a given size.
 * Returns all three ranks (fastest, avg, solves) in one call.
 *
 * @param {string} userId - The user's UUID
 * @param {string} size - '2x2' or '3x3'
 * @returns {Promise<{ranks: {fastest: number|null, avg: number|null, solves: number|null}|null, error: Error|null}>}
 */
export async function getUserRanks(userId, size) {
  const functionName =
    size === '2x2' ? 'get_user_rank_2x2' : 'get_user_rank_3x3';

  const { data, error } = await supabase.rpc(functionName, {
    p_user_id: userId,
  });

  if (error) return { ranks: null, error };

  // data is an array with one row: [{ fastest_rank, avg_rank, solves_rank }]
  // or empty array if user has no solves
  if (!data || data.length === 0) {
    return { ranks: { fastest: null, avg: null, solves: null }, error: null };
  }

  return {
    ranks: {
      fastest: Number(data[0].fastest_rank),
      avg: Number(data[0].avg_rank),
      solves: Number(data[0].solves_rank),
    },
    error: null,
  };
}

/**
 * Save a solve result to the user's stats using the server-side
 * record_solve RPC function.
 *
 * @param {string} userId - The user's UUID
 * @param {string} size - '2x2' or '3x3'
 * @param {number} solveTimeMs - The solve time in milliseconds
 * @returns {Promise<{error: Error|null}>}
 */
export async function saveSolveResult(userId, size, solveTimeMs) {
  const functionName =
    size === '2x2' ? 'record_solve_2x2' : 'record_solve_3x3';

  const solveTimeSeconds = solveTimeMs / 1000;

  const { error } = await supabase.rpc(functionName, {
    p_user_id: userId,
    p_solve_time: solveTimeSeconds,
  });

  if (error) return { error };
  return { error: null };
}
