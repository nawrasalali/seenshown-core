-- Run this in Supabase SQL Editor

-- Add columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sims_created INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_sims_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_reset_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Live rooms table
CREATE TABLE IF NOT EXISTS live_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT UNIQUE NOT NULL,
  host_a_domain TEXT,
  host_a_title TEXT,
  host_a_user_id UUID,
  host_b_domain TEXT,
  host_b_title TEXT,
  host_b_user_id UUID,
  status TEXT DEFAULT 'waiting', -- waiting | live | ended
  votes_a INTEGER DEFAULT 0,
  votes_b INTEGER DEFAULT 0,
  viewers INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE live_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read live rooms" ON live_rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can create live rooms" ON live_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update live rooms" ON live_rooms FOR UPDATE USING (true);

-- Enable Realtime on live_rooms
ALTER PUBLICATION supabase_realtime ADD TABLE live_rooms;

-- Points transactions table
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  amount INTEGER NOT NULL,
  type TEXT NOT NULL, -- vote | earn | purchase | refund
  ref_id TEXT, -- sim_id or room_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime on profiles
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Add columns needed for rate limiting and auth
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sims_today INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sims_today_date DATE,
  ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pro_rata_intent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pro_rata_registered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS investor_ref TEXT;

ALTER TABLE investor_registrations
  ADD COLUMN IF NOT EXISTS investor_ref TEXT,
  ADD COLUMN IF NOT EXISTS safe_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pro_rata_intent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS amount INTEGER DEFAULT 0;

-- Add email to point_transactions
ALTER TABLE point_transactions
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Comments on simulations
CREATE TABLE IF NOT EXISTS simulation_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sim_id UUID REFERENCES simulations(id),
  user_name TEXT,
  text TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE simulation_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read comments" ON simulation_comments FOR SELECT USING (true);
CREATE POLICY "Anyone can post comments" ON simulation_comments FOR INSERT WITH CHECK (true);
