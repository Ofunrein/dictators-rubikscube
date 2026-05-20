-- Run this once in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/qgwmhhhzsvcsielcpbmt/sql/new

CREATE TABLE IF NOT EXISTS public.keepalive (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  touched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'cron',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.keepalive (id, source)
VALUES (1, 'migration')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.keepalive ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE (touched_at, source) ON public.keepalive TO anon;

CREATE POLICY "anon can update keepalive"
ON public.keepalive
FOR UPDATE
TO anon
USING (id = 1)
WITH CHECK (id = 1);
