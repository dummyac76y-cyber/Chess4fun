import { memo } from 'react';

interface ControlsProps {
  canUndo: boolean;
  onNewGame: () => void;
  onFlipBoard: () => void;
  onUndo: () => void;
  onSurrender: () => void;
  onOpenMenu: () => void;
}

const btn =
  'py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors';

export const Controls = memo(function Controls({
  canUndo, onFlipBoard, onUndo, onSurrender, onOpenMenu,
}: ControlsProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-white/[0.03] p-3">
      <div className="grid grid-cols-4 gap-2">
        <button onClick={onOpenMenu} className={`${btn} border-zinc-800 text-zinc-200 hover:bg-zinc-800/60`}>
          Menu
        </button>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`${btn} border-zinc-800 text-zinc-200 hover:bg-zinc-800/60 disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          Undo
        </button>
        <button onClick={onFlipBoard} className={`${btn} border-zinc-800 text-zinc-200 hover:bg-zinc-800/60`}>
          Flip
        </button>
        <button onClick={onSurrender} className={`${btn} border-red-900/60 text-red-400 hover:bg-red-950/40`}>
          Surrender
        </button>
      </div>
    </div>
  );
});
