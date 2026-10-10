-- Random online matchmaking for Chess4fun guest players.
-- Pairing is performed atomically in a SECURITY DEFINER function so separate
-- browsers/devices can be matched without exposing the queue table directly.

create table if not exists public.chess_matchmaking_queue (
  player_id text primary key references public.chess_players(player_id) on delete cascade,
  display_name text not null default 'Player' check (char_length(trim(display_name)) between 1 and 20),
  status text not null default 'waiting' check (status in ('waiting', 'matched')),
  room_id uuid references public.chess_private_rooms(id) on delete set null,
  assigned_color text check (assigned_color in ('white', 'black')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'waiting' and room_id is null and assigned_color is null) or
         (status = 'matched' and room_id is not null and assigned_color is not null))
);

create index if not exists chess_matchmaking_waiting_idx
  on public.chess_matchmaking_queue (created_at)
  where status = 'waiting';

alter table public.chess_matchmaking_queue enable row level security;
revoke all on public.chess_matchmaking_queue from anon, authenticated;

create or replace function public.chess_find_random_opponent(p_player_id text, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me public.chess_matchmaking_queue%rowtype;
  v_opponent public.chess_matchmaking_queue%rowtype;
  v_room public.chess_private_rooms%rowtype;
  v_code text;
  v_my_color text;
begin
  if p_player_id is null or char_length(trim(p_player_id)) < 1 or char_length(trim(p_player_id)) > 128 then
    raise exception 'Invalid guest player ID';
  end if;

  select * into v_me from public.chess_matchmaking_queue where player_id = p_player_id;
  if found and v_me.status = 'matched' and v_me.room_id is not null then
    select * into v_room from public.chess_private_rooms where id = v_me.room_id;
    if found and v_room.status <> 'finished' then
      return jsonb_build_object('status', 'matched', 'room', to_jsonb(v_room), 'my_color', v_me.assigned_color);
    end if;
    delete from public.chess_matchmaking_queue where player_id = p_player_id;
  end if;

  delete from public.chess_matchmaking_queue
   where status = 'waiting' and updated_at < now() - interval '90 seconds';

  insert into public.chess_matchmaking_queue (player_id, display_name, status, room_id, assigned_color, updated_at)
  values (p_player_id, coalesce(nullif(left(trim(p_display_name), 20), ''), 'Player'), 'waiting', null, null, now())
  on conflict (player_id) do update
    set display_name = excluded.display_name,
        status = 'waiting',
        room_id = null,
        assigned_color = null,
        updated_at = now()
    where public.chess_matchmaking_queue.status <> 'matched';

  select * into v_me from public.chess_matchmaking_queue where player_id = p_player_id;
  if found and v_me.status = 'matched' and v_me.room_id is not null then
    select * into v_room from public.chess_private_rooms where id = v_me.room_id;
    if found and v_room.status <> 'finished' then
      return jsonb_build_object('status', 'matched', 'room', to_jsonb(v_room), 'my_color', v_me.assigned_color);
    end if;
  end if;

  select * into v_opponent
    from public.chess_matchmaking_queue
   where status = 'waiting'
     and player_id <> p_player_id
     and updated_at >= now() - interval '90 seconds'
   order by created_at asc
   for update skip locked
   limit 1;

  if not found then
    return jsonb_build_object('status', 'waiting');
  end if;

  v_my_color := case when random() < 0.5 then 'white' else 'black' end;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into public.chess_private_rooms (access_code, status, host_color, fen, move_history)
      values (v_code, 'active', case when v_my_color = 'white' then 'black' else 'white' end,
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', '')
      returning * into v_room;
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  update public.chess_matchmaking_queue
     set status = 'matched', room_id = v_room.id, assigned_color = v_my_color, updated_at = now()
   where player_id = p_player_id;
  update public.chess_matchmaking_queue
     set status = 'matched', room_id = v_room.id,
         assigned_color = case when v_my_color = 'white' then 'black' else 'white' end,
         updated_at = now()
   where player_id = v_opponent.player_id;

  return jsonb_build_object('status', 'matched', 'room', to_jsonb(v_room), 'my_color', v_my_color);
end;
$$;

create or replace function public.chess_cancel_random_matchmaking(p_player_id text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.chess_matchmaking_queue where player_id = p_player_id;
$$;

revoke all on function public.chess_find_random_opponent(text, text) from public;
revoke all on function public.chess_cancel_random_matchmaking(text) from public;
grant execute on function public.chess_find_random_opponent(text, text) to anon, authenticated;
grant execute on function public.chess_cancel_random_matchmaking(text) to anon, authenticated;

notify pgrst, 'reload schema';
