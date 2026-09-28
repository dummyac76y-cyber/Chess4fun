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


        style={{ backgroundColor: bgColor }}
        onClick={() => handleSquareClick(square)}
        role="button"
        aria-label={`Square ${square}${piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ' empty'}`}
      >
        {piece && (
          </div>
        )}
        {/* Check highlight */}
        {isCheckSq && (
          <div className="absolute inset-0 bg-red-500/50 pointer-events-none" />
        )}
        {/* Valid move indicator */}

          <span className="absolute bottom-1 right-1 text-xs font-bold opacity-50 pointer-events-none">
            {String.fromCharCode(97 + actualCol)}
          </span>
        )}

          <span className="absolute top-1 left-1 text-xs font-bold opacity-50 pointer-events-none">
            {8 - actualRow}
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
      <span className="text-zinc-300 font-medium text-sm">{label}</span>
      <span className={`font-mono text-lg font-bold ${time <= 30 && active ? 'text-red-400' : 'text-zinc-100'}`}>
        {formatClock(time)}
      </span>
    </div>
  );

  return (
    <div className="relative w-full max-w-[600px] mx-auto">

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
