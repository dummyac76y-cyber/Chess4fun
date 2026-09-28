import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { Difficulty, GameMode, GameSettings, TimeControl } from './types';
import { DEFAULT_SETTINGS } from './types';
import { LiquidGlassBackground } from './components/LiquidGlassBackground';
import { RoomLobby } from './components/RoomLobby';
import { RoomGame } from './components/RoomGame';
import { ChessBoard } from './components/ChessBoard';
import { Controls } from './components/Controls';
import { GameInfo } from './components/GameInfo';
import { Settings } from './components/Settings';
import { DifficultySelect } from './components/DifficultySelect';
import { TimeControlSelect } from './components/TimeControlSelect';
import { findBestMove } from './utils/chessBot';
import { playSound } from './utils/sound';
import { useGameClock } from './hooks/useGameClock';
import type { PrivateRoom } from './lib/supabase';

const SETTINGS_STORAGE_KEY = 'chessGameSettings';

function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

type Screen =
  | 'menu'
  | 'difficulty'
  | 'time'
  | 'game'
  | 'settings'
  | 'room-lobby'
  | 'room-game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('local');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [timeControl, setTimeControl] = useState<TimeControl>('unlimited');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  // Private room state
  const [room, setRoom] = useState<PrivateRoom | null>(null);
  const [roomIsHost, setRoomIsHost] = useState(false);
  const [roomMyColor, setRoomMyColor] = useState<'white' | 'black'>('white');

  // The chess position lives in a ref; we bump a counter to re-render after
  // mutations so board and history always derive from the same source.
  const gameRef = useRef(new Chess());
  const [, setVersion] = useState(0);
  const rerender = () => setVersion((v) => v + 1);
  const game = gameRef.current;

  const clock = useGameClock(timeControl);
  const botTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch { /* ignore */ }
  }, [settings]);

  useEffect(() => {
    return () => {
      if (botTimerRef.current !== null) window.clearTimeout(botTimerRef.current);
    };
  }, []);

  const startGame = useCallback(
    (mode: GameMode, opts?: { difficulty?: Difficulty; time?: TimeControl; playerColor?: 'white' | 'black' }) => {
      if (botTimerRef.current !== null) {
        window.clearTimeout(botTimerRef.current);
        botTimerRef.current = null;
      }

      if (opts?.difficulty) setDifficulty(opts.difficulty);
      const time = opts?.time ?? timeControl;
      setTimeControl(time);

      gameRef.current = new Chess();
      setMoveHistory([]);
      setPendingPromotion(null);

      clock.reset(time);

      const color = opts?.playerColor ?? 'white';
      setPlayerColor(color);
      setGameMode(mode);
      setBoardFlipped(false);
      setScreen('game');

      if (mode === 'bot' && color === 'black') {
        window.setTimeout(() => clock.start(), 600);
      }
    },
    [clock, timeControl]
  );

  const scheduleBotMove = useCallback(() => {
    if (gameMode !== 'bot') return;
    const g = gameRef.current;
    if (g.isGameOver() || g.turn() === (playerColor === 'white' ? 'w' : 'b')) return;
    botTimerRef.current = window.setTimeout(() => {
      const move = findBestMove(g.fen(), difficulty);
      if (move) {
        try {
          g.move({ from: move.from, to: move.to, promotion: move.promotion });
          setMoveHistory((h) => [...h, move.san]);
          if (settings.soundEnabled) playSound('move');
          clock.onMoveCompleted();
          if (g.isGameOver()) clock.pause();
          rerender();
        } catch { /* illegal fallback – ignore */ }
      }
    }, 500);
  }, [gameMode, playerColor, difficulty, settings.soundEnabled, clock]);

  const attemptMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      const g = gameRef.current;
      if (pendingPromotion) return false;

      // Pawn promotion: ask for a piece first.
      const piece = g.get(from as Parameters<typeof g.get>[0]);
      const isPawnPromo =
        piece && piece.type === 'p' &&
        (to.startsWith('8') || to.startsWith('1'));
      if (isPawnPromo && !promotion) {
        setPendingPromotion({ from, to });
        return true;
      }

      try {
        const move = g.move({ from, to, promotion: promotion || 'q' });
        if (!move) return false;
        setMoveHistory((h) => [...h, move.san]);
        if (settings.soundEnabled) playSound(move.captured ? 'capture' : 'move');
        clock.onMoveCompleted();
        if (!clock.running && timeControl !== 'unlimited') clock.start();
        if (g.isGameOver()) clock.pause();
        rerender();
        scheduleBotMove();
        return true;
      } catch {
        return false;
      }
    },
    [pendingPromotion, settings.soundEnabled, clock, timeControl, scheduleBotMove]
  );

  const handlePromotionSelect = useCallback(
    (piece: 'q' | 'r' | 'b' | 'n') => {
      const pending = pendingPromotion;
      setPendingPromotion(null);
      if (pending) attemptMove(pending.from, pending.to, piece);
    },
    [pendingPromotion, attemptMove]
  );

  const undoMove = useCallback(() => {
    const g = gameRef.current;
    g.undo();
    if (gameMode === 'bot') g.undo();
    setMoveHistory((h) => (gameMode === 'bot' ? h.slice(0, -2) : h.slice(0, -1)));
    rerender();
  }, [gameMode]);

  const handleSurrender = useCallback(() => {
    clock.pause();
    setScreen('menu');
  }, [clock]);

  // Effective orientation: each online player always sees their own color at
  // the bottom; the manual Flip button reverses it.
  const effectiveBoardFlipped = playerColor === 'black' ? !boardFlipped : boardFlipped;

  const menuButton =
    'w-full py-4 px-6 rounded-2xl text-white font-semibold text-lg transition-all border border-white/20';

  const renderMenu = () => (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 gap-4">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-5xl font-bold text-white text-center mb-2 tracking-tight">♞ Chess</h1>
        <p className="text-white/50 text-center text-sm mb-6">
          Play locally, battle the bot, or challenge a friend in a private room.
        </p>
        <button onClick={() => startGame('local')} className={`${menuButton} bg-gradient-to-r from-emerald-500/30 to-teal-500/30 hover:from-emerald-500/40 hover:to-teal-500/40`}>
          Play Local
        </button>
        <button onClick={() => setScreen('difficulty')} className={`${menuButton} bg-white/10 hover:bg-white/20`}>
          Play vs Bot
        </button>
        <button onClick={() => setScreen('room-lobby')} className={`${menuButton} bg-white/10 hover:bg-white/20`}>
          Private Room
        </button>
        <button onClick={() => setScreen('time')} className={`${menuButton} bg-white/5 hover:bg-white/15 text-base`}>
          Time Control: {timeControl}
        </button>
        <button onClick={() => setScreen('settings')} className={`${menuButton} bg-white/5 hover:bg-white/15 text-base`}>
          Settings
        </button>
      </div>
    </div>
  );

  const renderLocalGame = () => (
    <div className="relative z-10 min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">
          <div className="space-y-4">
            <ChessBoard
              game={game}
              playerColor={playerColor}
              boardFlipped={effectiveBoardFlipped}
              lockedToPlayerSide={gameMode === 'online'}
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
              canUndo={gameMode !== 'online' && game.history().length > 0}
              onNewGame={() => setScreen('menu')}
              onFlipBoard={() => setBoardFlipped((prev) => !prev)}
              onUndo={undoMove}
              onSurrender={handleSurrender}
              onOpenMenu={() => setScreen('menu')}
            />
          </div>
          <div className="space-y-4">
            <GameInfo
              game={game}
              playerColor={playerColor}
              moveHistory={moveHistory}
              gameMode={gameMode}
              timeControl={timeControl}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const content = useMemo(() => {
    switch (screen) {
      case 'menu':
        return renderMenu();
      case 'difficulty':
        return (
          <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              <DifficultySelect
                onSelect={(d) => startGame('bot', { difficulty: d })}
                onBack={() => setScreen('menu')}
              />
            </div>
          </div>
        );
      case 'time':
        return (
          <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              <TimeControlSelect
                onSelect={(t) => {
                  setTimeControl(t);
                  setScreen('menu');
                }}
                onBack={() => setScreen('menu')}
              />
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="relative z-10">
            <Settings
              settings={settings}
              onSettingsChange={setSettings}
              onBack={() => setScreen('menu')}
            />
          </div>
        );
      case 'room-lobby':
        return (
          <RoomLobby
            onRoomJoined={(joinedRoom, isHost, myColor) => {
              setRoom(joinedRoom);
              setRoomIsHost(isHost);
              setRoomMyColor(myColor);
              setScreen('room-game');
            }}
            onBack={() => setScreen('menu')}
          />
        );
      case 'room-game':
        return room ? (
          <RoomGame
            room={room}
            isHost={roomIsHost}
            myColor={roomMyColor}
            settings={settings}
            onLeave={() => {
              setRoom(null);
              setScreen('menu');
            }}
          />
        ) : (
          renderMenu()
        );
      case 'game':
      default:
        return renderLocalGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, game, moveHistory, settings, playerColor, boardFlipped, timeControl, room, roomIsHost, roomMyColor, pendingPromotion, clock.whiteTime, clock.blackTime, clock.running]);

  return (
    <div className="min-h-screen text-zinc-100">
      <LiquidGlassBackground />
      {content}
    </div>
  );
}
