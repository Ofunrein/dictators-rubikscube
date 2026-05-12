/**
 * supabase.ts — Supabase client singleton
 *
 * Creates and exports a single shared Supabase client used throughout the
 * frontend for auth and database queries. Centralizing it here prevents
 * multiple client instances, which would create separate connection pools
 * and desync auth state.
 *
 * Key exports:
 *   - supabase — the configured SupabaseClient instance
 *
 * Connection credentials (URL + anon key) come from VITE_ environment
 * variables. Missing variables log a warning and cause API calls to return
 * a structured error instead of throwing, so the UI degrades gracefully.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;
const supabaseAnonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file or Vercel project settings.'
  );
}

const missingEnvError = () => {
  const error = new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  (error as Error & { code: string }).code = 'ENV_MISSING';
  return { data: null, error };
};

export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey
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
    } as unknown as SupabaseClient;
