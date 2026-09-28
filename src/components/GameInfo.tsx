import { memo, useMemo } from 'react';
import { Chess, Move } from 'chess.js';
import { GameMode, TimeControl } from '../App';

interface GameInfoProps {
  game: Chess;
  playerColor: 'white' | 'black';
  moveHistory: string[];
  gameMode: GameMode;
  timeControl: TimeControl;
}

export const GameInfo = memo(function GameInfo({
  game, moveHistory, gameMode, timeControl,
}: GameInfoProps) {
  const fen = game.fen();

  const status = useMemo(() => {
    const turn = game.turn() === 'w' ? 'White' : 'Black';
    if (game.isCheckmate()) return `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins!`;
    if (game.isStalemate()) return 'Stalemate!';
    if (game.isThreefoldRepetition()) return 'Draw by repetition!';
    if (game.isInsufficientMaterial()) return 'Draw - insufficient material!';
    if (game.isDraw()) return 'Draw!';
    if (game.inCheck()) return `${turn} in check!`;
    return `${turn} to move`;
  }, [game, fen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group SAN moves into numbered pairs for display.
  const movePairs = useMemo(() => {
    const pairs: { number: number; white: string; black?: string }[] = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      pairs.push({ number: i / 2 + 1, white: moveHistory[i], black: moveHistory[i + 1] });
    }
    return pairs;
  }, [moveHistory]);

  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(25px)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <div>
        <h3 className="text-white/70 text-sm font-semibold mb-2">Game Status</h3>
        <p className="text-white text-lg font-bold">{status}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-white/60 text-xs">Mode</p>
          <p className="text-white font-semibold capitalize">{gameMode}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-white/60 text-xs">Time</p>
          <p className="text-white font-semibold">{timeControl}</p>
        </div>
      </div>

      <div>
        <h3 className="text-white/70 text-sm font-semibold mb-2">Move History</h3>
        <div className="bg-white/5 rounded-lg p-3 max-h-48 overflow-y-auto">
          {movePairs.length === 0 ? (
            <p className="text-white/40 text-sm italic">No moves yet</p>
          ) : (
            <div className="space-y-1">
              {movePairs.map(pair => (
                <div key={pair.number} className="grid grid-cols-[2.5rem_1fr_1fr] text-white text-sm">
                  <span className="text-white/50">{pair.number}.</span>
                  <span>{pair.white}</span>
                  <span>{pair.black ?? ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
