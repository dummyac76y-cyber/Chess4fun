import { useState, useEffect } from 'react';
import { PlayerStats } from '../App';

interface MatchmakingQueueProps {
  stats: PlayerStats;
  onMatchFound: (opponentColor: 'white' | 'black') => void;
  onCancel: () => void;
}

export function MatchmakingQueue({ stats, onMatchFound, onCancel }: MatchmakingQueueProps) {
  const [searchTime, setSearchTime] = useState(0);
  const [playersInQueue, setPlayersInQueue] = useState(Math.floor(Math.random() * 50) + 20);

  useEffect(() => {
    const timer = setInterval(() => {
      setSearchTime(prev => prev + 1);
      setPlayersInQueue(prev => Math.max(10, prev + Math.floor(Math.random() * 5) - 2));
    }, 1000);

    // Simulate finding a match after 3-8 seconds
    const matchTimer = setTimeout(() => {
      const opponentColor = Math.random() > 0.5 ? 'white' : 'black';
      onMatchFound(opponentColor);
    }, 3000 + Math.random() * 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(matchTimer);
    };
  }, [onMatchFound]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
              <h2 className="text-3xl font-bold text-white mb-2">Finding Match...</h2>
              <p className="text-white/70">Searching for opponents near your rank</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Search Time</span>
                <span className="text-white font-bold">{formatTime(searchTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Players in Queue</span>
                <span className="text-white font-bold">{playersInQueue}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Your Points</span>
                <span className="text-white font-bold">{stats.points}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Points Range</span>
                <span className="text-white font-bold">
                  {Math.max(0, stats.points - 100)} - {stats.points + 100}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg p-3 border border-white/10">
              <p className="text-white text-center font-semibold">
                2x Points Multiplier Active
              </p>
            </div>

            <button
              onClick={onCancel}
              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
