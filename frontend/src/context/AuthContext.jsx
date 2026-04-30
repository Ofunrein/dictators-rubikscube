/**
 * AuthContext.jsx — Global authentication state for the app
 *
 * Wraps the entire app (see main.jsx) so any component can read the current
 * user or call login/signup/logout without prop drilling.
 *
 * On mount, checks for an existing Supabase session to restore auth state
 * across page refreshes. All auth functions now use real Supabase calls.
 *
 * Usage anywhere in the app:
 *   const { currentUser, login, signup, logout, deleteAccount, loading } = useAuth();
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signUp,
  signIn,
  signOut,
  getCurrentSession,
  getUserProfile,
  getUserStats,
  deleteAccount as deleteAccountApi,
} from '../lib/auth';

const AuthContext = createContext(null);

/**
 * Shape raw Supabase data into the currentUser structure the UI expects.
 */
function buildCurrentUser(authUser, profile, stats) {
  const twoByTwo = stats.twoByTwo;
  const threeByThree = stats.threeByThree;

  const solvesBySize = {};
  if (twoByTwo) solvesBySize['2x2'] = Number(twoByTwo.num_solves);
  if (threeByThree) solvesBySize['3x3'] = Number(threeByThree.num_solves);

  const totalSolves = Object.values(solvesBySize).reduce((a, b) => a + b, 0);

  const best = {};
  if (twoByTwo) best['2x2'] = twoByTwo.fastest_solve;
  if (threeByThree) best['3x3'] = threeByThree.fastest_solve;

  const avg = {};
  if (twoByTwo) avg['2x2'] = twoByTwo.avg_solve;
  if (threeByThree) avg['3x3'] = threeByThree.avg_solve;

  return {
    id: authUser.id,
    username: profile?.username || 'Unknown',
    email: authUser.email || profile?.email || '',
    joinedAt: profile?.created_at
      ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Recently',
    stats: {
      solves: totalSolves,
      solvesBySize,
      best,
      avg,
      ranks: {
        '3x3': { fastest: null, average: null, solves: null },
        '2x2': { fastest: null, average: null, solves: null },
      },
    },
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Expose a refresh function so components can update user stats after a solve
  const refreshUserStats = useCallback(async () => {
    if (!currentUser) return;
    const { session } = await getCurrentSession();
    if (!session) return;
    const { profile } = await getUserProfile(session.user.id);
    const stats = await getUserStats(session.user.id);
    setCurrentUser(buildCurrentUser(session.user, profile, stats));
  }, [currentUser]);

  // Restore session on mount
  useEffect(() => {
    async function restore() {
      const { session, error } = await getCurrentSession();
      if (error || !session) {
        setLoading(false);
        return;
      }

      const { profile } = await getUserProfile(session.user.id);
      const stats = await getUserStats(session.user.id);
      setCurrentUser(buildCurrentUser(session.user, profile, stats));
      setLoading(false);
    }

    restore();
  }, []);

  const login = useCallback(async (email, password) => {
    const { user, error } = await signIn(email, password);
    if (error) return { error };

    const { profile } = await getUserProfile(user.id);
    const stats = await getUserStats(user.id);
    setCurrentUser(buildCurrentUser(user, profile, stats));
    return { error: null };
  }, []);

  const signup = useCallback(async (username, email, password) => {
    const { user, session, error } = await signUp(email, password, username);
    if (error) return { error };

    // If email confirmation is required, session will be null.
    // The user needs to check their email before they can log in.
    if (!session) {
      return {
        error: new Error('Check your email for a confirmation link before signing in.'),
        needsEmailConfirmation: true,
      };
    }

    // Wait a moment for the database trigger to create the public.users row,
    // then fetch the profile. Retry a few times if the profile isn't ready yet.
    let profile = null;
    let stats = { twoByTwo: null, threeByThree: null };
    for (let attempt = 0; attempt < 5; attempt++) {
      const profileResult = await getUserProfile(user.id);
      if (profileResult.profile) {
        profile = profileResult.profile;
        stats = await getUserStats(user.id);
        break;
      }
      // Wait 500ms before retrying
      await new Promise(r => setTimeout(r, 500));
    }

    setCurrentUser(buildCurrentUser(user, profile, stats));
    return { error: null };
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setCurrentUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!currentUser) return { error: new Error('No user logged in.') };

    const { error } = await deleteAccountApi(currentUser.id);
    if (error) return { error };

    setCurrentUser(null);
    return { error: null };
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, login, signup, logout, deleteAccount, loading, refreshUserStats }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
