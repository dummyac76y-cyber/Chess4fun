import { useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { GameSettings, GameMode } from '../App';
import { ChessPiece } from './ChessPiece';

interface ChessBoardProps {
  game: Chess;
  playerColor: 'white' | 'black';
  onMove: (from: string, to: string, promotion?: string) => boolean;
  settings: GameSettings;
  gameMode?: GameMode;
}

export function ChessBoard({ game, playerColor, onMove, settings, gameMode = 'bot' }: ChessBoardProps) {
  const board = game.board();
  const isPlayerBlack = playerColor === 'black';
  const flipped = settings.autoFlipBoard ? (gameMode === 'pvp' ? game.turn() === 'b' : isPlayerBlack) : isPlayerBlack;
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [validMoves, setValidMoves] = useState<{ row: number; col: number }[]>([]);

  const myColorChar = playerColor === 'white' ? 'w' : 'b';
  const isSinglePlayerPerspective = gameMode === 'bot' || gameMode === 'online';

  const canSelectPiece = useCallback((piece: { type: string; color: string } | null) => {
    if (!piece) return false;
    if (piece.color !== game.turn()) return false;
    if (isSinglePlayerPerspective && piece.color !== myColorChar) return false;
    return true;
  }, [game, isSinglePlayerPerspective, myColorChar]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    const actualRow = flipped ? 7 - row : row;
    const actualCol = flipped ? 7 - col : col;
    const square = String.fromCharCode(97 + actualCol) + (8 - actualRow);
    const piece = board[actualRow][actualCol];

    // If we have a selected piece
    if (selectedSquare) {
      // Check if clicked square is a valid move
      const isValidMove = validMoves.some(m => m.row === actualRow && m.col === actualCol);

      if (isValidMove) {
        const fromSquare = String.fromCharCode(97 + selectedSquare.col) + (8 - selectedSquare.row);
        const success = onMove(fromSquare, square);
        if (success) {
          setSelectedSquare(null);
          setValidMoves([]);
          return;
        }
      }

      // If clicked on piece player is allowed to select
      if (piece && canSelectPiece(piece)) {
        setSelectedSquare({ row: actualRow, col: actualCol });
        const moves = game.moves({ square: square as any, verbose: true }) as any[];
        setValidMoves(moves.map((m: any) => {
          const toCol = m.to.charCodeAt(0) - 97;
          const toRow = 8 - parseInt(m.to[1]);
          return { row: toRow, col: toCol };
        }));
        return;
      }

      // Deselect
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // Select a piece
    if (piece && canSelectPiece(piece)) {
      setSelectedSquare({ row: actualRow, col: actualCol });
      const moves = game.moves({ square: square as any, verbose: true }) as any[];
      setValidMoves(moves.map((m: any) => {
        const toCol = m.to.charCodeAt(0) - 97;
        const toRow = 8 - parseInt(m.to[1]);
        return { row: toRow, col: toCol };
      }));
    }
  }, [board, canSelectPiece, flipped, game, onMove, selectedSquare, validMoves]);

  const themeColors = useMemo(() => ({
    classic: { light: '#f0d9b5', dark: '#b58863' },
    modern: { light: '#e8e8e8', dark: '#4a4a4a' },
    wood: { light: '#deb887', dark: '#8b4513' },
    marble: { light: '#f5f5f5', dark: '#696969' },
  }), []);

  const renderSquare = useCallback((piece: any, row: number, col: number) => {
    const actualRow = flipped ? 7 - row : row;
    const actualCol = flipped ? 7 - col : col;
    const isLight = (actualRow + actualCol) % 2 === 0;

    const colors = themeColors[settings.boardTheme];
    let bgColor = isLight ? colors.light : colors.dark;

    // Highlight selected square
    const isSelected = selectedSquare && selectedSquare.row === actualRow && selectedSquare.col === actualCol;
    if (isSelected) {
      bgColor = '#7fc97f';
    }

    // Highlight valid moves
    const isValidMove = validMoves.some(m => m.row === actualRow && m.col === actualCol);

    const pieceNames: Record<string, string> = {
      p: 'pawn',
      r: 'rook',
      n: 'knight',
      b: 'bishop',
      q: 'queen',
      k: 'king',
    };
    const squareCoord = `${String.fromCharCode(97 + actualCol)}${8 - actualRow}`;
    const pieceDesc = piece
      ? `${piece.color === 'w' ? 'white' : 'black'} ${pieceNames[piece.type] || piece.type}`
      : 'empty';
    const statusDesc = isSelected ? ', selected' : isValidMove ? ', valid move target' : '';
    const ariaLabel = `${squareCoord}, ${pieceDesc}${statusDesc}`;

    return (
      <button
        key={`${row}-${col}`}
        type="button"
        aria-label={ariaLabel}
        className="aspect-square flex items-center justify-center cursor-pointer hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:z-20 transition-all relative"
        style={{ backgroundColor: bgColor }}
        onClick={() => handleSquareClick(row, col)}
      >
        {piece && (
          <div className="z-10 transition-transform hover:scale-110 pointer-events-none">
            <ChessPiece type={piece.type} color={piece.color} size={50} />
          </div>
        )}
        {/* Valid move indicator */}
        {isValidMove && !piece && (
          <div className="absolute w-1/3 h-1/3 rounded-full bg-black/30 pointer-events-none" />
        )}
        {/* Capture indicator */}
        {isValidMove && piece && (
          <div className="absolute inset-1 rounded-full border-4 border-black/30 pointer-events-none" />
        )}
        {settings.showCoordinates && row === 7 && (
          <span className="absolute bottom-1 right-1 text-xs font-bold opacity-50 pointer-events-none">
            {String.fromCharCode(97 + actualCol)}
          </span>
        )}
        {settings.showCoordinates && col === 0 && (
          <span className="absolute top-1 left-1 text-xs font-bold opacity-50 pointer-events-none">
            {8 - actualRow}
          </span>
        )}
      </button>
    );
  }, [flipped, themeColors, settings.boardTheme, settings.showCoordinates, selectedSquare, validMoves, handleSquareClick]);

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
