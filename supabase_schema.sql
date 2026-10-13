-- ==============================================================================
-- MONER-JUI (মনের জুঁই) IDEMPOTENT SUPABASE SCHEMA
-- Safe to run multiple times without "already exists" errors!
-- ==============================================================================

-- 1. Create the 'game_sessions' table
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_name TEXT NOT NULL,
    game_id TEXT NOT NULL,           -- 'memory-match' or 'remember-order'
    game_title TEXT NOT NULL,        -- 'Memory Match' or 'Remember the Order'
    points_earned INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    total_moves INTEGER DEFAULT 0,
    accuracy_percentage NUMERIC DEFAULT 100.0,
    status TEXT DEFAULT 'completed', -- 'completed', 'in-progress'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the 'player_profiles' table
CREATE TABLE IF NOT EXISTS public.player_profiles (
    player_name TEXT PRIMARY KEY,
    avatar_initial TEXT,
    total_points INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    last_played_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT DEFAULT 'Active participant'
);

-- 3. Seed default 4 profiles
INSERT INTO public.player_profiles (player_name, avatar_initial, total_points, games_played, notes)
VALUES 
    ('Lakshmi Devi', 'ल', 420, 4, 'Shows strong visual memory in flower matching'),
    ('Bimal Ghosh', 'বি', 350, 3, 'Enjoys sequential order games'),
    ('Suniti Sen', 'সু', 280, 2, 'Prefers calm and slow-paced play'),
    ('Ananda Roy', 'আ', 390, 4, 'Very consistent daily morning routine')
ON CONFLICT (player_name) DO NOTHING;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they already exist (so it won't throw Error 42710)
DROP POLICY IF EXISTS "Allow public read access on game_sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Allow public insert on game_sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Allow public read access on player_profiles" ON public.player_profiles;
DROP POLICY IF EXISTS "Allow public insert/update on player_profiles" ON public.player_profiles;

-- Recreate policies cleanly
CREATE POLICY "Allow public read access on game_sessions" 
ON public.game_sessions FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert on game_sessions" 
ON public.game_sessions FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Allow public read access on player_profiles" 
ON public.player_profiles FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Allow public insert/update on player_profiles" 
ON public.player_profiles FOR ALL 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- 5. Add to realtime publication safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'player_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.player_profiles;
  END IF;
END $$;
