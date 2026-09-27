import { Chess } from 'chess.js';
import { GameMode, TimeControl } from '../App';

interface GameInfoProps {
  game: Chess;
  playerColor: 'white' | 'black';
  moveHistory: string[];
  gameMode: GameMode;
  timeControl: TimeControl;
}

export function GameInfo({ game, playerColor, moveHistory, gameMode, timeControl }: GameInfoProps) {
  const turn = game.turn() === 'w' ? 'White' : 'Black';
  const inCheck = game.inCheck();
  const isGameOver = game.isGameOver();
  
  let status = `${turn} to move`;
  if (inCheck) status = `${turn} in check!`;
  if (game.isCheckmate()) status = `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins!`;
  if (game.isDraw()) status = 'Draw!';
  if (game.isStalemate()) status = 'Stalemate!';
  if (game.isThreefoldRepetition()) status = 'Draw by repetition!';
  if (game.isInsufficientMaterial()) status = 'Draw - insufficient material!';

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
          {moveHistory.length === 0 ? (
            <p className="text-white/40 text-sm italic">No moves yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {moveHistory.map((move, i) => (
                <div key={i} className="text-white text-sm">
                  {Math.floor(i / 2) + 1}{i % 2 === 0 ? '.' : '...'} {move}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
