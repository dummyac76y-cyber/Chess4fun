-- Chess4fun guest profiles, public leaderboard, and online room storage.
-- Guest mode avoids email/password authentication; public write policies mean scores
-- and room data are not tamper-proof. Use Supabase Auth + server-validated scores
-- before treating rankings as competitive or trusted.

create table if not exists public.chess_players (
  player_id text primary key check (char_length(trim(player_id)) between 1 and 128),
  display_name text not null default 'Player' check (char_length(trim(display_name)) between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chess_player_stats (
  id uuid primary key default gen_random_uuid(),
  player_id text not null unique references public.chess_players(player_id) on delete cascade,
  display_name text not null default 'Player' check (char_length(trim(display_name)) between 1 and 20),
  points integer not null default 0 check (points >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  draws integer not null default 0 check (draws >= 0),
  games_played integer not null default 0 check (games_played >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chess_private_rooms (
  id uuid primary key default gen_random_uuid(),
  access_code text not null unique check (access_code = upper(trim(access_code)) and char_length(access_code) between 4 and 12),
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  move_history text not null default '',
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  host_color text not null default 'white' check (host_color in ('white', 'black')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chess_player_stats_leaderboard_idx
  on public.chess_player_stats (points desc, wins desc, games_played desc);
create index if not exists chess_private_rooms_status_idx
  on public.chess_private_rooms (status, updated_at desc);

alter table public.chess_players enable row level security;
alter table public.chess_player_stats enable row level security;
alter table public.chess_private_rooms enable row level security;

drop policy if exists "Guest players are publicly readable" on public.chess_players;
create policy "Guest players are publicly readable" on public.chess_players for select to anon, authenticated using (true);
drop policy if exists "Guest players can be created" on public.chess_players;
create policy "Guest players can be created" on public.chess_players for insert to anon, authenticated with check (true);
drop policy if exists "Guest players can be updated" on public.chess_players;
create policy "Guest players can be updated" on public.chess_players for update to anon, authenticated using (true) with check (true);

drop policy if exists "Leaderboard is publicly readable" on public.chess_player_stats;
create policy "Leaderboard is publicly readable" on public.chess_player_stats for select to anon, authenticated using (true);
drop policy if exists "Guest stats can be created" on public.chess_player_stats;
create policy "Guest stats can be created" on public.chess_player_stats for insert to anon, authenticated with check (true);
drop policy if exists "Guest stats can be updated" on public.chess_player_stats;
create policy "Guest stats can be updated" on public.chess_player_stats for update to anon, authenticated using (true) with check (true);

drop policy if exists "Rooms are publicly readable" on public.chess_private_rooms;
create policy "Rooms are publicly readable" on public.chess_private_rooms for select to anon, authenticated using (true);
drop policy if exists "Rooms can be created" on public.chess_private_rooms;
create policy "Rooms can be created" on public.chess_private_rooms for insert to anon, authenticated with check (true);
drop policy if exists "Rooms can be updated" on public.chess_private_rooms;
create policy "Rooms can be updated" on public.chess_private_rooms for update to anon, authenticated using (true) with check (true);
drop policy if exists "Rooms can be deleted" on public.chess_private_rooms;
create policy "Rooms can be deleted" on public.chess_private_rooms for delete to anon, authenticated using (true);

grant select, insert, update on public.chess_players to anon, authenticated;
grant select, insert, update on public.chess_player_stats to anon, authenticated;
grant select, insert, update, delete on public.chess_private_rooms to anon, authenticated;

notify pgrst, 'reload schema';
