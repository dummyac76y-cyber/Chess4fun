import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from './components/ChessBoard';
import { GameInfo } from './components/GameInfo';
import { Controls } from './components/Controls';
import { Settings } from './components/Settings';
import { Analysis } from './components/Analysis';
import { MatchmakingQueue } from './components/MatchmakingQueue';
import { PointsSystem } from './components/PointsSystem';
import { LiquidGlassBackground } from './components/LiquidGlassBackground';
import { GameMenu } from './components/GameMenu';
import { TimeControlSelect } from './components/TimeControlSelect';
import { DifficultySelect } from './components/DifficultySelect';
import { RoomLobby } from './components/RoomLobby';
import { RoomGame } from './components/RoomGame';
import { Leaderboard } from './components/Leaderboard';
import { PrivateRoom, getOrCreatePlayerId, getPlayerName, setPlayerName, fetchPlayerStats, upsertPlayerStats } from './lib/supabase';

export type GameMode = 'bot' | 'pvp' | 'online';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type TimeControl = '5min' | '10min' | '15min' | '30min' | 'unlimited';

export interface PlayerStats {
  points: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  currentStreak: number;
  bestStreak: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  showCoordinates: boolean;
  autoFlipBoard: boolean;
  showMoveQuality: boolean;
  boardTheme: 'classic' | 'modern' | 'wood' | 'marble';
}

const DEFAULT_STATS: PlayerStats = {
  points: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  gamesPlayed: 0,
  currentStreak: 0,
  bestStreak: 0,
};

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'game' | 'settings' | 'stats' | 'matchmaking' | 'timeControl' | 'difficulty' | 'roomLobby' | 'roomGame' | 'leaderboard'>('menu');
  const [activeRoom, setActiveRoom] = useState<PrivateRoom | null>(null);
  const [isRoomHost, setIsRoomHost] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('bot');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [timeControl, setTimeControl] = useState<TimeControl>('10min');
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [settings, setSettings] = useState<GameSettings>({
    soundEnabled: true,
    showCoordinates: true,
    autoFlipBoard: true,
    showMoveQuality: true,
    boardTheme: 'modern',
  });
  const [stats, setStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem('chessStats');
    return saved ? JSON.parse(saved) : DEFAULT_STATS;
  });
  const [playerName, setPlayerNameState] = useState<string>(getPlayerName());
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const playerIdRef = useRef(getOrCreatePlayerId());

  // Load stats from Supabase on mount
  useEffect(() => {
    const playerId = playerIdRef.current;
    fetchPlayerStats(playerId).then((record) => {
      if (record) {
        const remoteStats: PlayerStats = {
          points: record.points,
          wins: record.wins,
          losses: record.losses,
          draws: record.draws,
          gamesPlayed: record.games_played,
          currentStreak: record.current_streak,
          bestStreak: record.best_streak,
        };
        setStats(remoteStats);
        localStorage.setItem('chessStats', JSON.stringify(remoteStats));
      }
      setStatsLoaded(true);
    });
  }, []);

  // Sync stats to Supabase whenever they change (after initial load)
  useEffect(() => {
    if (!statsLoaded) return;
    localStorage.setItem('chessStats', JSON.stringify(stats));
    upsertPlayerStats(playerIdRef.current, playerName, {
      points: stats.points,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      games_played: stats.gamesPlayed,
      current_streak: stats.currentStreak,
      best_streak: stats.bestStreak,
    });
  }, [stats, statsLoaded, playerName]);

  // Start new game
  const startGame = useCallback((mode: GameMode, diff?: Difficulty, time?: TimeControl) => {
    setGameMode(mode);
    if (diff) setDifficulty(diff);
    if (time) setTimeControl(time);
    
    const newGame = new Chess();
    setGame(newGame);
    setPlayerColor('white');
    setMoveHistory([]);
    setScreen('game');
  }, []);

  // Handle time control selection for bot game
  const handleTimeControlSelect = useCallback((time: TimeControl) => {
    setTimeControl(time);
    startGame('bot', difficulty, time);
  }, [startGame, difficulty]);

  // Handle difficulty selection
  const handleDifficultySelect = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    setScreen('timeControl');
  }, []);

  // Start online matchmaking
  const startMatchmaking = useCallback(() => {
    setScreen('matchmaking');
  }, []);

  // Bot move logic
  const makeBotMove = useCallback((currentGame: Chess) => {
    const moves = currentGame.moves({ verbose: true });
    if (moves.length > 0) {
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      currentGame.move(randomMove);
      setGame(new Chess(currentGame.fen()));
      setMoveHistory(prev => [...prev, randomMove.san]);
    }
  }, []);

  // Handle move
  const handleMove = useCallback((from: string, to: string, promotion?: string) => {
    const gameCopy = new Chess(game.fen());

    try {
      const move = gameCopy.move({ from, to, promotion: promotion || 'q' });
      if (move) {
        setGame(new Chess(gameCopy.fen()));
        setMoveHistory(prev => [...prev, move.san]);

        if (settings.soundEnabled) {
          const audio = new Audio('/move-sound.mp3');
          audio.play().catch(() => {});
        }

        if (gameMode === 'bot' && !gameCopy.isGameOver()) {
          setTimeout(() => {
            makeBotMove(gameCopy);
          }, 500);
        }

        return true;
      }
    } catch (e) {
      console.error('Invalid move', e);
    }

    return false;
  }, [game, settings.soundEnabled, gameMode, makeBotMove]);

  // Check game over
  useEffect(() => {
    if (game.isGameOver()) {
      let result: 'win' | 'loss' | 'draw';
      
      if (game.isDraw()) {
        result = 'draw';
      } else if (game.isCheckmate()) {
        const turn = game.turn();
        const playerTurn = playerColor === 'white' ? 'w' : 'b';
        result = (turn === playerTurn) ? 'loss' : 'win';
      } else {
        result = 'draw';
      }
      
      setStats(prev => {
        const newStats = { ...prev };
        newStats.gamesPlayed++;
        
        if (result === 'win') {
          newStats.wins++;
          newStats.currentStreak++;
          newStats.bestStreak = Math.max(newStats.bestStreak, newStats.currentStreak);
          newStats.points += 10 * (difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1);
        } else if (result === 'loss') {
          newStats.losses++;
          newStats.currentStreak = 0;
        } else {
          newStats.draws++;
          newStats.points += 2;
        }
        
        return newStats;
      });
    }
  }, [game, playerColor, difficulty]);

  // Surrender handler
  const handleSurrender = useCallback(() => {
    setStats(prev => {
      const newStats = { ...prev };
      newStats.gamesPlayed++;
      newStats.losses++;
      newStats.currentStreak = 0;
      return newStats;
    });
    setScreen('menu');
  }, []);

  // Reset stats
  const resetStats = useCallback(() => {
    if (confirm('Are you sure you want to reset all stats?')) {
      setStats(DEFAULT_STATS);
      localStorage.setItem('chessStats', JSON.stringify(DEFAULT_STATS));
    }
  }, []);

  // Update player name
  const handleNameChange = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, 20) || 'Anonymous';
    setPlayerName(trimmed);
    setPlayerName(trimmed);
  }, []);

  // Menu Screen
  if (screen === 'menu') {
    return (
      <div className="relative min-h-screen">
        <LiquidGlassBackground />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-6xl font-bold text-white mb-2 drop-shadow-lg">Chess</h1>
              <p className="text-white/70 text-lg">Modern Glass Edition</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setScreen('difficulty')}
                className="w-full py-4 px-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white font-semibold text-lg hover:bg-white/20 transition-all shadow-lg"
              >
                Play vs Bot
              </button>

              <button
                onClick={() => {
                  setTimeControl('unlimited');
                  startGame('pvp', undefined, 'unlimited');
                }}
                className="w-full py-4 px-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white font-semibold text-lg hover:bg-white/20 transition-all shadow-lg"
              >
                Local 2 Player
              </button>

              <button
                onClick={() => setScreen('roomLobby')}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 backdrop-blur-xl border border-white/20 rounded-2xl text-white font-semibold text-lg hover:from-emerald-500/40 hover:to-teal-500/40 transition-all shadow-lg"
              >
                Private Room
              </button>

              <button
                onClick={startMatchmaking}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-500/30 to-blue-500/30 backdrop-blur-xl border border-white/20 rounded-2xl text-white font-semibold text-lg hover:from-purple-500/40 hover:to-blue-500/40 transition-all shadow-lg"
              >
                Find Online Match
              </button>

              <div className="grid grid-cols-3 gap-3 pt-3">
                <button
                  onClick={() => setScreen('stats')}
                  className="py-3 px-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all text-sm"
                >
                  Statistics
                </button>
                <button
                  onClick={() => setScreen('leaderboard')}
                  className="py-3 px-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all text-sm"
                >
                  Leaderboard
                </button>
                <button
                  onClick={() => setScreen('settings')}
                  className="py-3 px-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all text-sm"
                >
                  Settings
                </button>
              </div>
            </div>

            <div className="text-center pt-4">
              <p className="text-white/60 text-sm">
                {playerName} — Points: {stats.points} | Rank: {Math.floor(stats.points / 100)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Matchmaking Screen
  if (screen === 'matchmaking') {
    return (
      <div className="relative min-h-screen">
        <LiquidGlassBackground />
        <MatchmakingQueue
          stats={stats}
          onMatchFound={(opponentColor: 'white' | 'black') => {
            startGame('online', 'medium', '10min');
            setPlayerColor(opponentColor);
          }}
          onCancel={() => setScreen('menu')}
        />
      </div>
    );
  }

  // Private Room Lobby Screen
  if (screen === 'roomLobby') {
    return (
      <div className="relative min-h-screen">
        <LiquidGlassBackground />
        <RoomLobby
          onRoomJoined={(room, host, color) => {
            setActiveRoom(room);
            setIsRoomHost(host);
            setPlayerColor(color);
            setScreen('roomGame');
          }}
          onBack={() => setScreen('menu')}
        />
      </div>
    );
  }

  // Private Room Game Screen
  if (screen === 'roomGame' && activeRoom) {
    return (
      <div className="relative min-h-screen">
        <LiquidGlassBackground />
        <RoomGame
          room={activeRoom}
          isHost={isRoomHost}
          myColor={playerColor}
          settings={settings}
          onLeave={() => {
            setActiveRoom(null);
            setScreen('menu');
          }}
        />
      </div>
    );
  }

  // Leaderboard Screen
  if (screen === 'leaderboard') {
    return (
      <div className="relative min-h-screen">
        <LiquidGlassBackground />
        <Leaderboard
          currentPlayerId={playerIdRef.current}
          onBack={() => setScreen('menu')}
        />
      </div>
    );
  }

  // Time Control Selection Screen
  if (screen === 'timeControl') {
    return (
      <div className="relative min-h-screen">
        <LiquidGlassBackground />
        <TimeControlSelect
          onSelect={handleTimeControlSelect}
          onBack={() => setScreen('difficulty')}
        />
      </div>
    );
  }

  // Difficulty Selection Screen
  if (screen === 'difficulty') {
    return (
      <div className="relative min-h-screen">
        <LiquidGlassBackground />
        <DifficultySelect
          onSelect={handleDifficultySelect}
          onBack={() => setScreen('menu')}
        />
      </div>
    );
  }

  // Settings Screen
  if (screen === 'settings') {
    return (
      <div className="relative min-h-screen">
        <LiquidGlassBackground />
        <Settings
          settings={settings}
          onSettingsChange={setSettings}
          onBack={() => setScreen('menu')}
          playerName={playerName}
          onNameChange={handleNameChange}
        />
      </div>
    );
  }

  // Stats Screen
  if (screen === 'stats') {
    return (
      <div className="relative min-h-screen">
        <LiquidGlassBackground />
        <PointsSystem
          stats={stats}
          playerName={playerName}
          onBack={() => setScreen('menu')}
          onReset={resetStats}
        />
      </div>
    );
  }

  // Game Screen
  return (
    <div className="relative min-h-screen">
      <LiquidGlassBackground />
      <div className="relative z-10 min-h-screen p-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">
            {/* Left side - Board */}
            <div className="space-y-4">
              <ChessBoard
                game={game}
                playerColor={playerColor}
                onMove={handleMove}
                settings={settings}
              />
              
              <Controls
                game={game}
                onNewGame={() => setScreen('menu')}
                onFlipBoard={() => {
                  setPlayerColor(prev => prev === 'white' ? 'black' : 'white');
                }}
                onUndo={() => {
                  game.undo();
                  setGame(new Chess(game.fen()));
                }}
                onSurrender={handleSurrender}
                onOpenMenu={() => setIsMenuOpen(true)}
              />
            </div>

            {/* Right side - Info panels */}
            <div className="space-y-4">
              <GameInfo
                game={game}
                playerColor={playerColor}
                moveHistory={moveHistory}
                gameMode={gameMode}
                timeControl={timeControl}
              />
              
              <Analysis
                game={game}
                analysis={analysis}
                onAnalysisUpdate={setAnalysis}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* In-game Menu */}
      <GameMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onSurrender={handleSurrender}
        onNewGame={() => {
          setIsMenuOpen(false);
          setScreen('menu');
        }}
        onBackToMenu={() => {
          setIsMenuOpen(false);
          setScreen('menu');
        }}
      />
    </div>
  );
}
