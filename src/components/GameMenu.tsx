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
        className="relative w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}
      >
        {!showSurrenderConfirm ? (
          <>
            <h2 className="text-3xl font-bold text-white text-center mb-6">Game Menu</h2>
            
            <div className="space-y-3">
              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all"
              >
                Resume Game
              </button>
              
              <button
                onClick={() => setShowSurrenderConfirm(true)}
                className="w-full py-3 px-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-white font-medium transition-all"
              >
                Surrender
              </button>
              
              <button
                onClick={onNewGame}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-500/30 to-blue-500/30 hover:from-purple-500/40 hover:to-blue-500/40 border border-white/20 rounded-xl text-white font-medium transition-all"
              >
                New Game
              </button>
              
              <button
                onClick={onBackToMenu}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all"
              >
                Back to Main Menu
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white text-center mb-4">Confirm Surrender</h2>
            <p className="text-white/70 text-center mb-6">
              Are you sure you want to surrender? This will count as a loss.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  onSurrender();
                  onClose();
                }}
                className="w-full py-3 px-4 bg-red-500/30 hover:bg-red-500/40 border border-red-500/40 rounded-xl text-white font-medium transition-all"
              >
                Yes, Surrender
              </button>
              
              <button
                onClick={() => setShowSurrenderConfirm(false)}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all"
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
