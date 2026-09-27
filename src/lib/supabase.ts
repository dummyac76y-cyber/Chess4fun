import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    !supabaseUrl.includes('placeholder') &&
    Boolean(supabaseAnonKey) &&
    supabaseAnonKey !== 'placeholder'
  );
};

export interface PrivateRoom {
  id: string;
  access_code: string;
  fen: string;
  move_history: string;
  status: 'waiting' | 'active' | 'finished';
  host_color: 'white' | 'black';
  created_at: string;
  updated_at: string;
  is_local?: boolean;
}

export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export interface PlayerStatsRecord {
  id: string;
  player_id: string;
  display_name: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
  current_streak: number;
  best_streak: number;
  created_at: string;
  updated_at: string;
}

export function getOrCreatePlayerId(): string {
  let id = localStorage.getItem('chessPlayerId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('chessPlayerId', id);
  }
  return id;
}

export function getPlayerName(): string {
  return localStorage.getItem('chessPlayerName') || 'Anonymous';
}

export function setPlayerName(name: string): void {
  localStorage.setItem('chessPlayerName', name);
}

export async function fetchPlayerStats(playerId: string): Promise<PlayerStatsRecord | null> {
  const { data, error } = await supabase
    .from('chess_player_stats')
    .select('*')
    .eq('player_id', playerId)
    .maybeSingle();
  if (error) {
    console.error('Failed to fetch player stats:', error);
    return null;
  }
  return data as PlayerStatsRecord | null;
}

export async function upsertPlayerStats(
  playerId: string,
  displayName: string,
  stats: {
    points: number;
    wins: number;
    losses: number;
    draws: number;
    games_played: number;
    current_streak: number;
    best_streak: number;
  }
): Promise<PlayerStatsRecord | null> {
  const { data: existing } = await supabase
    .from('chess_player_stats')
    .select('id')
    .eq('player_id', playerId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('chess_player_stats')
      .update({
        display_name: displayName,
        points: stats.points,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        games_played: stats.games_played,
        current_streak: stats.current_streak,
        best_streak: stats.best_streak,
        updated_at: new Date().toISOString(),
      })
      .eq('player_id', playerId)
      .select()
      .single();
    if (error) console.error('Failed to update player stats:', error);
    return data as PlayerStatsRecord | null;
  } else {
    const { data, error } = await supabase
      .from('chess_player_stats')
      .insert({
        player_id: playerId,
        display_name: displayName,
        ...stats,
      })
      .select()
      .single();
    if (error) console.error('Failed to insert player stats:', error);
    return data as PlayerStatsRecord | null;
  }
}

export async function fetchLeaderboard(limit: number = 20): Promise<PlayerStatsRecord[]> {
  const { data, error } = await supabase
    .from('chess_player_stats')
    .select('*')
    .order('points', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Failed to fetch leaderboard:', error);
    return [];
  }
  return (data as PlayerStatsRecord[]) || [];
}

// Local Room Storage & Sync fallback (using localStorage and BroadcastChannel)
const LOCAL_ROOMS_KEY = 'chess_local_private_rooms';

function getLocalRooms(): Record<string, PrivateRoom> {
  try {
    const raw = localStorage.getItem(LOCAL_ROOMS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveLocalRooms(rooms: Record<string, PrivateRoom>): void {
  try {
    localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));
  } catch (e) {
    console.error('Failed to save local rooms:', e);
  }
}

export function broadcastRoomUpdate(room: PrivateRoom, type: 'UPDATE' | 'DELETE' = 'UPDATE') {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel(`room_channel_${room.id}`);
      channel.postMessage({ type, room });
      channel.close();
    } catch (e) {
      console.error('BroadcastChannel error:', e);
    }
  }
}

export async function createPrivateRoom(hostColor: 'white' | 'black'): Promise<PrivateRoom> {
  const code = generateAccessCode();
  const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('chess_private_rooms')
        .insert({
          access_code: code,
          status: 'waiting',
          host_color: hostColor,
          fen: initialFen,
          move_history: '',
        })
        .select()
        .single();

      if (!error && data) {
        return data as PrivateRoom;
      }
    } catch (err) {
      console.warn('Supabase create room failed, falling back to local mode:', err);
    }
  }

  // Fallback local room creation
  const localRoom: PrivateRoom = {
    id: crypto.randomUUID(),
    access_code: code,
    fen: initialFen,
    move_history: '',
    status: 'waiting',
    host_color: hostColor,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_local: true,
  };

  const rooms = getLocalRooms();
  rooms[localRoom.id] = localRoom;
  saveLocalRooms(rooms);
  broadcastRoomUpdate(localRoom, 'UPDATE');

  return localRoom;
}

export async function joinPrivateRoom(code: string): Promise<{ room: PrivateRoom; myColor: 'white' | 'black' } | null> {
  const cleanCode = code.trim().toUpperCase();

  if (isSupabaseConfigured()) {
    try {
      const { data: room, error: queryError } = await supabase
        .from('chess_private_rooms')
        .select('*')
        .eq('access_code', cleanCode)
        .eq('status', 'waiting')
        .maybeSingle();

      if (!queryError && room) {
        const myColor = room.host_color === 'white' ? 'black' : 'white';
        const { data: updated, error: updateError } = await supabase
          .from('chess_private_rooms')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', room.id)
          .select()
          .single();

        if (!updateError && updated) {
          return { room: updated as PrivateRoom, myColor };
        }
      }
    } catch (err) {
      console.warn('Supabase join room failed, trying local mode:', err);
    }
  }

  // Local fallback
  const rooms = getLocalRooms();
  const foundId = Object.keys(rooms).find(
    (id) => rooms[id].access_code === cleanCode && rooms[id].status === 'waiting'
  );

  if (!foundId) {
    return null;
  }

  const room = rooms[foundId];
  const myColor = room.host_color === 'white' ? 'black' : 'white';
  room.status = 'active';
  room.updated_at = new Date().toISOString();
  rooms[foundId] = room;
  saveLocalRooms(rooms);
  broadcastRoomUpdate(room, 'UPDATE');

  return { room, myColor };
}

export async function updatePrivateRoom(
  roomId: string,
  updates: { fen?: string; move_history?: string; status?: 'waiting' | 'active' | 'finished' }
): Promise<PrivateRoom | null> {
  const rooms = getLocalRooms();
  let localRoom = rooms[roomId];

  if (isSupabaseConfigured() && (!localRoom || !localRoom.is_local)) {
    try {
      const { data, error } = await supabase
        .from('chess_private_rooms')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roomId)
        .select()
        .single();

      if (!error && data) {
        broadcastRoomUpdate(data as PrivateRoom, 'UPDATE');
        return data as PrivateRoom;
      }
    } catch (err) {
      console.warn('Supabase update room failed:', err);
    }
  }

  if (localRoom) {
    localRoom = {
      ...localRoom,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    rooms[roomId] = localRoom;
    saveLocalRooms(rooms);
    broadcastRoomUpdate(localRoom, 'UPDATE');
    return localRoom;
  }

  return null;
}

export async function deletePrivateRoom(roomId: string): Promise<void> {
  const rooms = getLocalRooms();
  const room = rooms[roomId];

  if (isSupabaseConfigured() && (!room || !room.is_local)) {
    try {
      await supabase.from('chess_private_rooms').delete().eq('id', roomId);
    } catch (err) {
      console.warn('Supabase delete room failed:', err);
    }
  }

  if (room) {
    delete rooms[roomId];
    saveLocalRooms(rooms);
    broadcastRoomUpdate(room, 'DELETE');
  }
}
