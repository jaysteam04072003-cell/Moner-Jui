-- ==============================================================================
-- MONER-JUI CLEAN DATABASE SCHEMA (WITH USERNAME & PASSWORD AUTH)
-- Run this script in your Supabase SQL Editor
-- ==============================================================================

-- 1. Create the 'users' table (Stores username & password)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'player',      -- 'player' or 'host'
    total_points INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    notes TEXT DEFAULT 'Active participant',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure index on username for quick lookup
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- 2. Create the 'game_sessions' table
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    player_name TEXT NOT NULL,
    game_id TEXT NOT NULL,           -- 'memory-match' or 'remember-order'
    game_title TEXT NOT NULL,        -- 'Memory Match' or 'Remember the Order'
    points_earned INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    total_moves INTEGER DEFAULT 0,
    accuracy_percentage NUMERIC DEFAULT 100.0,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Pre-seed the Host account (Abhishek Kawarkhe / Monerpass@123)
INSERT INTO public.users (username, password, full_name, role, notes)
VALUES ('Abhishek Kawarkhe', 'Monerpass@123', 'Abhishek Kawarkhe', 'host', 'Primary Host / Caregiver Administrator')
ON CONFLICT (username) DO UPDATE 
SET password = EXCLUDED.password, role = 'host';

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Drop previous policies to avoid conflict
DROP POLICY IF EXISTS "Allow public read access on users" ON public.users;
DROP POLICY IF EXISTS "Allow public insert on users" ON public.users;
DROP POLICY IF EXISTS "Allow public update on users" ON public.users;
DROP POLICY IF EXISTS "Allow public read access on game_sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Allow public insert on game_sessions" ON public.game_sessions;

-- Policies for users table
CREATE POLICY "Allow public read access on users"
ON public.users FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert on users"
ON public.users FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public update on users"
ON public.users FOR UPDATE
TO anon, authenticated
USING (true);

-- Policies for game_sessions table
CREATE POLICY "Allow public read access on game_sessions"
ON public.game_sessions FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert on game_sessions"
ON public.game_sessions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 5. Realtime publications for instant host monitoring
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
  END IF;
END $$;
