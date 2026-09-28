import { useState } from 'react';

interface GameMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSurrender: () => void;
  onNewGame: () => void;
  onBackToMenu: () => void;
}

export function GameMenu({ isOpen, onClose, onSurrender, onNewGame, onBackToMenu }: GameMenuProps) {
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <div 
        className="relative w-full max-w-md rounded-xl p-6 space-y-4 border border-zinc-800 bg-white/[0.03]">
        {!showSurrenderConfirm ? (
          <>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-100 text-center mb-6">Game Menu</h2>
            
            <div className="space-y-3">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg border border-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-800/60 transition-colors"
              >
                Resume Game
              </button>
              
              <button
                onClick={() => setShowSurrenderConfirm(true)}
                className="w-full py-3 px-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-zinc-100 font-medium transition-all"
              >
                Surrender
              </button>
              
              <button
                onClick={onNewGame}
                className="w-full py-2.5 rounded-lg bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-white transition-colors"
              >
                New Game
              </button>
              
              <button
                onClick={onBackToMenu}
                className="w-full py-2.5 rounded-lg border border-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-800/60 transition-colors"
              >
                Back to Main Menu
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-zinc-100 text-center mb-4">Confirm Surrender</h2>
            <p className="text-zinc-400 text-center mb-6">
              Are you sure you want to surrender? This will count as a loss.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  onSurrender();
                  onClose();
                }}
                className="w-full py-3 px-4 bg-red-500/30 hover:bg-red-500/40 border border-red-500/40 rounded-xl text-zinc-100 font-medium transition-all"
              >
                Yes, Surrender
              </button>
              
              <button
                onClick={() => setShowSurrenderConfirm(false)}
                className="w-full py-2.5 rounded-lg border border-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-800/60 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
