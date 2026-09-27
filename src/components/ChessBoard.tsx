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