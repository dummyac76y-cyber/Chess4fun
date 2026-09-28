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
            className="rounded-xl p-6 border border-zinc-800 bg-white/[0.03]">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-100 text-center mb-6">Player Statistics</h2>

            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-zinc-100 mb-2">{stats.points}</div>
              <p className="text-zinc-400">Chess Points</p>
              <p className="text-zinc-500 text-sm mt-1">Rank: {Math.floor(stats.points / 100)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-zinc-900/70 rounded-lg p-3">
                <p className="text-zinc-500 text-xs">Games Played</p>
                <p className="text-zinc-100 text-2xl font-semibold">{stats.gamesPlayed}</p>
              </div>
              <div className="bg-zinc-900/70 rounded-lg p-3">
                <p className="text-zinc-500 text-xs">Win Rate</p>
                <p className="text-zinc-100 text-2xl font-semibold">{winRate}%</p>
              </div>
              <div className="bg-zinc-900/70 rounded-lg p-3">
                <p className="text-zinc-500 text-xs">Wins</p>
                <p className="text-green-400 text-2xl font-bold">{stats.wins}</p>
              </div>
              <div className="bg-zinc-900/70 rounded-lg p-3">
                <p className="text-zinc-500 text-xs">Losses</p>
                <p className="text-red-400 text-2xl font-bold">{stats.losses}</p>
              </div>
              <div className="bg-zinc-900/70 rounded-lg p-3">
                <p className="text-zinc-500 text-xs">Draws</p>
                <p className="text-yellow-400 text-2xl font-bold">{stats.draws}</p>
              </div>
              <div className="bg-zinc-900/70 rounded-lg p-3">
                <p className="text-zinc-500 text-xs">Best Streak</p>
                <p className="text-zinc-100 text-2xl font-semibold">{stats.bestStreak}</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={onReset}
                className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-zinc-100 font-medium transition-all"
              >
                Reset Statistics
              </button>
              <button
                onClick={onBack}
                className="w-full py-2.5 rounded-lg border border-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-800/60 transition-colors"
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
