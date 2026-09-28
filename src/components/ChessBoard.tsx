import { memo, useEffect, useMemo, useState } from 'react';
import { Chess, Move, Square } from 'chess.js';
import { GameMode, GameSettings } from '../App';
import { ChessPiece } from './ChessPiece';
import { formatClock } from '../hooks/useGameClock';

interface ChessBoardProps {
  game: Chess;
  playerColor: 'white' | 'black';
  /** Manual orientation override from the Flip button. */
  boardFlipped?: boolean;
  /** When true the board always shows the local player's pieces at the bottom. */
  lockedToPlayerSide?: boolean;
  gameMode: GameMode;
  onMove: (from: string, to: string, promotion?: string) => boolean;
  settings: GameSettings;
  pendingPromotion: { from: string; to: string } | null;
  onPromotionSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  whiteTime: number;
  blackTime: number;
  clockRunning: boolean;
  /** Local player's side label for online games ("You" / "Opponent"). */
  opponentLabel?: string;
}

const THEME_COLORS = {
  classic: { light: '#f0d9b5', dark: '#b58863' },
  modern: { light: '#e8e8e8', dark: '#4a4a4a' },
  wood: { light: '#deb887', dark: '#8b4513' },
  marble: { light: '#f5f5f5', dark: '#696969' },
} as const;

const PROMOTION_OPTIONS = ['q', 'r', 'b', 'n'] as const;

export const ChessBoard = memo(function ChessBoard({
  game, playerColor, boardFlipped, lockedToPlayerSide, gameMode, onMove, settings,
  pendingPromotion, onPromotionSelect, whiteTime, blackTime, clockRunning,
}: ChessBoardProps) {
  const board = game.board();
  // Online / bot: the local player's side always sits at the bottom so each
  // player sees their own pieces (and colors) correctly. PvP hot-seat: flip
  // with the side to move when auto-flip is enabled.
  const baseFlipped = lockedToPlayerSide || gameMode === 'online'
    ? playerColor === 'black'
    : gameMode === 'bot'
      ? playerColor === 'black' && settings.autoFlipBoard
      : settings.autoFlipBoard && gameMode === 'pvp'
        ? game.turn() === 'b'
        : false;
  // The Flip button toggles orientation relative to the default view.
  const flipped = boardFlipped ? !baseFlipped : baseFlipped;
  const fen = game.fen();

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);

  // Clear selection whenever the position changes (move made, undo, new game).
  useEffect(() => {
    setSelectedSquare(null);
  }, [fen]);

  // Legal destinations for the selected piece – computed only while something
  // is selected, and memoized per position.
  const validTargets = useMemo(() => {
    if (!selectedSquare) return new Set<string>();
    const moves = game.moves({ square: selectedSquare, verbose: true }) as Move[];
    return new Set(moves.map(m => m.to));
  }, [game, selectedSquare, fen]);

  const lastMove = useMemo(() => {
    const history = game.history({ verbose: true }) as Move[];
    return history.length > 0 ? history[history.length - 1] : null;
  }, [game, fen]);

  const inCheckSquare = useMemo(() => {
    if (!game.inCheck()) return null;
    const turn = game.turn();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = board[r][c];
        if (cell && cell.type === 'k' && cell.color === turn) {
          return `${String.fromCharCode(97 + c)}${8 - r}`;
        }
      }
    }
    return null;
  }, [game, fen]); // eslint-disable-line react-hooks/exhaustive-deps

  const canInteract = !pendingPromotion && !game.isGameOver() &&
    (gameMode === 'pvp' || game.turn() === (playerColor === 'white' ? 'w' : 'b'));

  const handleSquareClick = (square: Square) => {
    if (!canInteract) return;
    const piece = game.get(square);

    if (selectedSquare && validTargets.has(square)) {
      const success = onMove(selectedSquare, square);
      if (!success) setSelectedSquare(null); // e.g. promotion dialog opened
      return;
    }

    if (piece && piece.color === game.turn()) {
      setSelectedSquare(prev => (prev === square ? null : square));
      return;
    }

    setSelectedSquare(null);
  };

  const renderSquare = (rowIndex: number, colIndex: number) => {
    const actualRow = flipped ? 7 - rowIndex : rowIndex;
    const actualCol = flipped ? 7 - colIndex : colIndex;
    const square = `${String.fromCharCode(97 + actualCol)}${8 - actualRow}` as Square;
    const piece = board[actualRow][actualCol];
    const isLight = (actualRow + actualCol) % 2 === 0;

    const colors = THEME_COLORS[settings.boardTheme];
    let bgColor: string = isLight ? colors.light : colors.dark;

    if (lastMove && (lastMove.from === square || lastMove.to === square)) {
      bgColor = 'rgba(255, 235, 59, 0.55)';
    }
    if (selectedSquare === square) {
      bgColor = '#7fc97f';
    }
    const isTarget = validTargets.has(square);
    const isCheckSq = inCheckSquare === square;

    return (
      <div
        key={square}
        className="aspect-square flex items-center justify-center cursor-pointer relative select-none"
        style={{ backgroundColor: bgColor }}
        onClick={() => handleSquareClick(square)}
        role="button"
        aria-label={`Square ${square}${piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ' empty'}`}
      >
        {piece && (
          <div className="z-10 transition-transform hover:scale-110 w-full h-full flex items-center justify-center">
            <ChessPiece type={piece.type} color={piece.color} size={50} />
          </div>
        )}
        {/* Check highlight */}
        {isCheckSq && (
          <div className="absolute inset-0 bg-red-500/50 pointer-events-none" />
        )}
        {/* Valid move indicator */}
        {isTarget && !piece && (
          <div className="absolute w-1/3 h-1/3 rounded-full bg-black/30 pointer-events-none" />
        )}
        {/* Capture indicator */}
        {isTarget && piece && (
          <div className="absolute inset-1 rounded-full border-4 border-black/30 pointer-events-none" />
        )}
        {settings.showCoordinates && rowIndex === 7 && (
          <span className="absolute bottom-1 right-1 text-xs font-bold opacity-50 pointer-events-none">
            {String.fromCharCode(97 + actualCol)}
          </span>
        )}
        {settings.showCoordinates && colIndex === 0 && (
          <span className="absolute top-1 left-1 text-xs font-bold opacity-50 pointer-events-none">
            {8 - actualRow}
          </span>
        )}
      </div>
    );
  };

  const topIsWhite = flipped;
  const topTime = topIsWhite ? whiteTime : blackTime;
  const bottomTime = topIsWhite ? blackTime : whiteTime;
  // In online games the sides are fixed to the local player's perspective.
  const isOnline = gameMode === 'online';
  const topLabel = isOnline
    ? (playerColor === 'white' ? 'Opponent' : 'You')
    : (topIsWhite ? 'White' : 'Black');
  const bottomLabel = isOnline
    ? (playerColor === 'white' ? 'You' : 'Opponent')
    : (topIsWhite ? 'Black' : 'White');
  const topActive = game.turn() === (topIsWhite ? 'w' : 'b');
  const bottomActive = !topActive;

  const clockBar = (label: string, time: number, active: boolean) => (
    <div
      className="flex items-center justify-between px-4 py-2 rounded-xl mb-2 transition-all"
      style={{
        background: active && clockRunning ? 'rgba(127,201,127,0.25)' : 'rgba(0,0,0,0.3)',
        border: `1px solid ${active && clockRunning ? 'rgba(127,201,127,0.6)' : 'rgba(255,255,255,0.12)'}`,
      }}
    >
      <span className="text-white/80 font-medium text-sm">{label}</span>
      <span className={`font-mono text-lg font-bold ${time <= 30 && active ? 'text-red-400' : 'text-white'}`}>
        {formatClock(time)}
      </span>
    </div>
  );

  return (
    <div className="relative w-full max-w-[600px] mx-auto">
      {clockBar(topLabel, topTime, topActive)}
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(25px)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div className="grid grid-cols-8 gap-0">
          {board.map((_, rowIndex) => [0, 1, 2, 3, 4, 5, 6, 7].map(colIndex => renderSquare(rowIndex, colIndex)))}
        </div>

        {/* Promotion picker overlay */}
        {pendingPromotion && (
          <div className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 space-y-2">
              <p className="text-white text-center font-semibold mb-2">Promote to:</p>
              <div className="flex gap-2">
                {PROMOTION_OPTIONS.map(p => (
                  <button
                    key={p}
                    onClick={() => onPromotionSelect(p)}
                    className="w-16 h-16 bg-white/10 hover:bg-white/30 border border-white/20 rounded-xl flex items-center justify-center transition-all"
                    aria-label={`Promote to ${p === 'q' ? 'queen' : p === 'r' ? 'rook' : p === 'b' ? 'bishop' : 'knight'}`}
                  >
                    <ChessPiece type={p} color={game.turn()} size={48} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {clockBar(bottomLabel, bottomTime, bottomActive)}
    </div>
  );
});
