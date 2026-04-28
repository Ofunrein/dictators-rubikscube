-- ============================================================
-- Supabase Setup Script for "The Dictators" Rubik's Cube App
-- ============================================================
-- Run this entire script in the Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/qgwmhhhzsvcsielcpbmt/sql/new
-- ============================================================

-- 1. Create the public.users table (profile data for each auth user)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the 2x2 stats table
CREATE TABLE IF NOT EXISTS public.two_by_two_user_stats (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  num_solves BIGINT DEFAULT 0,
  avg_solve DOUBLE PRECISION DEFAULT 0,
  fastest_solve DOUBLE PRECISION DEFAULT 0
);

-- 3. Create the 3x3 stats table
CREATE TABLE IF NOT EXISTS public.three_by_three_user_stats (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  num_solves BIGINT DEFAULT 0,
  avg_solve DOUBLE PRECISION DEFAULT 0,
  fastest_solve DOUBLE PRECISION DEFAULT 0
);

-- 4. Create a trigger to auto-create a public.users row when a new auth user signs up
--    This is CRITICAL — without it, the client-side insert in auth.js will fail
--    because the auth user won't have a session yet when the insert runs.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Drop the trigger if it already exists, then create it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Create the delete_account function
--    Deletes the user's stats rows, profile row, and the auth user itself.
CREATE OR REPLACE FUNCTION public.delete_account(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Delete stats rows (cascade should handle this, but be explicit)
  DELETE FROM public.two_by_two_user_stats WHERE id = p_user_id;
  DELETE FROM public.three_by_three_user_stats WHERE id = p_user_id;
  -- Delete the user profile row
  DELETE FROM public.users WHERE id = p_user_id;
  -- Delete the auth user (this will cascade to public.users if FK is set up)
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- 6. Create leaderboard functions

-- 6a. 2x2 leaderboard (ordered by fastest solve)
CREATE OR REPLACE FUNCTION public.get_leaderboard_avg_2x2(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  username VARCHAR,
  fastest_solve DOUBLE PRECISION,
  avg_solve DOUBLE PRECISION,
  num_solves BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.username,
    s.fastest_solve,
    s.avg_solve,
    s.num_solves
  FROM public.two_by_two_user_stats s
  JOIN public.users u ON u.id = s.id
  WHERE s.num_solves > 0
  ORDER BY s.fastest_solve ASC
  LIMIT p_limit;
END;
$$;

-- 6b. 3x3 leaderboard (ordered by fastest solve)
CREATE OR REPLACE FUNCTION public.get_leaderboard_avg_3x3(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  username VARCHAR,
  fastest_solve DOUBLE PRECISION,
  avg_solve DOUBLE PRECISION,
  num_solves BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.username,
    s.fastest_solve,
    s.avg_solve,
    s.num_solves
  FROM public.three_by_three_user_stats s
  JOIN public.users u ON u.id = s.id
  WHERE s.num_solves > 0
  ORDER BY s.fastest_solve ASC
  LIMIT p_limit;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.two_by_two_user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.three_by_three_user_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts on re-run
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own 2x2 stats" ON public.two_by_two_user_stats;
DROP POLICY IF EXISTS "Users can update their own 2x2 stats" ON public.two_by_two_user_stats;
DROP POLICY IF EXISTS "Users can view their own 3x3 stats" ON public.three_by_three_user_stats;
DROP POLICY IF EXISTS "Users can update their own 3x3 stats" ON public.three_by_three_user_stats;

-- public.users policies
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- two_by_two_user_stats policies
CREATE POLICY "Users can view their own 2x2 stats"
  ON public.two_by_two_user_stats FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own 2x2 stats"
  ON public.two_by_two_user_stats FOR UPDATE
  USING (auth.uid() = id);

-- three_by_three_user_stats policies
CREATE POLICY "Users can view their own 3x3 stats"
  ON public.three_by_three_user_stats FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own 3x3 stats"
  ON public.three_by_three_user_stats FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================
-- IMPORTANT: Allow anonymous users to insert into public.users
-- during signup (before the session is fully established)
-- ============================================================
-- The trigger (handle_new_user) handles this automatically,
-- so the client-side insert in auth.js is actually redundant
-- when the trigger exists. But having both doesn't hurt.
--
-- If you want to keep the client-side insert in auth.js,
-- you need this policy to allow inserts during signup:
DROP POLICY IF EXISTS "Allow insert during signup" ON public.users;
CREATE POLICY "Allow insert during signup"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- VERIFICATION QUERIES (run these to confirm setup)
-- ============================================================
-- SELECT * FROM public.users;
-- SELECT * FROM public.two_by_two_user_stats;
-- SELECT * FROM public.three_by_three_user_stats;
-- SELECT * FROM auth.users;