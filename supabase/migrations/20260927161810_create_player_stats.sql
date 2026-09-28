/*
# Create chess_player_stats table for persistent stats and leaderboard

1. New Tables
- `chess_player_stats`
  - `id` (uuid, primary key) — unique player record
  - `player_id` (text, unique, not null) — anonymous player identifier (stored in localStorage, generated client-side)
  - `display_name` (text, not null) — player's chosen name for the leaderboard
  - `points` (integer, not null, default 0) — total chess points
  - `wins` (integer, not null, default 0)
  - `losses` (integer, not null, default 0)
  - `draws` (integer, not null, default 0)
  - `games_played` (integer, not null, default 0)
  - `current_streak` (integer, not null, default 0)
  - `best_streak` (integer, not null, default 0)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

2. Security
- Enable RLS on `chess_player_stats`.
- This app has no sign-in, so allow anon + authenticated CRUD.
- The player_id (stored locally in the browser) acts as the ownership key — anyone can read all rows (for the leaderboard), but writes are open since there's no auth.
*/

CREATE TABLE IF NOT EXISTS chess_player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id text UNIQUE NOT NULL,
  display_name text NOT NULL DEFAULT 'Anonymous',
  points integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  games_played integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chess_player_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_player_stats" ON chess_player_stats;
CREATE POLICY "anon_select_player_stats" ON chess_player_stats FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_player_stats" ON chess_player_stats;
CREATE POLICY "anon_insert_player_stats" ON chess_player_stats FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_player_stats" ON chess_player_stats;
CREATE POLICY "anon_update_player_stats" ON chess_player_stats FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_player_stats" ON chess_player_stats;
CREATE POLICY "anon_delete_player_stats" ON chess_player_stats FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_chess_player_stats_points ON chess_player_stats(points DESC);
