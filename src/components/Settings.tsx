import { GameSettings } from '../App';

interface SettingsProps {
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
  onBack: () => void;
  playerName: string;
  onNameChange: (name: string) => void;
}

export function Settings({ settings, onSettingsChange, onBack, playerName, onNameChange }: SettingsProps) {
  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div 
            className="rounded-2xl p-6 space-y-6"
            style={{
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(25px)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <h2 className="text-3xl font-bold text-white text-center">Settings</h2>

            <div className="space-y-4">
              <div>
                <span className="text-white block mb-2">Player Name</span>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => onNameChange(e.target.value)}
                  maxLength={20}
                  placeholder="Anonymous"
                  className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-emerald-400/60 placeholder:text-white/30"
                />
                <p className="text-white/40 text-xs mt-1">This name appears on the leaderboard</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white">Sound Effects</span>
                <button
                  onClick={() => onSettingsChange({ ...settings, soundEnabled: !settings.soundEnabled })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.soundEnabled ? 'bg-purple-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white">Show Coordinates</span>
                <button
                  onClick={() => onSettingsChange({ ...settings, showCoordinates: !settings.showCoordinates })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.showCoordinates ? 'bg-purple-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.showCoordinates ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white">Auto-Flip Board</span>
                <button
                  onClick={() => onSettingsChange({ ...settings, autoFlipBoard: !settings.autoFlipBoard })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.autoFlipBoard ? 'bg-purple-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.autoFlipBoard ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white">Show Move Quality</span>
                <button
                  onClick={() => onSettingsChange({ ...settings, showMoveQuality: !settings.showMoveQuality })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.showMoveQuality ? 'bg-purple-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.showMoveQuality ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div>
                <span className="text-white block mb-2">Board Theme</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['classic', 'modern', 'wood', 'marble'] as const).map(theme => (
                    <button
                      key={theme}
                      onClick={() => onSettingsChange({ ...settings, boardTheme: theme })}
                      className={`py-2 px-4 rounded-lg capitalize transition-all ${
                        settings.boardTheme === theme
                          ? 'bg-purple-500/40 border-2 border-purple-400'
                          : 'bg-white/10 border-2 border-transparent hover:bg-white/20'
                      } text-white`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={onBack}
              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
