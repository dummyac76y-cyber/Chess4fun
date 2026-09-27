import { Chess } from 'chess.js';

interface ControlsProps {
  game: Chess;
  onNewGame: () => void;
  onFlipBoard: () => void;
  onUndo: () => void;
}

export function Controls({ game, onNewGame, onFlipBoard, onUndo }: ControlsProps) {
  return (
    <div 
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(25px)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={onUndo}
          disabled={game.history().length === 0}
          className="py-3 px-4 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed border border-white/20 rounded-xl text-white font-medium transition-all"
        >
          Undo
        </button>
        
        <button
          onClick={onFlipBoard}
          className="py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all"
        >
          Flip Board
        </button>
        
        <button
          onClick={onNewGame}
          className="py-3 px-4 bg-gradient-to-r from-purple-500/30 to-blue-500/30 hover:from-purple-500/40 hover:to-blue-500/40 border border-white/20 rounded-xl text-white font-medium transition-all"
        >
          New Game
        </button>
      </div>
    </div>
  );
}
