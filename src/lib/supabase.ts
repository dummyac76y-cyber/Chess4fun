import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});

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

/**
 * Normalizes an access code for comparison: strips every non-alphanumeric
 * character (spaces, dashes, invisible/zero-width characters that can sneak in
 * via autofill, autocorrect or copy-paste) and uppercases the result. Typed
 * lowercase input is treated as identical to the uppercase code.
 */
export function normalizeAccessCode(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
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
    console.error('[Supabase Stats Error] Failed to fetch player stats:', error);
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
    if (error) console.error('[Supabase Stats Error] Failed to update player stats:', error);
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
    if (error) console.error('[Supabase Stats Error] Failed to insert player stats:', error);
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
    console.error('[Supabase Leaderboard Error] Failed to fetch leaderboard:', error);
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
  const code = generateAccessCode().trim().toUpperCase();
  const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  if (isSupabaseConfigured()) {
    console.log('[CreateRoom] Creating room in Supabase with code:', code);
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

    if (error) {
      console.error('[CreateRoom Failure] Supabase error when creating room:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(`Failed to create room in database: ${error.message} (Code: ${error.code || 'UNKNOWN'})`);
    }

    if (!data) {
      console.error('[CreateRoom Failure] No data returned from Supabase room creation.');
      throw new Error('Failed to create room: Backend returned empty response.');
    }

    console.log('[CreateRoom Success] Created room:', data.id, 'with code:', data.access_code);
    return data as PrivateRoom;
  }

  console.warn('[CreateRoom] Supabase environment variables not configured. Creating offline/local room.');
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

export async function joinPrivateRoom(code: string): Promise<{ room: PrivateRoom; myColor: 'white' | 'black' }> {
  // Normalize aggressively so that typed codes match stored codes regardless of
  // case, stray spaces/dashes, or invisible characters (e.g. zero-width spaces
  // introduced by mobile keyboards, autofill or copy-paste).
  const cleanCode = normalizeAccessCode(code);

  if (!cleanCode) {
    console.error('[JoinRoom Error] Empty room code provided.');
    throw new Error('Please enter a valid access code.');
  }

  if (isSupabaseConfigured()) {
    console.log('[JoinRoom] Searching Supabase for access code:', cleanCode);

    // Primary lookup: exact match on the normalized uppercase code.
    let { data: room, error: queryError } = await supabase
      .from('chess_private_rooms')
      .select('*')
      .eq('access_code', cleanCode)
      .maybeSingle();

    // Fallback: case-insensitive match (ILIKE with all literals escaped) for
    // rooms whose stored code differs in case from the canonical form.
    if (!queryError && !room) {
      const escaped = cleanCode.replace(/[%_\\]/g, '\\$&');
      const retry = await supabase
        .from('chess_private_rooms')
        .select('*')
        .ilike('access_code', escaped)
        .maybeSingle();
      room = retry.data;
      queryError = retry.error;
    }

    if (queryError) {
      console.error('[JoinRoom Failure] Database query error:', {
        message: queryError.message,
        code: queryError.code,
        details: queryError.details,
        hint: queryError.hint,
      });
      throw new Error(`Database error looking up room: ${queryError.message}`);
    }

    if (!room) {
      console.warn(`[JoinRoom] Room not found in database for code: "${cleanCode}"`);
      throw new Error(`Room with code "${cleanCode}" does not exist or has expired.`);
    }

    console.log(`[JoinRoom] Found room ID: ${room.id}, current status: ${room.status}`);

    if (room.status === 'finished') {
      throw new Error('This room game has already finished.');
    }

    const myColor = room.host_color === 'white' ? 'black' : 'white';

    if (room.status === 'active') {
      console.log('[JoinRoom] Room is already active. Rejoining game...');
      return { room: room as PrivateRoom, myColor };
    }

    // Room status is 'waiting' -> transition to 'active'
    const { data: updated, error: updateError } = await supabase
      .from('chess_private_rooms')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', room.id)
      .select()
      .single();

    if (updateError) {
      console.error('[JoinRoom Failure] Error updating room status to active:', updateError);
      throw new Error(`Failed to activate room: ${updateError.message}`);
    }

    if (!updated) {
      console.error('[JoinRoom Failure] Room status update returned no data.');
      throw new Error('Failed to join room: Server returned empty response on join.');
    }

    console.log('[JoinRoom Success] Joined room:', updated.id, 'as color:', myColor);
    return { room: updated as PrivateRoom, myColor };
  }

  console.warn('[JoinRoom] Supabase environment variables not configured. Checking local storage rooms.');
  const rooms = getLocalRooms();
  const foundId = Object.keys(rooms).find(
    (id) => normalizeAccessCode(rooms[id].access_code) === cleanCode
  );

  if (!foundId) {
    throw new Error(`Room with code "${cleanCode}" not found. Please double-check the code and try again.`);
  }

  const room = rooms[foundId];
  if (room.status === 'finished') {
    throw new Error('This room game has already finished.');
  }

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

      if (error) {
        console.error('[UpdateRoom Error] Supabase update failed:', error);
      } else if (data) {
        broadcastRoomUpdate(data as PrivateRoom, 'UPDATE');
        return data as PrivateRoom;
      }
    } catch (err) {
      console.error('[UpdateRoom Error] Exception during Supabase room update:', err);
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
      const { error } = await supabase.from('chess_private_rooms').delete().eq('id', roomId);
      if (error) {
        console.error('[DeleteRoom Error] Supabase delete failed:', error);
      }
    } catch (err) {
      console.error('[DeleteRoom Error] Exception during Supabase room deletion:', err);
    }
  }

  if (room) {
    delete rooms[roomId];
    saveLocalRooms(rooms);
    broadcastRoomUpdate(room, 'DELETE');
  }
}

/**
 * Subscribes to realtime changes on a single room row. Returns an unsubscribe
 * function. Requires `chess_private_rooms` to be added to the Supabase
 * publication for realtime (see supabase/migrations).
 */
export function subscribeToRoom(
  roomId: string,
  handlers: {
    onUpdate: (room: PrivateRoom) => void;
    onDelete?: () => void;
  }
): () => void {
  let channel: RealtimeChannel | null = null;
  channel = supabase
    .channel(`room-${roomId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chess_private_rooms', filter: `id=eq.${roomId}` },
      (payload) => handlers.onUpdate(payload.new as PrivateRoom)
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'chess_private_rooms', filter: `id=eq.${roomId}` },
      () => handlers.onDelete?.()
    )
    .subscribe((status) => {
      if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        console.warn(`[Realtime] Subscription for room ${roomId} is ${status}; polling fallback remains active.`);
      }
    });

  return () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  };
}
