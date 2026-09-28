import { memo, useMemo, useState } from 'react';
import { Chess, Square } from 'chess.js';
import { GameMode, GameSettings } from '../types';
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
  pendingPromotion, onPromotionSelect, whiteTime, blackTime, clockRunning, opponentLabel,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);

  const board = game.board();

  // Online play is always locked so each player sees their own color at the
  // bottom; locally the setting/flip button decide orientation.
  const flipped = lockedToPlayerSide || gameMode === 'online'
    ? playerColor === 'black' !== !!boardFlipped
    : (boardFlipped ?? (settings.autoFlipBoard && game.turn() === 'b'));

  const theme = THEME_COLORS[settings.boardTheme] ?? THEME_COLORS.classic;

  const legalTargets = useMemo(() => {
    if (!selectedSquare) return new Set<string>();
    try {
      return new Set(
        game.moves({ square: selectedSquare, verbose: true }).map((m) => m.to)
      );
    } catch {
      return new Set<string>();
    }
  }, [game, game.fen(), selectedSquare]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkSquare = useMemo<Square | null>(() => {
    if (!game.inCheck()) return null;
    const turn = game.turn();
    for (const row of game.board()) {
      for (const sq of row) {
        if (sq && sq.type === 'k' && sq.color === turn) {
          return (sq as unknown as { square: Square }).square ?? null;
        }
      }
    }
    return null;
  }, [game, game.fen()]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSquareClick = (square: Square) => {
    // In online games you can only interact on your own turn.
    if (gameMode === 'online') {
      const myTurn = game.turn() === (playerColor === 'white' ? 'w' : 'b');
      if (!myTurn) return;
    }

    const piece = game.get(square);

    // Selecting one of our own pieces.
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(prev => (prev === square ? null : square));
      return;
    }

    // Attempting a move from the selected square.
    if (selectedSquare) {
      const moved = onMove(selectedSquare, square);
      if (moved) {
        setSelectedSquare(null);
        return;
      }
    }

    setSelectedSquare(null);
  };

  const renderSquare = (rowIndex: number, colIndex: number) => {
    const actualRow = flipped ? 7 - rowIndex : rowIndex;
    const actualCol = flipped ? 7 - colIndex : colIndex;
    const square = `${String.fromCharCode(97 + actualCol)}${8 - actualRow}` as Square;
    const piece = board[actualRow][actualCol];
    const isLight = (actualRow + actualCol) % 2 === 0;
    const bgColor = isLight ? theme.light : theme.dark;
    const isSelected = selectedSquare === square;
    const isTarget = legalTargets.has(square);
    const isCheckSq = checkSquare === square;

    return (
      <button
        key={square}
        type="button"
        className="relative aspect-square flex items-center justify-center"
        style={{ backgroundColor: bgColor }}
        onClick={() => handleSquareClick(square)}
        role="button"
        aria-label={`Square ${square}${piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ' empty'}`}
      >
        {piece && (
          <span className={`w-[85%] h-[85%] flex items-center justify-center ${isSelected ? 'scale-110' : ''} transition-transform`}>
            <ChessPiece type={piece.type} color={piece.color} size={60} />
          </span>
        )}
        {/* Selection highlight */}
        {isSelected && (
          <div className="absolute inset-0 ring-4 ring-inset ring-emerald-400/80 pointer-events-none" />
        )}
        {/* Check highlight */}
        {isCheckSq && (
          <div className="absolute inset-0 bg-red-500/50 pointer-events-none" />
        )}
        {/* Valid move indicator */}
        {isTarget && (
          piece
            ? <div className="absolute inset-0 ring-4 ring-inset ring-emerald-500/70 pointer-events-none rounded-sm" />
            : <div className="absolute w-1/4 h-1/4 rounded-full bg-black/25 pointer-events-none" />
        )}
        {/* Coordinates */}
        {settings.showCoordinates && colIndex === 0 && (
          <span className="absolute top-1 left-1 text-xs font-bold opacity-50 pointer-events-none">
            {8 - actualRow}
          </span>
        )}
        {settings.showCoordinates && rowIndex === 7 && (
          <span className="absolute bottom-1 right-1 text-xs font-bold opacity-50 pointer-events-none">
            {String.fromCharCode(97 + actualCol)}
          </span>
        )}
      </button>
    );
  };

  const topIsWhite = flipped;
  const topTime = topIsWhite ? whiteTime : blackTime;
  const bottomTime = topIsWhite ? blackTime : whiteTime;
  // In online games the sides are fixed to the local player's perspective.
  const isOnline = gameMode === 'online';
  const topLabel = isOnline
    ? (playerColor === 'white' ? (opponentLabel ?? 'Opponent') : 'You')
    : (topIsWhite ? 'White' : 'Black');
  const bottomLabel = isOnline
    ? (playerColor === 'white' ? 'You' : (opponentLabel ?? 'Opponent'))
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
      <span className="text-zinc-300 font-medium text-sm">{label}</span>
      <span className={`font-mono text-lg font-bold ${time <= 30 && active ? 'text-red-400' : 'text-zinc-100'}`}>
        {formatClock(time)}
      </span>
    </div>
  );

  return (
    <div className="relative w-full max-w-[600px] mx-auto">
      {clockBar(topLabel, topTime, topActive)}
      <div className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-black/40">
        <div className="grid grid-cols-8 gap-0">
          {board.map((_, rowIndex) => [0, 1, 2, 3, 4, 5, 6, 7].map(colIndex => renderSquare(rowIndex, colIndex)))}
        </div>

        {/* Promotion picker overlay */}
        {pendingPromotion && (
          <div className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center">
            <div className="bg-zinc-800/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 space-y-2">
              <p className="text-zinc-100 text-center font-semibold mb-2">Promote to:</p>
              <div className="flex gap-2">
                {PROMOTION_OPTIONS.map(p => (
                  <button
                    key={p}
                    onClick={() => onPromotionSelect(p)}
                    className="w-16 h-16 bg-zinc-800 hover:bg-zinc-700 border border-zinc-800 rounded-xl flex items-center justify-center transition-all"
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
