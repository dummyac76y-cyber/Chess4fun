// ==========================================
// 1. START GAME
// Replace your existing startGame with this
// ==========================================

const startGame = useCallback(
  (
    mode: GameMode,
    opts?: {
      difficulty?: Difficulty;
      time?: TimeControl;
      playerColor?: 'white' | 'black';
      room?: string;
    }
  ) => {
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

    const color: 'white' | 'black' = opts?.playerColor ?? 'white';

    // IMPORTANT:
    // The selected player color is the source of truth.
    setPlayerColor(color);
    onlineColorRef.current = color;
    setGameMode(mode);

    // DO NOT do:
    // setBoardFlipped(false);

    // Reset only the manual flip state.
    setBoardFlipped(false);

    setScreen('game');

    if (mode === 'online') {
      postRoom({
        t: 'start',
        id: myIdRef.current,
        fen: lastBroadcastFenRef.current,
        color,
        game: gameIdRef.current,
      });
    }

    if (mode === 'bot' && color === 'black') {
      window.setTimeout(() => clock.start(), 600);
    }
  },
  [clock, postRoom, timeControl]
);

startGameRef.current = startGame;


// ==========================================
// 2. ONLINE START MESSAGE
// Replace your existing case 'start' with this
// ==========================================

case 'start': {
  // Host is White, guest is Black.
  const myColor: 'white' | 'black' =
    isHostRef.current
      ? (msg.color === 'black' ? 'black' : 'white')
      : (msg.color === 'white' ? 'black' : 'white');

  setPlayerColor(myColor);
  onlineColorRef.current = myColor;
  setGameMode('online');
  setScreen('game');

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

  // Reset only the manual flip.
  setBoardFlipped(false);

  rerender();
  break;
}


// ==========================================
// 3. EFFECTIVE BOARD ORIENTATION
// Put this immediately before the game-screen return
// ==========================================

// White = normal orientation
// Black = rotated 180 degrees
//
// boardFlipped is still the manual Flip button.
// This means the manual Flip reverses whichever
// orientation belongs to the current player.

const effectiveBoardFlipped =
  playerColor === 'black'
    ? !boardFlipped
    : boardFlipped;


// ==========================================
// 4. CHESSBOARD COMPONENT
// Replace boardFlipped={boardFlipped}
// with boardFlipped={effectiveBoardFlipped}
// ==========================================

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


// ==========================================
// 5. FLIP BUTTON
// Keep this exactly like this
// ==========================================

<Controls
  canUndo={gameMode !== 'online' && game.history().length > 0}
  onNewGame={() => setScreen('menu')}
  onFlipBoard={() => setBoardFlipped(prev => !prev)}
  onUndo={undoMove}
  onSurrender={handleSurrender}
  onOpenMenu={() => setIsMenuOpen(true)}
/>