import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import {
  supabase, isSupabaseConfigured, createPrivateRoom, joinPrivateRoom,
  updatePrivateRoom, deletePrivateRoom, subscribeToRoom, PrivateRoom,
} from '../lib/supabase';
import { GameSettings } from '../types';
import { ChessBoard } from './ChessBoard';
import { Controls } from './Controls';
import { GameInfo } from './GameInfo';

interface RoomGameProps {
  room: PrivateRoom;
  isHost: boolean;
  myColor: 'white' | 'black';
  settings: GameSettings;
  onLeave: () => void;
}

/**
 * Online private-room game.
 *
 * Sync model (works in production, across devices):
 *  - Source of truth is the `chess_private_rooms` row in Supabase.
 *  - Every move is written to the row; both clients receive updates through a
 *    Realtime `postgres_changes` subscription AND an instant same-browser
 *    BroadcastChannel listener, with a slow polling fallback so a dropped
 *    websocket can never leave the two boards out of sync.
 */
export function RoomGame({ room, isHost, myColor, settings, onLeave }: RoomGameProps) {
  const [game, setGame] = useState(() => new Chess(room.fen));
  const [moveHistory, setMoveHistory] = useState<string[]>(
    room.move_history ? room.move_history.split(',').filter(Boolean) : []
  );
  const [roomStatus, setRoomStatus] = useState<'waiting' | 'active' | 'finished'>(room.status);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const isMyTurn = game.turn() === (myColor === 'white' ? 'w' : 'b');
  // Refs so async callbacks always see the latest state without re-subscribing.
  const lastFenRef = useRef(room.fen);
  const statusRef = useRef<'waiting' | 'active' | 'finished'>(room.status);
  statusRef.current = roomStatus;

  // Re-initialize when a different room is opened.
  useEffect(() => {
    setRoomStatus(room.status);
    if (room.status === 'waiting') {
      setGame(new Chess());
      setMoveHistory([]);
    } else {
      setGame(new Chess(room.fen));
      setMoveHistory(room.move_history ? room.move_history.split(',').filter(Boolean) : []);
    }
    lastFenRef.current = room.fen;
    setOpponentLeft(false);
  }, [room.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply an incoming remote state (from realtime / broadcast / polling).
  const applyRemoteState = useCallback(
    (updated: { fen?: string; move_history?: string; status?: 'waiting' | 'active' | 'finished' }) => {
      setRoomStatus((prev) => (updated.status && updated.status !== prev ? updated.status : prev));
      if (updated.fen && updated.fen !== lastFenRef.current) {
        lastFenRef.current = updated.fen;
        try {
          setGame(new Chess(updated.fen));
        } catch {
          /* ignore malformed FEN */
        }
        setMoveHistory(updated.move_history ? updated.move_history.split(',').filter(Boolean) : []);
      }
    },
    []
  );

  // Realtime subscription & BroadcastChannel setup for move updates
  useEffect(() => {
    let unsubscribeRealtime: (() => void) | null = null;
    if (isSupabaseConfigured() && !room.is_local) {
      unsubscribeRealtime = subscribeToRoom(room.id, {
        onUpdate: (updated) => applyRemoteState(updated),
        onDelete: () => setOpponentLeft(true),
      });
    }

    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel(`room_channel_${room.id}`);
      broadcastChannel.onmessage = (event) => {
        const { type, room: updatedRoom } = event.data || {};
        if (type === 'DELETE') {
          setOpponentLeft(true);
        } else if (type === 'UPDATE' && updatedRoom) {
          applyRemoteState(updatedRoom);
        }
      };
    }

    return () => {
      if (unsubscribeRealtime) unsubscribeRealtime();
      if (broadcastChannel) broadcastChannel.close();
    };
  }, [room.id, room.is_local, applyRemoteState]);

  // Polling fallback guarantees status & move sync even if websockets drop.
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      if (isSupabaseConfigured() && !room.is_local) {
        const { data, error } = await supabase
          .from('chess_private_rooms')
          .select('status, fen, move_history')
          .eq('id', room.id)
          .maybeSingle();

        if (error) {
          console.error('[RoomGame Polling Error]', error);
        } else if (data) {
          applyRemoteState(data);
        }
      } else {
        // Local/offline rooms live in localStorage; watch for cross-tab writes.
        try {
          const raw = localStorage.getItem('chess_local_private_rooms');
          if (raw) {
            const rooms = JSON.parse(raw);
            if (rooms[room.id]) applyRemoteState(rooms[room.id]);
          }
        } catch {
          /* ignore */
        }
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [room.id, room.is_local, applyRemoteState]);

  const handleMove = useCallback((from: string, to: string, promotion?: string) => {
    // Only allow moves while the game is active and it's my turn.
    if (statusRef.current !== 'active') return false;
    const currentTurn = game.turn();
    const myTurnChar = myColor === 'white' ? 'w' : 'b';
    if (currentTurn !== myTurnChar) return false;

    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({ from, to, promotion: promotion || 'q' });
      if (!move) return false;

      const newFen = gameCopy.fen();
      const newHistory = [...moveHistory, move.san];
      lastFenRef.current = newFen;
      setGame(new Chess(newFen));
      setMoveHistory(newHistory);

      const finalStatus = gameCopy.isGameOver() ? 'finished' : 'active';
      if (finalStatus === 'finished') setRoomStatus('finished');

      updatePrivateRoom(room.id, {
        fen: newFen,
        move_history: newHistory.join(','),
        status: finalStatus,
      });

      return true;
    } catch (e) {
      console.error('Invalid move', e);
      return false;
    }
  }, [game, myColor, moveHistory, room.id]);

  const handleLeave = useCallback(() => {
    deletePrivateRoom(room.id);
    onLeave();
  }, [room.id, onLeave]);

  // Surrender: mark the room finished for the opponent instead of deleting it,
  // so they see a proper result rather than "opponent left".
  const handleSurrender = useCallback(() => {
    updatePrivateRoom(room.id, { status: 'finished' });
    onLeave();
  }, [room.id, onLeave]);

  // Undo is only meaningful before the opponent has moved; keep it host-only
  // and disabled once the game is finished.
  const canUndo =
    isHost &&
    roomStatus === 'active' &&
    moveHistory.length >= 2 &&
    game.turn() === (myColor === 'white' ? 'w' : 'b');

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const gameCopy = new Chess(game.fen());
    gameCopy.undo();
    gameCopy.undo();
    const newFen = gameCopy.fen();
    const newHistory = moveHistory.slice(0, -2);
    lastFenRef.current = newFen;
    setGame(new Chess(newFen));
    setMoveHistory(newHistory);

    updatePrivateRoom(room.id, {
      fen: newFen,
      move_history: newHistory.join(','),
    });
  }, [canUndo, game, moveHistory, room.id]);

  // Waiting screen for host
  if (roomStatus === 'waiting') {
    return (
      <div className="relative min-h-screen">
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div
              className="rounded-2xl p-8 space-y-6 text-center"
              style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(25px)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-emerald-400 border-t-transparent animate-spin" />
              <h2 className="text-3xl font-bold text-white">Waiting for Opponent</h2>
              <p className="text-white/60 text-sm">
                Share this code with your friend so they can join
              </p>
              <div className="bg-white/10 rounded-xl py-6 px-4">
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Access Code</p>
                <p className="text-5xl font-bold text-emerald-400 tracking-[0.25em]">
                  {room.access_code}
                </p>
              </div>
              <p className="text-white/40 text-xs">
                You are playing as {myColor}
              </p>
              <button
                onClick={handleLeave}
                className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-white font-medium transition-all"
              >
                Cancel & Leave
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Opponent left screen
  if (opponentLeft) {
    return (
      <div className="relative min-h-screen">
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div
              className="rounded-2xl p-8 space-y-6 text-center"
              style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(25px)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <h2 className="text-3xl font-bold text-white">Opponent Left</h2>
              <p className="text-white/60">Your opponent has left the room.</p>
              <button
                onClick={onLeave}
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

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 min-h-screen p-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">
            <div className="space-y-4">
              <div
                className="rounded-2xl px-5 py-3 flex items-center justify-between"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(25px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-white/50 text-sm">Room Code:</span>
                  <span className="text-emerald-400 font-bold text-lg tracking-widest">
                    {room.access_code}
                  </span>
                </div>
                <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                  roomStatus === 'finished'
                    ? 'bg-amber-500/30 text-amber-300'
                    : isMyTurn ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/10 text-white/50'
                }`}>
                  {roomStatus === 'finished'
                    ? (game.isCheckmate()
                        ? `Checkmate – ${game.turn() === 'w' ? 'Black' : 'White'} wins`
                        : 'Game over')
                    : isMyTurn ? 'Your Turn' : "Opponent's Turn"}
                </div>
              </div>

              <ChessBoard
                game={game}
                playerColor={myColor}
                boardFlipped={false}
                lockedToPlayerSide
                gameMode="online"
                onMove={handleMove}
                settings={settings}
                pendingPromotion={null}
                onPromotionSelect={() => {}}
                whiteTime={Infinity}
                blackTime={Infinity}
                clockRunning={false}
              />

              <Controls
                canUndo={canUndo}
                onNewGame={handleLeave}
                onFlipBoard={() => {}}
                onUndo={handleUndo}
                onSurrender={handleSurrender}
                onOpenMenu={onLeave}
              />
            </div>

            <div className="space-y-4">
              <GameInfo
                game={game}
                playerColor={myColor}
                moveHistory={moveHistory}
                gameMode="online"
                timeControl="unlimited"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Keep the create/join helpers reachable from App without a second import site.
export { createPrivateRoom, joinPrivateRoom };
