/*
# Create chess_private_rooms table

1. New Tables
- `chess_private_rooms`
  - `id` (uuid, primary key) — unique room identifier
  - `access_code` (text, unique, not null) — 6-character alphanumeric code players share to join
  - `fen` (text, not null) — current board state in FEN notation (starts as standard chess starting position)
  - `move_history` (text, not null) — comma-separated SAN moves
  - `status` (text, not null) — 'waiting', 'active', 'finished'
  - `host_color` (text, not null) — 'white' or 'black' (the color the room creator plays)
  - `created_at` (timestamp) — when the room was created
  - `updated_at` (timestamp) — last move or status change

2. Security
- Enable RLS on `chess_private_rooms`.
- Since this app has no sign-in, allow anon + authenticated CRUD so the anon-key client can create/join/update rooms.
- Anyone with the access code can read, update, and delete a room (the code IS the access control).
*/

CREATE TABLE IF NOT EXISTS chess_private_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_code text UNIQUE NOT NULL,
  fen text NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  move_history text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'waiting',
  host_color text NOT NULL DEFAULT 'white',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chess_private_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rooms" ON chess_private_rooms;
CREATE POLICY "anon_select_rooms" ON chess_private_rooms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_rooms" ON chess_private_rooms;
CREATE POLICY "anon_insert_rooms" ON chess_private_rooms FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_rooms" ON chess_private_rooms;
CREATE POLICY "anon_update_rooms" ON chess_private_rooms FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_rooms" ON chess_private_rooms;
CREATE POLICY "anon_delete_rooms" ON chess_private_rooms FOR DELETE
  TO anon, authenticated USING (true);
