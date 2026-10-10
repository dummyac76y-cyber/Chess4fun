import { memo } from 'react';

interface ChessPieceProps {
  type: 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
  color: 'w' | 'b';
  size?: number;
}

// Clear, standard chess silhouettes instead of the previous abstract mini-icons.
const GLYPHS: Record<ChessPieceProps['type'], { white: string; black: string; label: string }> = {
  k: { white: '♔', black: '♚', label: 'King' },
  q: { white: '♕', black: '♛', label: 'Queen' },
  r: { white: '♖', black: '♜', label: 'Rook' },
  b: { white: '♗', black: '♝', label: 'Bishop' },
  n: { white: '♘', black: '♞', label: 'Knight' },
  p: { white: '♙', black: '♟', label: 'Pawn' },
};

export const ChessPiece = memo(function ChessPiece({ type, color, size = 60 }: ChessPieceProps) {
  const piece = GLYPHS[type];
  const isWhite = color === 'w';
  return (
    <span
      aria-label={`${isWhite ? 'White' : 'Black'} ${piece.label}`}
      role="img"
      className={`chess-piece-glyph ${isWhite ? 'chess-piece-white' : 'chess-piece-black'}`}
      style={{ fontSize: `${size * 0.76}px` }}
    >
      {piece.black}
    </span>
  );
});
