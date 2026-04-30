/**
 * supabase.js — Supabase client singleton
 *
 * Initializes the Supabase client using Vite environment variables.
 * These are set in Vercel (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 * and can also be placed in a local .env file for development.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file or Vercel project settings.'
  );
}

// Create a stub client that returns errors for all requests when env vars are missing,
// rather than making requests to a non-existent placeholder domain.
const missingEnvError = () => {
  const error = new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  error.code = 'ENV_MISSING';
  return { data: null, error };
};

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      rpc: () => Promise.resolve(missingEnvError()),
      from: () => ({
        select: () => ({
          gt: () => ({
            order: () => ({
              limit: () => Promise.resolve(missingEnvError()),
              in: () => Promise.resolve(missingEnvError()),
            }),
          }),
          in: () => Promise.resolve(missingEnvError()),
        }),
      }),
      auth: {
        getUser: () => Promise.resolve(missingEnvError()),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithOAuth: () => Promise.resolve(missingEnvError()),
        signOut: () => Promise.resolve({ error: null }),
      },
    };
