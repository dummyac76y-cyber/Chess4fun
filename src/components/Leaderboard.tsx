import { useState, useEffect } from 'react';
import { fetchLeaderboard, PlayerStatsRecord } from '../lib/supabase';

interface LeaderboardProps {
  currentPlayerId: string;
  onBack: () => void;
}

export function Leaderboard({ currentPlayerId, onBack }: LeaderboardProps) {
  const [leaders, setLeaders] = useState<PlayerStatsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeaderboard(50)
      .then((data) => {
        setLeaders(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load leaderboard.');
        setLoading(false);
      });
  }, []);

  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-amber-600';
    return 'text-white/50';
  };

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(25px)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <h2 className="text-3xl font-bold text-white text-center">Leaderboard</h2>
            <p className="text-white/50 text-center text-sm">Top players ranked by points</p>

            {loading && (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto rounded-full border-4 border-emerald-400 border-t-transparent animate-spin" />
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            {!loading && !error && leaders.length === 0 && (
              <p className="text-white/50 text-center py-8">
                No players yet. Play a game to be the first!
              </p>
            )}

            {!loading && !error && leaders.length > 0 && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {leaders.map((player, index) => {
                  const isMe = player.player_id === currentPlayerId;
                  const winRate = player.games_played > 0
                    ? ((player.wins / player.games_played) * 100).toFixed(0)
                    : '0';
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
                        isMe
                          ? 'bg-emerald-500/20 border border-emerald-400/40'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className={`text-2xl font-bold w-8 text-center ${getMedalColor(index + 1)}`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold truncate">
                          {player.display_name}
                          {isMe && <span className="text-emerald-400 text-sm ml-2">(You)</span>}
                        </div>
                        <div className="text-white/40 text-xs">
                          {player.wins}W / {player.losses}L / {player.draws}D · {winRate}% win rate
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-lg">{player.points}</div>
                        <div className="text-white/40 text-xs">pts</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

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
