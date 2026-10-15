-- ==============================================================================
-- MONER-JUI EXPANDED DATABASE SCHEMA
-- Adds patient profile fields & 8 daily tasks tracking with progress graphs
-- ==============================================================================

-- 1. Create or update the 'users' table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'player',      -- 'player' or 'host'
    -- Patient medical & emergency fields from Setup Patient Profile form
    age TEXT DEFAULT '65 yrs',
    gender TEXT DEFAULT 'Other',
    dementia_stage TEXT DEFAULT 'Early Stage (MCI)',
    disease_description TEXT DEFAULT '',
    caretaker_phone TEXT DEFAULT '',
    doctor_name TEXT DEFAULT '',
    doctor_phone TEXT DEFAULT '',
    total_points INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure index on username
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- 2. Create the 'game_sessions' table (with level tracking)
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    player_name TEXT NOT NULL,
    game_id TEXT NOT NULL,           -- 'memory-match' or 'remember-order'
    game_title TEXT NOT NULL,        -- 'Memory Match' or 'Remember the Order'
    game_level INTEGER DEFAULT 1,    -- Level 1 (Easy), Level 2 (Medium), Level 3 (Mastery)
    points_earned INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    total_moves INTEGER DEFAULT 0,
    accuracy_percentage NUMERIC DEFAULT 100.0,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create the 'daily_tasks' table (8 daily tasks per patient per date)
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    player_name TEXT NOT NULL,
    task_date DATE DEFAULT CURRENT_DATE,
    task_index INTEGER NOT NULL,     -- 0 to 7 (8 tasks)
    task_title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    UNIQUE(username, task_date, task_index)
);

-- 4. Pre-seed Host account (Abhishek Kawarkhe / Monerpass@123)
INSERT INTO public.users (username, password, full_name, role)
VALUES ('Abhishek Kawarkhe', 'Monerpass@123', 'Abhishek Kawarkhe', 'host')
ON CONFLICT (username) DO UPDATE 
SET password = EXCLUDED.password, role = 'host';

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;

-- Ensure username column exists in game_sessions
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS username TEXT;

-- Clean existing policies
DROP POLICY IF EXISTS "Allow public read access on users" ON public.users;
DROP POLICY IF EXISTS "Allow public insert on users" ON public.users;
DROP POLICY IF EXISTS "Allow public update on users" ON public.users;
DROP POLICY IF EXISTS "Allow public delete on users" ON public.users;

DROP POLICY IF EXISTS "Allow public read access on game_sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Allow public insert on game_sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Allow public delete on game_sessions" ON public.game_sessions;

DROP POLICY IF EXISTS "Allow public all on daily_tasks" ON public.daily_tasks;

-- Policies on users
CREATE POLICY "Allow public read access on users" ON public.users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert on users" ON public.users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update on users" ON public.users FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow public delete on users" ON public.users FOR DELETE TO anon, authenticated USING (true);

-- Policies on game_sessions
CREATE POLICY "Allow public read access on game_sessions" ON public.game_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert on game_sessions" ON public.game_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public delete on game_sessions" ON public.game_sessions FOR DELETE TO anon, authenticated USING (true);

-- Policies on daily_tasks
CREATE POLICY "Allow public all on daily_tasks" ON public.daily_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'users') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'game_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'daily_tasks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_tasks;
  END IF;
END $$;
