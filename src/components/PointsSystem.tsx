import { PlayerStats } from '../App';

interface PointsSystemProps {
  stats: PlayerStats;
  onBack: () => void;
  onReset: () => void;
}

export function PointsSystem({ stats, onBack, onReset }: PointsSystemProps) {
  const winRate = stats.gamesPlayed > 0 ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1) : '0.0';

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div 
            className="rounded-2xl p-6"
            style={{
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(25px)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <h2 className="text-3xl font-bold text-white text-center mb-6">Player Statistics</h2>

            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-white mb-2">{stats.points}</div>
              <p className="text-white/70">Chess Points</p>
              <p className="text-white/50 text-sm mt-1">Rank: {Math.floor(stats.points / 100)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-xs">Games Played</p>
                <p className="text-white text-2xl font-bold">{stats.gamesPlayed}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-xs">Win Rate</p>
                <p className="text-white text-2xl font-bold">{winRate}%</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-xs">Wins</p>
                <p className="text-green-400 text-2xl font-bold">{stats.wins}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-xs">Losses</p>
                <p className="text-red-400 text-2xl font-bold">{stats.losses}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-xs">Draws</p>
                <p className="text-yellow-400 text-2xl font-bold">{stats.draws}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-xs">Best Streak</p>
                <p className="text-white text-2xl font-bold">{stats.bestStreak}</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={onReset}
                className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-white font-medium transition-all"
              >
                Reset Statistics
              </button>
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
    </div>
  );
}
