import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from './components/ChessBoard';
import { GameInfo } from './components/GameInfo';
import { Controls } from './components/Controls';
import { Settings } from './components/Settings';
import { Analysis } from './components/Analysis';
import { MatchmakingQueue } from './components/MatchmakingQueue';
import { PointsSystem } from './components/PointsSystem';
import { LiquidGlassBackground } from './components/LiquidGlassBackground';

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

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'game' | 'settings' | 'stats' | 'matchmaking'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('bot');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [timeControl, setTimeControl] = useState<TimeControl>('10min');
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [settings, setSettings] = useState<GameSettings>({
    soundEnabled: true,
    showCoordinates: true,
    autoFlipBoard: false,
    showMoveQuality: true,
    boardTheme: 'modern',
  });
  const [stats, setStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem('chessStats');
    return saved ? JSON.parse(saved) : {
      points: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      gamesPlayed: 0,
      currentStreak: 0,
      bestStreak: 0,
    };
  });
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);

  // Save stats to localStorage
  useEffect(() => {
    localStorage.setItem('chessStats', JSON.stringify(stats));
  }, [stats]);

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

  // Start online matchmaking
  const startMatchmaking = useCallback(() => {
    setScreen('matchmaking');
  }, []);

  // Bot move logic
  const makeBotMove = useCallback((currentGame: Chess) => {
    const moves = currentGame.moves({ verbose: true });
    if (moves.length > 0) {
      // Simple bot: pick a random move (could be improved with difficulty levels)
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
        
        // Play sound
        if (settings.soundEnabled) {
          const audio = new Audio('/move-sound.mp3');
          audio.play().catch(() => {});
        }
        
        // Bot move after player move (if playing vs bot)
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
      
      // Update stats
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

  // Reset stats
  const resetStats = useCallback(() => {
    if (confirm('Are you sure you want to reset all stats?')) {
      const newStats = {
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        gamesPlayed: 0,
        currentStreak: 0,
        bestStreak: 0,
      };
      setStats(newStats);
      localStorage.setItem('chessStats', JSON.stringify(newStats));
    }
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
                onClick={() => startGame('bot', 'medium', '10min')}
                className="w-full py-4 px-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white font-semibold text-lg hover:bg-white/20 transition-all shadow-lg"
              >
                Play vs Bot
              </button>

              <button
                onClick={() => startGame('pvp')}
                className="w-full py-4 px-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white font-semibold text-lg hover:bg-white/20 transition-all shadow-lg"
              >
                Local 2 Player
              </button>

              <button
                onClick={startMatchmaking}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-500/30 to-blue-500/30 backdrop-blur-xl border border-white/20 rounded-2xl text-white font-semibold text-lg hover:from-purple-500/40 hover:to-blue-500/40 transition-all shadow-lg"
              >
                Find Online Match
              </button>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  onClick={() => setScreen('stats')}
                  className="py-3 px-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all"
                >
                  Statistics
                </button>
                <button
                  onClick={() => setScreen('settings')}
                  className="py-3 px-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all"
                >
                  Settings
                </button>
              </div>
            </div>

            <div className="text-center pt-4">
              <p className="text-white/60 text-sm">
                Points: {stats.points} | Rank: {Math.floor(stats.points / 100)}
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
      <MatchmakingQueue
        stats={stats}
        onMatchFound={(opponentColor: 'white' | 'black') => {
          startGame('online', 'medium', '10min');
          setPlayerColor(opponentColor);
        }}
        onCancel={() => setScreen('menu')}
      />
    );
  }

  // Settings Screen
  if (screen === 'settings') {
    return (
      <Settings
        settings={settings}
        onSettingsChange={setSettings}
        onBack={() => setScreen('menu')}
      />
    );
  }

  // Stats Screen
  if (screen === 'stats') {
    return (
      <PointsSystem
        stats={stats}
        onBack={() => setScreen('menu')}
        onReset={resetStats}
      />
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
    </div>
  );
}
