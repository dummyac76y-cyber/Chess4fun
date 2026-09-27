import { Chess } from 'chess.js';
import { GameSettings } from '../App';

interface ChessBoardProps {
  game: Chess;
  playerColor: 'white' | 'black';
  onMove: (from: string, to: string, promotion?: string) => boolean;
  settings: GameSettings;
}

export function ChessBoard({ game, playerColor, onMove, settings }: ChessBoardProps) {
  const board = game.board();
  const flipped = settings.autoFlipBoard ? playerColor === 'black' : false;
  
  const handleSquareClick = (row: number, col: number) => {
    // This is a simplified version - in a real app you'd track selected squares
    console.log('Square clicked:', row, col);
  };

  const renderSquare = (piece: any, row: number, col: number) => {
    const actualRow = flipped ? 7 - row : row;
    const actualCol = flipped ? 7 - col : col;
    const isLight = (actualRow + actualCol) % 2 === 0;
    
    // Board theme colors
    const themeColors = {
      classic: { light: '#f0d9b5', dark: '#b58863' },
      modern: { light: '#e8e8e8', dark: '#4a4a4a' },
      wood: { light: '#deb887', dark: '#8b4513' },
      marble: { light: '#f5f5f5', dark: '#696969' },
    };
    
    const colors = themeColors[settings.boardTheme];
    const bgColor = isLight ? colors.light : colors.dark;
    
    const pieceUnicode = piece ? getPieceUnicode(piece) : '';
    
    return (
      <div
        key={`${row}-${col}`}
        className="aspect-square flex items-center justify-center cursor-pointer hover:brightness-110 transition-all"
        style={{ backgroundColor: bgColor }}
        onClick={() => handleSquareClick(row, col)}
      >
        {pieceUnicode && (
          <span className="text-4xl sm:text-5xl md:text-6xl select-none drop-shadow-lg">
            {pieceUnicode}
          </span>
        )}
        {settings.showCoordinates && row === 7 && (
          <span className="absolute bottom-1 right-1 text-xs font-bold opacity-50">
            {String.fromCharCode(97 + actualCol)}
          </span>
        )}
        {settings.showCoordinates && col === 0 && (
          <span className="absolute top-1 left-1 text-xs font-bold opacity-50">
            {8 - actualRow}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-[600px] mx-auto">
      <div 
        className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(25px)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div className="grid grid-cols-8 gap-0">
          {board.map((row, rowIndex) =>
            row.map((piece, colIndex) => renderSquare(piece, rowIndex, colIndex))
          )}
        </div>
      </div>
    </div>
  );
}

function getPieceUnicode(piece: any): string {
  const pieces: Record<string, Record<string, string>> = {
    w: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
    b: { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' },
  };
  return pieces[piece.color][piece.type] || '';
}
