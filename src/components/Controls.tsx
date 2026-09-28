import { memo } from 'react';

interface ControlsProps {
  canUndo: boolean;
  onNewGame: () => void;
  onFlipBoard: () => void;
  onUndo: () => void;
  onSurrender: () => void;
  onOpenMenu: () => void;
}

export const Controls = memo(function Controls({
  canUndo, onNewGame, onFlipBoard, onUndo, onSurrender, onOpenMenu,
}: ControlsProps) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(25px)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <div className="grid grid-cols-4 gap-3">
        <button
          onClick={onOpenMenu}
          className="py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all"
        >
          Menu
        </button>

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="py-3 px-4 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed border border-white/20 rounded-xl text-white font-medium transition-all"
        >
          Undo
        </button>

        <button
          onClick={onFlipBoard}
          className="py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all"
        >
          Flip
        </button>

        <button
          onClick={onSurrender}
          className="py-3 px-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-white font-medium transition-all"
        >
          Surrender
        </button>
      </div>
    </div>
  );
});
