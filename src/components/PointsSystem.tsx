import { useEffect, useState } from 'react';
import { ArrowLeft, Crown, RefreshCw, Trophy } from 'lucide-react';
import { PlayerStats } from '../App';
import { fetchLeaderboard, PlayerStatsRecord } from '../lib/supabase';

interface PointsSystemProps {
  stats: PlayerStats;
  onBack: () => void;
  onReset: () => void;
  playerName: string;
}

export function PointsSystem({ stats, onBack, onReset, playerName }: PointsSystemProps) {
  const [leaders, setLeaders] = useState<PlayerStatsRecord[]>([]);
  const [leaderboardState, setLeaderboardState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
  const maxResult = Math.max(stats.wins, stats.draws, stats.losses, 1);

  useEffect(() => {
    let active = true;
    fetchLeaderboard(5).then((rows) => {
      if (!active) return;
      setLeaders(rows);
      setLeaderboardState(rows.length ? 'ready' : 'empty');
    }).catch(() => {
      if (active) setLeaderboardState('error');
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="stats-screen">
      <div className="stats-wrap">
        <header className="stats-topbar">
          <button onClick={onBack} className="stats-back"><ArrowLeft size={17} /> Main menu</button>
          <div className="stats-brand"><Crown size={18} /> CHESS<span>.</span>CLUB</div>
        </header>
        <div className="stats-heading">
          <div><span className="lobby-kicker">YOUR GAME, YOUR NUMBERS</span><h1>Player statistics</h1><p>Track your form, build your streak, climb the board.</p></div>
          <div className="stats-rank-badge"><Trophy size={19} /><span>RANK <strong>{Math.floor(stats.points / 100)}</strong></span></div>
        </div>
        <section className="stats-overview">
          <article className="stats-score-card">
            <span className="stats-eyebrow">TOTAL CHESS POINTS</span><strong className="stats-points">{stats.points.toLocaleString()}</strong>
            <div className="stats-score-bottom"><span>♟ Keep playing to climb</span><span>{stats.bestStreak} best streak</span></div>
          </article>
          <article className="stats-win-card">
            <div className="win-ring" style={{ background: `conic-gradient(#c7f36b ${winRate * 3.6}deg, #343d30 0deg)` }}><div><strong>{winRate}%</strong><span>WIN RATE</span></div></div>
            <div className="win-copy"><strong>Win percentage</strong><span>{stats.wins} wins from {stats.gamesPlayed} games</span><small>{stats.gamesPlayed ? (winRate >= 50 ? 'You are winning more than you lose.' : 'Every match is practice for the next win.') : 'Play your first match to start your stats.'}</small></div>
          </article>
        </section>
        <section className="stats-metric-grid">
          <article><span>Games played</span><strong>{stats.gamesPlayed}</strong><small>total matches</small></article>
          <article><span>Wins</span><strong className="metric-green">{stats.wins}</strong><small>victories</small></article>
          <article><span>Draws</span><strong className="metric-gold">{stats.draws}</strong><small>even matches</small></article>
          <article><span>Losses</span><strong className="metric-red">{stats.losses}</strong><small>lessons learned</small></article>
          <article><span>Current streak</span><strong>{stats.currentStreak}</strong><small>consecutive wins</small></article>
          <article><span>Best streak</span><strong>{stats.bestStreak}</strong><small>personal best</small></article>
        </section>
        <div className="stats-lower-grid">
          <section className="stats-chart-card">
            <div className="stats-card-heading"><div><span className="stats-eyebrow">PERFORMANCE</span><h2>Match breakdown</h2></div><span className="stats-total-tag">{stats.gamesPlayed} total</span></div>
            <div className="result-chart">
              <div className="result-chart-row"><div className="result-label"><span className="chart-dot chart-dot-win" />Wins <strong>{stats.wins}</strong></div><div className="result-track"><span className="chart-bar chart-bar-win" style={{ width: `${stats.wins / maxResult * 100}%` }} /></div></div>
              <div className="result-chart-row"><div className="result-label"><span className="chart-dot chart-dot-draw" />Draws <strong>{stats.draws}</strong></div><div className="result-track"><span className="chart-bar chart-bar-draw" style={{ width: `${stats.draws / maxResult * 100}%` }} /></div></div>
              <div className="result-chart-row"><div className="result-label"><span className="chart-dot chart-dot-loss" />Losses <strong>{stats.losses}</strong></div><div className="result-track"><span className="chart-bar chart-bar-loss" style={{ width: `${stats.losses / maxResult * 100}%` }} /></div></div>
            </div>
            <p className="stats-chart-note">Bars compare your wins, draws, and losses against your highest result.</p>
          </section>
          <section className="stats-chart-card leaderboard-card">
            <div className="stats-card-heading"><div><span className="stats-eyebrow">GLOBAL STANDINGS</span><h2>Leaderboard</h2></div><Trophy size={20} className="leader-trophy" /></div>
            {leaderboardState === 'loading' && <div className="leader-state"><RefreshCw size={16} className="spin-icon" /> Loading rankings…</div>}
            {leaderboardState === 'error' && <div className="leader-state">Leaderboard is unavailable right now. Your personal stats are still saved on this device.</div>}
            {leaderboardState === 'empty' && <div className="leader-state">No ranked players yet. Be one of the first to put points on the board.</div>}
            {leaderboardState === 'ready' && <div className="leader-list">{leaders.map((leader, index) => <div className="leader-row" key={leader.id}><span className={`leader-position leader-position-${index + 1}`}>{index + 1}</span><span className="leader-avatar">{(leader.display_name || 'P').slice(0, 1).toUpperCase()}</span><span className="leader-name">{leader.display_name || 'Player'}<small>{leader.games_played} games</small></span><strong className="leader-points">{leader.points.toLocaleString()}<small>pts</small></strong></div>)}</div>}
            <p className="stats-chart-note">Rankings use available saved player records.</p>
          </section>
        </div>
        <footer className="stats-footer"><span>Signed-in name: <strong>{playerName || 'Player'}</strong></span><button onClick={onReset}>Reset my statistics</button></footer>
      </div>
    </div>
  );
}
