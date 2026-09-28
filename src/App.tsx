import { useCallback, useEffect, useRef, useState } from 'react';
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
import { findBestMove } from './utils/chessBot';
import { playSound } from './utils/sound';
import { useGameClock } from './hooks/useGameClock';

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
  points: 0, wins: 0, losses: 0, draws: 0,
  gamesPlayed: 0, currentStreak: 0, bestStreak: 0,
};

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  showCoordinates: true,
  autoFlipBoard: false,
  showMoveQuality: true,
  boardTheme: 'modern',
};

type Screen = 'menu' | 'game' | 'settings' | 'stats' | 'matchmaking' | 'timeControl' | 'difficulty';

interface ResultModal {
  title: string;
  subtitle: string;
  outcome: 'win' | 'loss' | 'draw';
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('bot');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [timeControl, setTimeControl] = useState<TimeControl>('10min');
  const gameRef = useRef(new Chess());
  const [, forceRender] = useState(0);
  const rerender = useCallback(() => forceRender(n => n + 1), []);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('chessSettings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch { /* ignore corrupt storage */ }
    return DEFAULT_SETTINGS;
  });
  const [stats, setStats] = useState<PlayerStats>(() => {
    try {
      const saved = localStorage.getItem('chessStats');
      if (saved) return { ...DEFAULT_STATS, ...JSON.parse(saved) };
    } catch { /* ignore corrupt storage */ }
    return DEFAULT_STATS;
  });
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<{ score: number; lastMove: string | null } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [resultModal, setResultModal] = useState<ResultModal | null>(null);

  const clock = useGameClock(timeControl);
  const botTimerRef = useRef<number | null>(null);
  const gameOverProcessedRef = useRef(false);
  const statsDirtyRef = useRef(false);

  // Persist stats / settings.
  useEffect(() => {
    if (statsDirtyRef.current) localStorage.setItem('chessStats', JSON.stringify(stats));
  }, [stats]);
  useEffect(() => {
    localStorage.setItem('chessSettings', JSON.stringify(settings));
  }, [settings]);

  // Cleanup pending bot timers on unmount.
  useEffect(() => () => {
    if (botTimerRef.current !== null) window.clearTimeout(botTimerRef.current);
  }, []);

  const game = gameRef.current;

  const recordResult = useCallback((outcome: 'win' | 'loss' | 'draw', diff: Difficulty) => {
    statsDirtyRef.current = true;
    setStats(prev => {
      const newStats = { ...prev };
      newStats.gamesPlayed++;
      if (outcome === 'win') {
        newStats.wins++;
        newStats.currentStreak++;
        newStats.bestStreak = Math.max(newStats.bestStreak, newStats.currentStreak);
        newStats.points += 10 * (diff === 'hard' ? 3 : diff === 'medium' ? 2 : 1);
      } else if (outcome === 'loss') {
        newStats.losses++;
        newStats.currentStreak = 0;
      } else {
        newStats.draws++;
        newStats.points += 2;
      }
      return newStats;
    });
  }, []);

  // Start new game.
  const startGame = useCallback((mode: GameMode, opts?: { difficulty?: Difficulty; time?: TimeControl; playerColor?: 'white' | 'black' }) => {
    if (botTimerRef.current !== null) {
      window.clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
    if (opts?.difficulty) setDifficulty(opts.difficulty);
    const time = opts?.time ?? timeControl;
    setTimeControl(time);

    gameRef.current = new Chess();
    setMoveHistory([]);
    setAnalysis(null);
    setResultModal(null);
    setPendingPromotion(null);
    gameOverProcessedRef.current = false;
    clock.reset(time);
    const color = opts?.playerColor ?? 'white';
    setPlayerColor(color);
    setGameMode(mode);
    setScreen('game');

    // If the bot plays White it opens the game and the clock starts with it.
    if (mode === 'bot' && color === 'black') {
      window.setTimeout(() => clock.start(), 600);
    }
  }, [clock, timeControl]);

  const handleTimeControlSelect = useCallback((time: TimeControl) => {
    startGame('bot', { difficulty, time });
  }, [startGame, difficulty]);

  const handleDifficultySelect = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    setScreen('timeControl');
  }, []);

  const startMatchmaking = useCallback(() => {
    setScreen('matchmaking');
  }, []);

  const afterMoveEffects = useCallback((san: string, isCapture: boolean, g: Chess) => {
    if (!clock.running && timeControl !== 'unlimited' && !g.isGameOver()) {
      clock.resume();
    } else {
      clock.onMoveCompleted();
    }
    if (settings.soundEnabled) {
      if (g.isGameOver()) playSound('gameEnd');
      else if (g.inCheck()) playSound('check');
      else if (isCapture) playSound('capture');
      else playSound('move');
    }
    setMoveHistory(prev => [...prev, san]);
    setAnalysis(prev => ({ score: prev?.score ?? 0, lastMove: san }));
  }, [clock, settings.soundEnabled, timeControl]);

  // Bot move logic - minimax search scheduled after the player's move.
  const makeBotMove = useCallback((difficultyLevel: Difficulty) => {
    const g = gameRef.current;
    if (g.isGameOver()) return;
    const move = findBestMove(g.fen(), difficultyLevel);
    if (!move) return;
    const applied = g.move({ from: move.from, to: move.to, promotion: move.promotion });
    if (!applied) return;
    afterMoveEffects(applied.san, !!applied.captured, g);
    rerender();
  }, [afterMoveEffects, rerender]);

  const scheduleBotMove = useCallback(() => {
    if (botTimerRef.current !== null) window.clearTimeout(botTimerRef.current);
    botTimerRef.current = window.setTimeout(() => {
      botTimerRef.current = null;
      makeBotMove(difficulty);
    }, 400);
  }, [makeBotMove, difficulty]);

  /** Attempts a move; returns true on success. Opens a picker for promotions. */
  const attemptMove = useCallback((from: string, to: string, promotion?: string): boolean => {
    const g = gameRef.current;

    if (!promotion) {
      const piece = g.get(from as Parameters<typeof g.get>[0]);
      const targetRank = to[1];
      if (piece?.type === 'p' && (targetRank === '8' || targetRank === '1')) {
        setPendingPromotion({ from, to });
        return false;
      }
    }

    let move = null;
    try {
      move = g.move({ from, to, promotion: promotion ?? 'q' });
    } catch {
      move = null;
    }
    if (!move) return false;

    if (pendingPromotion) setPendingPromotion(null);
    afterMoveEffects(move.san, !!move.captured, g);
    rerender();

    if (gameMode === 'bot' && !g.isGameOver() && g.turn() !== (playerColor === 'white' ? 'w' : 'b')) {
      scheduleBotMove();
    }
    return true;
  }, [afterMoveEffects, gameMode, pendingPromotion, playerColor, rerender, scheduleBotMove]);

  const handlePromotionSelect = useCallback((piece: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    setPendingPromotion(null);
    attemptMove(from, to, piece);
  }, [attemptMove, pendingPromotion]);

  // Game-over detection (board state or clock timeout).
  useEffect(() => {
    if (screen !== 'game' || gameOverProcessedRef.current) return;
    const timedOut = clock.timeoutWinner !== null;
    if (!timedOut && !game.isGameOver()) return;
    gameOverProcessedRef.current = true;

    clock.pause();

    let outcome: 'win' | 'loss' | 'draw';
    let title: string;
    let subtitle: string;
    const youAreWhite = playerColor === 'white';

    if (timedOut) {
      const winnerIsYou = clock.timeoutWinner === playerColor;
      outcome = winnerIsYou ? 'win' : 'loss';
      title = gameMode === 'pvp'
        ? `${clock.timeoutWinner === 'white' ? 'White' : 'Black'} wins!`
        : winnerIsYou ? 'You Win!' : 'You Lost';
      subtitle = 'Won on time.';
    } else if (game.isCheckmate()) {
      const winnerIsWhite = game.turn() !== 'w'; // side to move was checkmated
      if (gameMode === 'pvp') {
        outcome = 'win';
        title = `Checkmate - ${winnerIsWhite ? 'White' : 'Black'} wins!`;
        subtitle = 'Great game!';
      } else {
        outcome = winnerIsWhite === youAreWhite ? 'win' : 'loss';
        title = outcome === 'win' ? 'Checkmate - You Win!' : 'Checkmate - You Lost';
        subtitle = outcome === 'win' ? 'Nicely played.' : 'Better luck next time.';
      }
    } else {
      outcome = 'draw';
      title = 'Draw!';
      subtitle = game.isStalemate() ? 'Stalemate.'
        : game.isThreefoldRepetition() ? 'Threefold repetition.'
        : game.isInsufficientMaterial() ? 'Insufficient material.'
        : 'The game is drawn.';
    }

    if (gameMode !== 'pvp') recordResult(outcome, difficulty);
    setResultModal({ title, subtitle, outcome });
  }, [clock, difficulty, game, gameMode, playerColor, recordResult, screen]);

  const handleSurrender = useCallback(() => {
    if (!gameOverProcessedRef.current) {
      gameOverProcessedRef.current = true;
      if (gameMode !== 'pvp') recordResult('loss', difficulty);
    }
    clock.pause();
    setIsMenuOpen(false);
    setResultModal(null);
    setScreen('menu');
  }, [clock, difficulty, gameMode, recordResult]);

  const resetStats = useCallback(() => {
    if (confirm('Are you sure you want to reset all stats?')) {
      statsDirtyRef.current = false;
      setStats(DEFAULT_STATS);
      localStorage.setItem('chessStats', JSON.stringify(DEFAULT_STATS));
    }
  }, []);

  const closeGameAndReturnToMenu = useCallback(() => {
    setResultModal(null);
    setScreen('menu');
  }, []);

  const rematch = useCallback(() => {
    setResultModal(null);
    startGame(gameMode, { difficulty, time: timeControl, playerColor });
  }, [difficulty, gameMode, playerColor, startGame, timeControl]);

  const glassButton = 'w-full py-4 px-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white font-semibold text-lg hover:bg-white/20 transition-all shadow-lg';
  const smallButton = 'py-3 px-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all';

  // ---- Screens -------------------------------------------------------------

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
              <button onClick={() => setScreen('difficulty')} className={glassButton}>
                Play vs Bot
              </button>

              <button onClick={() => startGame('pvp', { time: 'unlimited' })} className={glassButton}>
                Local 2 Player
              </button>

              <button
                onClick={startMatchmaking}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-500/30 to-blue-500/30 backdrop-blur-xl border border-white/20 rounded-2xl text-white font-semibold text-lg hover:from-purple-500/40 hover:to-blue-500/40 transition-all shadow-lg"
              >
                Find Online Match
              </button>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button onClick={() => setScreen('stats')} className={smallButton}>
                  Statistics
                </button>
                <button onClick={() => setScreen('settings')} className={smallButton}>
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

  if (screen === 'matchmaking') {
    return (
      <div className="relative min-h-screen">
        <LiquidGlassBackground />
        <MatchmakingQueue
          stats={stats}
          onMatchFound={(opponentColor: 'white' | 'black') => {
            startGame('online', { difficulty: 'medium', time: '10min', playerColor: opponentColor });
          }}
          onCancel={() => setScreen('menu')}
        />
      </div>
    );
  }

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

  if (screen === 'settings') {
    return (
      <div className="relative min-h-screen">
        <LiquidGlassBackground />
        <Settings
          settings={settings}
          onSettingsChange={setSettings}
          onBack={() => setScreen('menu')}
        />
      </div>
    );
  }

  if (screen === 'stats') {
    return (
      <div className="relative min-h-screen">
        <LiquidGlassBackground />
        <PointsSystem
          stats={stats}
          onBack={() => setScreen('menu')}
          onReset={resetStats}
        />
      </div>
    );
  }

  // ---- Game screen ----------------------------------------------------------

  const undoMove = () => {
    const g = gameRef.current;
    if (g.history().length === 0) return;
    if (botTimerRef.current !== null) {
      window.clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
    gameOverProcessedRef.current = false;
    setResultModal(null);
    if (gameMode === 'bot') {
      // Undo the bot reply together with the player's move when possible.
      g.undo();
      if (g.turn() !== (playerColor === 'white' ? 'w' : 'b')) g.undo();
    } else {
      g.undo();
    }
    setMoveHistory(prev => prev.slice(0, g.history().length));
    setAnalysis(null);
    rerender();
  };

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
                gameMode={gameMode}
                onMove={attemptMove}
                settings={settings}
                pendingPromotion={pendingPromotion}
                onPromotionSelect={handlePromotionSelect}
                whiteTime={clock.whiteTime}
                blackTime={clock.blackTime}
                clockRunning={clock.running}
              />

              <Controls
                canUndo={game.history().length > 0}
                onNewGame={() => setScreen('menu')}
                onFlipBoard={() => setPlayerColor(prev => prev === 'white' ? 'black' : 'white')}
                onUndo={undoMove}
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
                enabled={settings.showMoveQuality}
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
          rematch();
        }}
        onBackToMenu={() => {
          setIsMenuOpen(false);
          clock.pause();
          setScreen('menu');
        }}
      />

      {/* Result modal */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeGameAndReturnToMenu} />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 space-y-4 text-center"
            style={{
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(30px)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            }}
          >
            <div className="text-5xl">
              {resultModal.outcome === 'win' ? '\u{1F3C6}' : resultModal.outcome === 'loss' ? '\u{1F494}' : '\u{1F91D}'}
            </div>
            <h2 className="text-3xl font-bold text-white">{resultModal.title}</h2>
            <p className="text-white/70">{resultModal.subtitle}</p>
            {gameMode !== 'pvp' && (
              <p className="text-white/60 text-sm">
                {resultModal.outcome === 'win'
                  ? `+${10 * (difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1)} points`
                  : resultModal.outcome === 'draw' ? '+2 points' : 'No points'} · Total: {stats.points}
              </p>
            )}
            <div className="space-y-3 pt-2">
              <button
                onClick={rematch}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-500/30 to-blue-500/30 hover:from-purple-500/40 hover:to-blue-500/40 border border-white/20 rounded-xl text-white font-medium transition-all"
              >
                Rematch
              </button>
              <button
                onClick={closeGameAndReturnToMenu}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all"
              >
                Back to Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
