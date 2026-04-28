/**
 * stats.js — Supabase stats and leaderboard service
 *
 * Fetches leaderboard data from the database functions and user stats.
 * Also saves solve results when a timed solve completes.
 */
import { supabase } from './supabase';

/**
 * Get the leaderboard for a given cube size, ordered by average solve time.
 *
 * @param {string} size - '2x2' or '3x3'
 * @param {number} limit - number of results (10, 50, 100)
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getLeaderboard(size, limit = 10) {
  const functionName =
    size === '2x2' ? 'get_leaderboard_avg_2x2' : 'get_leaderboard_avg_3x3';

  const { data, error } = await supabase.rpc(functionName, {
    p_limit: limit,
  });

  if (error) return { data: null, error };

  // Map the returned rows to the shape the LeaderboardPage expects.
  // Rank is computed from the array index (1-based).
  const entries = data.map((row, index) => ({
    rank: index + 1,
    username: row.username,
    value: row.avg_solve,
  }));

  return { data: entries, error: null };
}

/**
 * Save a solve result to the user's stats.
 * Upserts the stats row for the given cube size — if the row doesn't exist,
 * it creates one; if it does, it updates num_solves, avg_solve, and fastest_solve.
 *
 * @param {string} userId - The user's UUID
 * @param {string} size - '2x2' or '3x3'
 * @param {number} solveTimeMs - The solve time in milliseconds
 * @returns {Promise<{error: Error|null}>}
 */
export async function saveSolveResult(userId, size, solveTimeMs) {
  const tableName =
    size === '2x2' ? 'two_by_two_user_stats' : 'three_by_three_user_stats';

  const solveTimeSeconds = solveTimeMs / 1000;

  // First, get the current stats for this user and size
  const { data: currentStats, error: fetchError } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 = row not found, which is fine for first solve
    return { error: fetchError };
  }

  const numSolves = currentStats ? Number(currentStats.num_solves) + 1 : 1;
  const currentAvg = currentStats ? Number(currentStats.avg_solve) : 0;
  const currentFastest = currentStats ? Number(currentStats.fastest_solve) : Infinity;

  // Calculate new average: (old_avg * old_count + new_time) / new_count
  const newAvg = currentStats
    ? (currentAvg * (numSolves - 1) + solveTimeSeconds) / numSolves
    : solveTimeSeconds;

  // Fastest is the minimum of current fastest and new solve time
  const newFastest = Math.min(currentFastest, solveTimeSeconds);

  // Upsert: insert or update the stats row
  const { error: upsertError } = await supabase.from(tableName).upsert(
    {
      id: userId,
      num_solves: numSolves,
      avg_solve: newAvg,
      fastest_solve: newFastest,
    },
    { onConflict: 'id' }
  );

  if (upsertError) return { error: upsertError };

  return { error: null };
}