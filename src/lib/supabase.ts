import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface PrivateRoom {
  id: string;
  access_code: string;
  fen: string;
  move_history: string;
  status: 'waiting' | 'active' | 'finished';
  host_color: 'white' | 'black';
  created_at: string;
  updated_at: string;
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
