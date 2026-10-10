import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Search, Users, X } from 'lucide-react';
import { PrivateRoom, cancelRandomMatchmaking, findRandomOpponent, getOrCreatePlayerId } from '../lib/supabase';

interface RandomMatchmakingProps {
  playerName: string;
  onMatch: (room: PrivateRoom, color: 'white' | 'black') => void;
}

export function RandomMatchmaking({ playerName, onMatch }: RandomMatchmakingProps) {
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const onMatchRef = useRef(onMatch);
  const playerIdRef = useRef('');

  onMatchRef.current = onMatch;

  useEffect(() => {
    playerIdRef.current = getOrCreatePlayerId();
  }, []);

  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    let timer: number | undefined;
    const playerId = playerIdRef.current || getOrCreatePlayerId();

    const poll = async () => {
      try {
        const result = await findRandomOpponent(playerId, playerName);
        if (cancelled) return;
        if (result.status === 'matched' && result.room && result.my_color) {
          setSearching(false);
          onMatchRef.current(result.room, result.my_color);
          return;
        }
        timer = window.setTimeout(poll, 1800);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Could not search for a player. Please try again.');
        setSearching(false);
      }
    };

    setError('');
    void poll();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      void cancelRandomMatchmaking(playerId).catch((e) => {
        console.warn('[Matchmaking] Could not clear guest queue entry:', e);
      });
    };
  }, [searching, playerName]);

  return (
    <section className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-300/10 border border-emerald-300/20 flex items-center justify-center text-emerald-300">
          <Users size={21} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-zinc-100 font-semibold">Find a random player</h3>
          <p className="text-xs text-zinc-500">Match with another player online — no room code needed.</p>
        </div>
      </div>

      {searching ? (
        <div className="rounded-lg border border-zinc-700 bg-black/20 px-3 py-3 flex items-center gap-3">
          <LoaderCircle size={18} className="text-emerald-300 animate-spin shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-zinc-100 font-medium">Searching for an opponent…</p>
            <p className="text-xs text-zinc-500">Keep this page open. You’ll be matched automatically.</p>
          </div>
          <button onClick={() => setSearching(false)} aria-label="Cancel matchmaking" className="p-2 rounded-lg hover:bg-white/10 text-zinc-400">
            <X size={17} />
          </button>
        </div>
      ) : (
        <button onClick={() => { setError(''); setSearching(true); }} className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-300 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-200 transition-colors">
          <Search size={17} /> Find Opponent
        </button>
      )}

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </section>
  );
}
