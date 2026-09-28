import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from './components/ChessBoard';
import { GameInfo } from './components/GameInfo';
import { Controls } from './components/Controls';
import { Settings } from './components/Settings';
import { Analysis } from './components/Analysis';
import { PointsSystem } from './components/PointsSystem';
import { LiquidGlassBackground } from './components/LiquidGlassBackground';
import { GameMenu } from './components/GameMenu';
import { TimeControlSelect } from './components/TimeControlSelect';
import { DifficultySelect } from './components/DifficultySelect';
import { findBestMove } from './utils/chessBot';
import { playSound } from './utils/sound';
import { useGameClock } from './hooks/useGameClock';
import {
  RoomMessage, claimSeat, clearRoom, makeClientId, makeRoomId, readRoom, touchHost, writeRoom,
} from './utils/room';

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
  playerName: string;
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
  playerName: 'Player',
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
  // Pure board-orientation override for the Flip button. It NEVER changes
  // which color you actually play or how the pieces are drawn – it only
  // rotates the view. Each client keeps its own value so both players can
  // watch the same synced game from their own perspective.
  const [boardFlipped, setBoardFlipped] = useState(false);
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
  // Online private-room state. There is no external server: two browser tabs
  // on this machine join the same room and play against each other – one as
  // White, one as Black – with every move broadcast over a BroadcastChannel
  // so both boards show the identical, visually synced position from each
  // player's own perspective (their own color always at the bottom).
  const [onlineRoom, setOnlineRoom] = useState<string | null>(null);
  const [peerConnected, setPeerConnected] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [roomError, setRoomError] = useState<string | null>(null);
  const [roomNote, setRoomNote] = useState<string | null>(null);
  const onlineColorRef = useRef<'white' | 'black'>('white');
  onlineColorRef.current = playerColor;
  const gameModeRef = useRef<GameMode>('bot');
  gameModeRef.current = gameMode;
  const screenRef = useRef<Screen>('menu');
  screenRef.current = screen;
  const channelRef = useRef<BroadcastChannel | null>(null);
  const myIdRef = useRef<string>('');
  const onlineRoomRef = useRef<string | null>(null);
  onlineRoomRef.current = onlineRoom;
  const heartbeatRef = useRef<number | null>(null);
  const hostCheckRef = useRef<number | null>(null);
  const isHostRef = useRef(false);
  const gameIdRef = useRef(0);
  const lastBroadcastFenRef = useRef<string>('');
  const rematchPendingRef = useRef(false);

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

  // Bot / remote-opponent reply logic - applied after the player's move.
  const applyReplyMove = useCallback((move: { from: string; to: string; promotion?: string }) => {
    const g = gameRef.current;
    if (g.isGameOver()) return;
    const applied = g.move({ from: move.from, to: move.to, promotion: move.promotion });
    if (!applied) return;
    afterMoveEffects(applied.san, !!applied.captured, g);
    rerender();
  }, [afterMoveEffects, rerender]);

  // ---- Online private-room helpers ----------------------------------------

  const postRoom = useCallback((msg: RoomMessage) => {
    channelRef.current?.postMessage(msg);
  }, []);

  const leaveRoom = useCallback(() => {
    if (channelRef.current && myIdRef.current) {
      postRoom({ t: 'leave', id: myIdRef.current });
    }
    if (onlineRoomRef.current) clearRoom(onlineRoomRef.current);
    channelRef.current?.close();
    channelRef.current = null;
    if (heartbeatRef.current !== null) { window.clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    if (hostCheckRef.current !== null) { window.clearInterval(hostCheckRef.current); hostCheckRef.current = null; }
    isHostRef.current = false;
    myIdRef.current = '';
    onlineRoomRef.current = null;
    setOnlineRoom(null);
    setPeerConnected(false);
  }, [postRoom]);

  /** Opens a fresh position in an online room and broadcasts it to the peer. */
  const resetOnlineGame = useCallback(() => {
    gameIdRef.current += 1;
    gameRef.current = new Chess();
    lastBroadcastFenRef.current = gameRef.current.fen();
    setMoveHistory([]);
    setAnalysis(null);
    setResultModal(null);
    setPendingPromotion(null);
    gameOverProcessedRef.current = false;
    rematchPendingRef.current = false;
    clock.reset(timeControl);
    rerender();
    postRoom({ t: 'start', id: myIdRef.current, fen: lastBroadcastFenRef.current, color: 'white', game: gameIdRef.current });
  }, [clock, postRoom, rerender, timeControl]);

  /** Host-side watchdog: starts the game once both seats are filled. Uses a
   * ref so it doesn't depend on startGame's declaration order. */
  const startGameRef = useRef<(mode: GameMode, opts?: { difficulty?: Difficulty; time?: TimeControl; playerColor?: 'white' | 'black'; room?: string }) => void>(() => {});
  const checkStartRoom = useCallback(() => {
    const room = onlineRoomRef.current;
    if (!room || !isHostRef.current) return;
    const a = readRoom(room);
    if (a?.guestId && screenRef.current === 'matchmaking') {
      setPeerConnected(true);
      startGameRef.current('online', { time: timeControl, playerColor: 'white', room });
    }
  }, [timeControl]);

  const joinRoom = useCallback((rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) { setRoomError('Enter a room code.'); return; }
    if (typeof BroadcastChannel === 'undefined') {
      setRoomError('This browser does not support rooms. Use Local 2 Player instead.');
      return;
    }
    leaveRoom();
    const myId = makeClientId();
    myIdRef.current = myId;
    const seat = claimSeat(code, myId);
    if (!seat) {
      setRoomError('Room is full – both seats are taken by live players.');
      return;
    }
    isHostRef.current = seat.role === 'host';
    setRoomError(null);
    setOnlineRoom(code);
    setPeerConnected(seat.role === 'guest');

    const ch = new BroadcastChannel(`chess-room-${code}`);
    channelRef.current = ch;
    ch.onmessage = (ev: MessageEvent<RoomMessage>) => {
      const msg = ev.data;
      if (!msg || typeof msg !== 'object' || msg.id === myId) return;
      switch (msg.t) {
        case 'hello': {
          setPeerConnected(true);
          if (isHostRef.current) postRoom({ t: 'welcome', id: myId, to: msg.id });
          break;
        }
        case 'welcome': {
          if (msg.to === myId) setPeerConnected(true);
          break;
        }
        case 'start': {
          if (screenRef.current !== 'game') {
            setPlayerColor(msg.color);
            setGameMode('online');
            setScreen('game');
          }
          gameIdRef.current = msg.game;
          gameRef.current = new Chess(msg.fen);
          lastBroadcastFenRef.current = msg.fen;
          setMoveHistory([]);
          setAnalysis(null);
          setResultModal(null);
          setPendingPromotion(null);
          gameOverProcessedRef.current = false;
          rematchPendingRef.current = false;
          clock.reset(timeControl);
          rerender();
          break;
        }
        case 'move': {
          const g = gameRef.current;
          if (g.isGameOver()) return;
          let applied = null;
          try { applied = g.move(msg.san); } catch { applied = null; }
          if (!applied) return; // ignore out-of-sync / illegal messages
          gameIdRef.current = msg.game;
          lastBroadcastFenRef.current = g.fen();
          afterMoveEffects(applied.san, !!applied.captured, g);
          rerender();
          break;
        }
        case 'result': {
          if (gameOverProcessedRef.current) return;
          gameOverProcessedRef.current = true;
          clock.pause();
          const draw = msg.winner === null;
          const iWon = !draw && msg.winner === onlineColorRef.current;
          const outcome: 'win' | 'loss' | 'draw' = draw ? 'draw' : iWon ? 'win' : 'loss';
          const titles: Record<string, string> = {
            surrender: iWon ? 'Opponent resigned!' : 'You surrendered.',
            timeout: iWon ? 'Opponent flagged!' : 'You ran out of time.',
            checkmate: iWon ? 'Checkmate - You Win!' : 'Checkmate - You Lost',
            stalemate: 'Stalemate - Draw!',
            draw: 'Draw!',
          };
          recordResult(outcome, difficulty);
          setResultModal({
            title: titles[msg.reason] ?? 'Game over',
            subtitle: msg.reason === 'surrender' ? (iWon ? 'Your opponent gave up.' : 'You left the game.')
              : msg.reason === 'timeout' ? 'Won on time.'
              : 'Great game!',
            outcome,
          });
          break;
        }
        case 'rematch': {
          rematchPendingRef.current = true;
          setIsMenuOpen(false);
          setResultModal({ title: 'Rematch offer!', subtitle: 'Your opponent wants to play again.', outcome: 'draw' });
          break;
        }
        case 'leave': {
          setPeerConnected(false);
          break;
        }
      }
    };

    postRoom({ t: 'hello', id: myId });
    heartbeatRef.current = window.setInterval(() => {
      if (isHostRef.current && onlineRoomRef.current) touchHost(onlineRoomRef.current, myId);
      postRoom({ t: 'hello', id: myId });
    }, 5000);
    if (seat.role === 'guest') {
      hostCheckRef.current = window.setInterval(() => {
        const room = onlineRoomRef.current;
        if (!room) return;
        const a = readRoom(room);
        if (!a || !a.hostId || a.hostId === myId) {
          // Host tab died – take over the room.
          writeRoom(room, { hostId: myId, guestId: null });
          isHostRef.current = true;
          setPlayerColor('white');
          onlineColorRef.current = 'white';
          resetOnlineGame();
        }
      }, 6000);
    } else {
      touchHost(code, myId);
    }
  }, [afterMoveEffects, clock, difficulty, leaveRoom, postRoom, recordResult, rerender, resetOnlineGame, timeControl]);

  const createRoom = useCallback(() => {
    const code = makeRoomId();
    joinRoom(code);
    setRoomNote(`Room ${code} created – share the code so a friend can join from another tab.`);
  }, [joinRoom]);

  // Start new game.
  const startGame = useCallback((mode: GameMode, opts?: { difficulty?: Difficulty; time?: TimeControl; playerColor?: 'white' | 'black'; room?: string }) => {
    if (botTimerRef.current !== null) {
      window.clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
    if (opts?.difficulty) setDifficulty(opts.difficulty);
    const time = opts?.time ?? timeControl;
    setTimeControl(time);

    gameIdRef.current += 1;
    gameRef.current = new Chess();
    lastBroadcastFenRef.current = gameRef.current.fen();
    setMoveHistory([]);
    setAnalysis(null);
    setResultModal(null);
    setPendingPromotion(null);
    gameOverProcessedRef.current = false;
    rematchPendingRef.current = false;
    clock.reset(time);
    const color = opts?.playerColor ?? 'white';
    setPlayerColor(color);
    setGameMode(mode);
    // Every client always sees its own pieces at the bottom. The Flip button
    // only rotates the view – it never changes which color you play.
    setBoardFlipped(false);
    setScreen('game');

    // Online host broadcasts the fresh position to the peer tab in the room.
    if (mode === 'online') {
      postRoom({ t: 'start', id: myIdRef.current, fen: lastBroadcastFenRef.current, color, game: gameIdRef.current });
    }

    // If the bot plays White it opens the game and the clock starts with it.
    if (mode === 'bot' && color === 'black') {
      window.setTimeout(() => clock.start(), 600);
    }
  }, [clock, postRoom, timeControl]);
  startGameRef.current = startGame;

  const handleTimeControlSelect = useCallback((time: TimeControl) => {
    startGame('bot', { difficulty, time });
  }, [startGame, difficulty]);

  const handleDifficultySelect = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    setScreen('timeControl');
  }, []);

  const makeBotMove = useCallback((difficultyLevel: Difficulty) => {
    const g = gameRef.current;
    if (g.isGameOver()) return;
    const move = findBestMove(g.fen(), difficultyLevel);
    if (!move) return;
    applyReplyMove(move);
  }, [applyReplyMove]);

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

    // Online rooms are played against a real peer in another tab – never
    // against the engine. Guard against moving out of turn.
    if (gameMode === 'online') {
      const myColor = playerColor === 'white' ? 'w' : 'b';
      if (g.turn() !== myColor) return false;
    }

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

    if (gameMode === 'online') {
      // Broadcast the SAN so the other client applies the exact same move on
      // its own board – both positions stay identical and visually synced.
      lastBroadcastFenRef.current = g.fen();
      postRoom({ t: 'move', id: myIdRef.current, san: move.san, game: gameIdRef.current });
    } else if (gameMode === 'bot' && !g.isGameOver() && g.turn() !== (playerColor === 'white' ? 'w' : 'b')) {
      scheduleBotMove();
    }
    return true;
  }, [afterMoveEffects, gameMode, pendingPromotion, playerColor, postRoom, rerender, scheduleBotMove]);

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

    // Online: tell the peer tab the final result so both screens agree.
    if (gameMode === 'online') {
      const reason: 'timeout' | 'checkmate' | 'stalemate' | 'draw' =
        timedOut ? 'timeout' : game.isCheckmate() ? 'checkmate' : game.isStalemate() ? 'stalemate' : 'draw';
      const winner: 'white' | 'black' | null =
        reason === 'timeout' ? clock.timeoutWinner
        : reason === 'checkmate' ? (game.turn() === 'w' ? 'black' : 'white')
        : null;
      postRoom({ t: 'result', id: myIdRef.current, reason, winner });
    }
  }, [clock, difficulty, game, gameMode, playerColor, postRoom, recordResult, screen]);

  // ---- Room lifecycle -------------------------------------------------------

  // Host watchdog: start the match as soon as a guest claims the second seat.
  useEffect(() => {
    if (screen !== 'matchmaking' || !onlineRoom || !isHostRef.current) return;
    const interval = window.setInterval(checkStartRoom, 800);
    return () => window.clearInterval(interval);
  }, [checkStartRoom, onlineRoom, screen]);

  // Leaving the game screen closes the room connection cleanly.
  useEffect(() => {
    if (screen !== 'game' && gameModeRef.current === 'online') {
      leaveRoom();
    }
  }, [leaveRoom, screen]);

  // Notify the peer when this tab goes away (refresh / close).
  useEffect(() => {
    const onUnload = () => {
      if (channelRef.current && myIdRef.current) {
        channelRef.current.postMessage({ t: 'leave', id: myIdRef.current } satisfies RoomMessage);
        if (onlineRoomRef.current) clearRoom(onlineRoomRef.current);
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  // Cleanup pending timers on unmount.
  useEffect(() => () => {
    if (botTimerRef.current !== null) window.clearTimeout(botTimerRef.current);
    if (heartbeatRef.current !== null) window.clearInterval(heartbeatRef.current);
    if (hostCheckRef.current !== null) window.clearInterval(hostCheckRef.current);
    channelRef.current?.close();
  }, []);

  const handleSurrender = useCallback(() => {
    if (!gameOverProcessedRef.current) {
      gameOverProcessedRef.current = true;
      if (gameMode !== 'pvp') recordResult('loss', difficulty);
      if (gameMode === 'online') {
        postRoom({
          t: 'result', id: myIdRef.current, reason: 'surrender',
          winner: playerColor === 'white' ? 'black' : 'white',
        });
      }
    }
    clock.pause();
    setIsMenuOpen(false);
    setResultModal(null);
    setScreen('menu');
  }, [clock, difficulty, gameMode, playerColor, postRoom, recordResult]);

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
    // Online: accept a pending rematch offer by restarting the room game.
    if (gameMode === 'online') {
      if (rematchPendingRef.current) {
        rematchPendingRef.current = false;
        setResultModal(null);
        startGame('online', { time: timeControl, playerColor });
        return;
      }
      // Otherwise propose a rematch to the peer and wait for their accept.
      postRoom({ t: 'rematch', id: myIdRef.current });
      setResultModal({ title: 'Rematch offered', subtitle: 'Waiting for your opponent to accept…', outcome: 'draw' });
      return;
    }
    setResultModal(null);
    startGame(gameMode, { difficulty, time: timeControl, playerColor });
  }, [difficulty, gameMode, playerColor, postRoom, startGame, timeControl]);

  const primaryButton = 'w-full py-3 rounded-xl bg-zinc-100 text-zinc-900 font-medium text-[15px] hover:bg-white transition-colors';
  const secondaryButton = 'w-full py-3 rounded-xl border border-zinc-800 text-zinc-200 font-medium text-[15px] hover:bg-zinc-800/60 transition-colors';
  const ghostButton = 'py-2.5 px-4 rounded-lg border border-zinc-800 text-sm text-zinc-300 hover:bg-zinc-800/60 transition-colors';
  const panel = 'rounded-xl border border-zinc-800 bg-white/[0.03] p-6 space-y-6';

  // ---- Screens -------------------------------------------------------------

  if (screen === 'menu') {
    return (
      <div className="relative min-h-screen">
        <LiquidGlassBackground />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-8">
            <header className="text-center">
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-100">Chess</h1>
              <p className="text-sm text-zinc-500 mt-2">
                {settings.playerName} · {stats.points} pts · Rank {Math.floor(stats.points / 100)}
              </p>
            </header>

            <div className="space-y-2.5">
              <button onClick={() => setScreen('difficulty')} className={primaryButton}>
                Play vs Bot
              </button>
              <button onClick={() => startGame('pvp', { time: 'unlimited' })} className={secondaryButton}>
                Local 2 Player
              </button>
              <button onClick={startMatchmaking} className={secondaryButton}>
                Private Room
              </button>
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button onClick={() => setScreen('stats')} className={ghostButton}>Statistics</button>
                <button onClick={() => setScreen('settings')} className={ghostButton}>Settings</button>
              </div>
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
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className={panel}>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Private Room</h2>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Create a room, then open this app in a second browser tab and join with the same
                  code. One player gets White, the other Black — each sees their own pieces at the
                  bottom and every move is synced live between the two tabs.
                </p>
              </div>

              {onlineRoom ? (
                <div className="space-y-5 text-center">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Room code</p>
                    <p className="text-4xl font-mono font-semibold tracking-[0.3em] text-zinc-100 select-all">
                      {onlineRoom}
                    </p>
                  </div>
                  {isHostRef.current && !peerConnected ? (
                    <p className="flex items-center justify-center gap-3 text-sm text-zinc-400">
                      <span className="w-4 h-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
                      Waiting for a player to join…
                    </p>
                  ) : peerConnected ? (
                    <p className="text-sm font-medium text-emerald-400">Opponent connected — starting…</p>
                  ) : null}
                  <button onClick={() => { leaveRoom(); setRoomNote(null); }} className={secondaryButton}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button onClick={createRoom} className={primaryButton}>
                    Create Private Room
                  </button>

                  <div className="flex items-center gap-3 text-zinc-600 text-xs">
                    <div className="flex-1 h-px bg-zinc-800" /> or join an existing room <div className="flex-1 h-px bg-zinc-800" />
                  </div>

                  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); joinRoom(roomInput); }}>
                    <input
                      value={roomInput}
                      onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                      placeholder="ROOM CODE"
                      maxLength={8}
                      className="flex-1 px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 font-mono tracking-widest text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                    <button type="submit" className={ghostButton}>
                      Join
                    </button>
                  </form>

                  {roomError && <p className="text-red-400 text-sm text-center">{roomError}</p>}
                  {roomNote && <p className="text-zinc-500 text-sm text-center">{roomNote}</p>}

                  <button onClick={() => setScreen('menu')} className={`${secondaryButton} mt-2`}>
                    Back to Main Menu
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
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
          playerName={settings.playerName}
        />
      </div>
    );
  }

  // ---- Game screen ----------------------------------------------------------

  const undoMove = () => {
    // Undoing is only fair against the bot or in local hot-seat PvP. In an
    // online room every move is final (it was already broadcast to the peer).
    if (gameMode === 'online') return;
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
                boardFlipped={boardFlipped}
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
                onFlipBoard={() => setBoardFlipped(prev => !prev)}
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
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-[#131315] p-6 space-y-4 text-center shadow-2xl shadow-black/50">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">{resultModal.title}</h2>
            <p className="text-sm text-zinc-500">{resultModal.subtitle}</p>
            {gameMode !== 'pvp' && (
              <p className="text-zinc-500 text-sm">
                {resultModal.outcome === 'win'
                  ? `+${10 * (difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1)} points`
                  : resultModal.outcome === 'draw' ? '+2 points' : 'No points'} · Total: {stats.points}
              </p>
            )}
            <div className="space-y-2.5 pt-2">
              <button onClick={rematch} className={primaryButton}>
                Rematch
              </button>
              <button onClick={closeGameAndReturnToMenu} className={secondaryButton}>
                Back to Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
