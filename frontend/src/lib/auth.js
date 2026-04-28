/**
 * auth.js — Supabase authentication service
 *
 * All auth-related Supabase calls live here. The AuthContext calls these
 * functions rather than talking to Supabase directly.
 */
import { supabase } from './supabase';

/**
 * Sign up a new user.
 * Creates an auth user via Supabase Auth, then inserts a row into public.users.
 *
 * If email confirmation is enabled in Supabase, the user will need to confirm
 * their email before they can sign in. In that case, signUp returns a user
 * but no session — the AuthContext will show a confirmation message.
 *
 * Returns { user, session, error }.
 */
export async function signUp(email, password, username) {
  // 1. Create the auth user
  //    A database trigger (handle_new_user) automatically inserts a row into
  //    public.users when the auth user is created, so we don't need to do it
  //    manually from the client.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (authError) return { user: null, session: null, error: authError };
  if (!authData.user) return { user: null, session: null, error: new Error('Sign-up returned no user.') };

  return { user: authData.user, session: authData.session, error: null };
}

/**
 * Sign in with email and password.
 * Returns { user, session, error }.
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { user: null, session: null, error };
  return { user: data.user, session: data.session, error: null };
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the current session (e.g. on app mount to restore auth state).
 */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return { session: null, error };
  return { session: data.session, error: null };
}

/**
 * Fetch a user's profile from the public.users table.
 */
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return { profile: null, error };
  return { profile: data, error: null };
}

/**
 * Fetch a user's stats from both stat tables.
 * Returns { twoByTwo, threeByThree } or null for each.
 */
export async function getUserStats(userId) {
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
    twoByTwo: err2 ? null : twoByTwo,
    threeByThree: err3 ? null : threeByThree,
  };
}

/**
 * Delete the current user's account.
 * Calls the delete_account Supabase function which should handle both
 * the data deletion and auth user deletion (via a trigger or the function itself).
 *
 * NOTE: The delete_account function needs to also delete the auth user,
 * or you'll need a separate server-side endpoint for that. If the function
 * only deletes DB rows, the auth user will remain.
 */
export async function deleteAccount(userId) {
  const { error: funcError } = await supabase.rpc('delete_account', {
    p_user_id: userId,
  });

  if (funcError) return { error: funcError };

  // Sign out locally after the account is deleted
  await supabase.auth.signOut();

  return { error: null };
}
