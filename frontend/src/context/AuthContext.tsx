/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signUp,
  signIn,
  signOut,
  getCurrentSession,
  getUserProfile,
  getUserStats,
  deleteAccount as deleteAccountApi,
} from '../lib/auth';

export interface UserStats {
  solves: number;
  solvesBySize: Record<string, number>;
  best: Record<string, unknown>;
  avg: Record<string, unknown>;
  ranks: Record<string, { fastest: number | null; average: number | null; solves: number | null }>;
}

export interface CurrentUser {
  id: string;
  username: string;
  email: string;
  joinedAt: string;
  stats: UserStats;
}

interface AuthContextValue {
  currentUser: CurrentUser | null;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  signup: (username: string, email: string, password: string) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  loading: boolean;
  refreshUserStats: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function buildCurrentUser(
  authUser: Record<string, unknown>,
  profile: Record<string, unknown> | null,
  stats: { twoByTwo: Record<string, unknown> | null; threeByThree: Record<string, unknown> | null },
): CurrentUser {
  const twoByTwo = stats.twoByTwo;
  const threeByThree = stats.threeByThree;

  const solvesBySize: Record<string, number> = {};
  if (twoByTwo) solvesBySize['2x2'] = Number(twoByTwo['num_solves']);
  if (threeByThree) solvesBySize['3x3'] = Number(threeByThree['num_solves']);

  const totalSolves = Object.values(solvesBySize).reduce((a, b) => a + b, 0);

  const best: Record<string, unknown> = {};
  if (twoByTwo) best['2x2'] = twoByTwo['fastest_solve'];
  if (threeByThree) best['3x3'] = threeByThree['fastest_solve'];

  const avg: Record<string, unknown> = {};
  if (twoByTwo) avg['2x2'] = twoByTwo['avg_solve'];
  if (threeByThree) avg['3x3'] = threeByThree['avg_solve'];

  return {
    id: authUser['id'] as string,
    username: (profile?.['username'] as string | undefined) || 'Unknown',
    email: (authUser['email'] as string | undefined) || (profile?.['email'] as string | undefined) || '',
    joinedAt: profile?.['created_at']
      ? new Date(profile['created_at'] as string).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserStats = useCallback(async () => {
    if (!currentUser) return;
    const { session } = await getCurrentSession();
    if (!session) return;
    const { profile } = await getUserProfile(session.user.id);
    const stats = await getUserStats(session.user.id);
    setCurrentUser(buildCurrentUser(session.user as unknown as Record<string, unknown>, profile, stats));
  }, [currentUser]);

  useEffect(() => {
    async function restore() {
      const { session, error } = await getCurrentSession();
      if (error || !session) {
        setLoading(false);
        return;
      }

      const { profile } = await getUserProfile(session.user.id);
      const stats = await getUserStats(session.user.id);
      setCurrentUser(buildCurrentUser(session.user as unknown as Record<string, unknown>, profile, stats));
      setLoading(false);
    }

    restore();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user, error } = await signIn(email, password);
    if (error) return { error };

    const { profile } = await getUserProfile(user!.id);
    const stats = await getUserStats(user!.id);
    setCurrentUser(buildCurrentUser(user as unknown as Record<string, unknown>, profile, stats));
    return { error: null };
  }, []);

  const signup = useCallback(async (username: string, email: string, password: string) => {
    const { user, session, error } = await signUp(email, password, username);
    if (error) return { error };

    if (!session) {
      return {
        error: new Error('Check your email for a confirmation link before signing in.'),
        needsEmailConfirmation: true,
      };
    }

    let profile: Record<string, unknown> | null = null;
    let stats: { twoByTwo: Record<string, unknown> | null; threeByThree: Record<string, unknown> | null } = { twoByTwo: null, threeByThree: null };
    for (let attempt = 0; attempt < 5; attempt++) {
      const profileResult = await getUserProfile(user!.id);
      if (profileResult.profile) {
        profile = profileResult.profile;
        stats = await getUserStats(user!.id);
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    setCurrentUser(buildCurrentUser(user as unknown as Record<string, unknown>, profile, stats));
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

export function useAuth(): AuthContextValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be inside AuthProvider');
  return v;
}
