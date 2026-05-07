/**
 * auth.ts — Supabase authentication service
 */
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

export async function signUp(
  email: string,
  password: string,
  username: string,
): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (authError) return { user: null, session: null, error: authError as Error };
  if (!authData.user) return { user: null, session: null, error: new Error('Sign-up returned no user.') };

  return { user: authData.user, session: authData.session, error: null };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { user: null, session: null, error: error as Error };
  return { user: data.user, session: data.session, error: null };
}

export async function signOut(): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signOut();
  return { error: error as Error | null };
}

export async function getCurrentSession(): Promise<{ session: Session | null; error: Error | null }> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return { session: null, error: error as Error };
  return { session: data.session, error: null };
}

export async function getUserProfile(
  userId: string,
): Promise<{ profile: Record<string, unknown> | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return { profile: null, error: error as Error };
  return { profile: data as Record<string, unknown>, error: null };
}

export async function getUserStats(
  userId: string,
): Promise<{ twoByTwo: Record<string, unknown> | null; threeByThree: Record<string, unknown> | null }> {
  const { data: twoByTwo, error: err2 } = await supabase
    .from('two_by_two_user_stats')
    .select('*')
    .eq('id', userId)
    .single();

  const { data: threeByThree, error: err3 } = await supabase
    .from('three_by_three_user_stats')
    .select('*')
    .eq('id', userId)
    .single();

  return {
    twoByTwo: err2 ? null : (twoByTwo as Record<string, unknown>),
    threeByThree: err3 ? null : (threeByThree as Record<string, unknown>),
  };
}

export async function deleteAccount(userId: string): Promise<{ error: Error | null }> {
  const { error: funcError } = await supabase.rpc('delete_account', {
    p_user_id: userId,
  });

  if (funcError) return { error: funcError as Error };

  await supabase.auth.signOut();

  return { error: null };
}
