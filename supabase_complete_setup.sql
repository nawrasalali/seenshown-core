-- ═══════════════════════════════════════════════════════════════════
-- SEENSHOWN — COMPLETE DATABASE SETUP
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ── PROFILES TABLE ──
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  tier TEXT DEFAULT 'free',        -- free | scholar | studio | institutional | admin
  points INTEGER DEFAULT 0,
  sims_created INTEGER DEFAULT 0,
  weekly_sims_used INTEGER DEFAULT 0,
  weekly_reset_date TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin reads all" ON profiles;

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin reads all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- ── SIMULATIONS TABLE ──
CREATE TABLE IF NOT EXISTS simulations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  domain TEXT,
  narration JSONB,
  is_public BOOLEAN DEFAULT true,
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public sims readable" ON simulations;
DROP POLICY IF EXISTS "Anyone can create sim" ON simulations;

CREATE POLICY "Public sims readable" ON simulations
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Anyone can create sim" ON simulations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owner can update sim" ON simulations
  FOR UPDATE USING (auth.uid() = user_id);

-- ── SIMULATION COMMENTS ──
CREATE TABLE IF NOT EXISTS simulation_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sim_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT DEFAULT 'Guest',
  text TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE simulation_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read comments" ON simulation_comments;
DROP POLICY IF EXISTS "Anyone can post comments" ON simulation_comments;

CREATE POLICY "Anyone can read comments" ON simulation_comments
  FOR SELECT USING (true);

CREATE POLICY "Anyone can post comments" ON simulation_comments
  FOR INSERT WITH CHECK (true);

-- ── POINT TRANSACTIONS ──
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  amount INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own transactions" ON point_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON point_transactions
  FOR INSERT WITH CHECK (true);

-- ── INVESTOR REGISTRATIONS ──
CREATE TABLE IF NOT EXISTS investor_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  package TEXT,
  amount_aud NUMERIC,
  safe_signed BOOLEAN DEFAULT false,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── AUTO-CREATE PROFILE ON SIGNUP ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url, tier, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    'free',
    (NEW.email = 'nawraselali@gmail.com') -- Admin
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        is_admin = (NEW.email = 'nawraselali@gmail.com');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── MAKE nawraselali@gmail.com ADMIN ──
-- (Run after you have signed in at least once)
UPDATE public.profiles
SET tier = 'admin', is_admin = true, points = 999999
WHERE email = 'nawraselali@gmail.com';

-- If profile doesn't exist yet (you haven't signed in), this inserts it:
INSERT INTO public.profiles (user_id, email, full_name, tier, is_admin, points)
SELECT id, email, email, 'admin', true, 999999
FROM auth.users
WHERE email = 'nawraselali@gmail.com'
ON CONFLICT (user_id) DO UPDATE
  SET tier = 'admin', is_admin = true, points = 999999;

-- ── ADMIN VIEW (for founder dashboard) ──
CREATE OR REPLACE VIEW admin_overview AS
SELECT
  COUNT(*) FILTER (WHERE tier = 'free') AS free_users,
  COUNT(*) FILTER (WHERE tier != 'free' AND tier != 'admin') AS paid_users,
  COUNT(*) FILTER (WHERE is_admin = true) AS admins,
  SUM(points) AS total_points,
  COUNT(*) AS total_users
FROM profiles;

-- Grant access to authenticated users who are admin
CREATE OR REPLACE VIEW public_simulations AS
SELECT s.*, p.email AS creator_email, p.full_name AS creator_name
FROM simulations s
LEFT JOIN profiles p ON s.user_id = p.user_id
WHERE s.is_public = true
ORDER BY s.created_at DESC;

-- ── INDEXES FOR PERFORMANCE ──
CREATE INDEX IF NOT EXISTS idx_simulations_user ON simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_simulations_public ON simulations(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_sim ON simulation_comments(sim_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON simulation_comments(created_at DESC);

