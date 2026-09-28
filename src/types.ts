/**
 * Shared app types.
 *
 * These used to live in App.tsx, which created import cycles (App -> components
 * -> App). Keeping them here lets every module import the contract it needs
 * without pulling in the whole application shell.
 */

export type GameMode = 'local' | 'bot' | 'online';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type TimeControl = '5min' | '10min' | '15min' | '30min' | 'unlimited';

export type BoardTheme = 'classic' | 'modern' | 'wood' | 'marble';

export interface GameSettings {
  playerName: string;
  soundEnabled: boolean;
  showCoordinates: boolean;
  autoFlipBoard: boolean;
  showMoveQuality: boolean;
  boardTheme: BoardTheme;
}

/** Client-side shape of a player's stats (mirrors chess_player_stats). */
export interface PlayerStats {
  points: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  currentStreak: number;
  bestStreak: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  playerName: 'Player',
  soundEnabled: true,
  showCoordinates: true,
  autoFlipBoard: false,
  showMoveQuality: true,
  boardTheme: 'classic',
};
