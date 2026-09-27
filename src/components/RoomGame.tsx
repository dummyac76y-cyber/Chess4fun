import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { supabase, isSupabaseConfigured, updatePrivateRoom, deletePrivateRoom, PrivateRoom } from '../lib/supabase';
import { ChessBoard } from './ChessBoard';
import { Controls } from './Controls';
import { GameInfo } from './GameInfo';
import { GameSettings } from '../App';

interface RoomGameProps {
  room: PrivateRoom;
  isHost: boolean;
  myColor: 'white' | 'black';
  settings: GameSettings;
  onLeave: () => void;
}

export function RoomGame({ room, isHost, myColor, settings, onLeave }: RoomGameProps) {
  const [game, setGame] = useState(() => new Chess(room.fen));
  const [moveHistory, setMoveHistory] = useState<string[]>(
    room.move_history ? room.move_history.split(',') : []
  );
  const [roomStatus, setRoomStatus] = useState<'waiting' | 'active' | 'finished'>('active');
  const [opponentLeft, setOpponentLeft] = useState(false);
  const isMyTurn = game.turn() === (myColor === 'white' ? 'w' : 'b');
  const lastFenRef = useRef(room.fen);

  // Initialize from room data
  useEffect(() => {
    setRoomStatus(room.status);
    if (room.status === 'waiting') {
      setGame(new Chess());
      setMoveHistory([]);
    } else {
      setGame(new Chess(room.fen));
      setMoveHistory(room.move_history ? room.move_history.split(',') : []);
    }
    lastFenRef.current = room.fen;
  }, [room.id]);

  // Realtime subscription & BroadcastChannel setup for move updates
  useEffect(() => {
    let supabaseChannel: any = null;
    if (isSupabaseConfigured() && !room.is_local) {
      supabaseChannel = supabase
        .channel(`room-${room.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'chess_private_rooms', filter: `id=eq.${room.id}` },
          (payload: any) => {
            const updated = payload.new as PrivateRoom;
            setRoomStatus(updated.status);
            lastFenRef.current = updated.fen;
            const incomingGame = new Chess(updated.fen);
            setGame(incomingGame);
            setMoveHistory(updated.move_history ? updated.move_history.split(',') : []);
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'chess_private_rooms', filter: `id=eq.${room.id}` },
          () => {
            setOpponentLeft(true);
          }
        )
        .subscribe();
    }

    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel(`room_channel_${room.id}`);
      broadcastChannel.onmessage = (event) => {
        const { type, room: updatedRoom } = event.data || {};
        if (type === 'DELETE') {
          setOpponentLeft(true);
        } else if (type === 'UPDATE' && updatedRoom) {
          setRoomStatus(updatedRoom.status);
          lastFenRef.current = updatedRoom.fen;
          const incomingGame = new Chess(updatedRoom.fen);
          setGame(incomingGame);
          setMoveHistory(updatedRoom.move_history ? updatedRoom.move_history.split(',') : []);
        }
      };
    }

    return () => {
      if (supabaseChannel) {
        supabase.removeChannel(supabaseChannel);
      }
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    };
  }, [room.id, room.is_local]);

  // Host waiting detection: poll periodically if waiting
  useEffect(() => {
    if (roomStatus !== 'waiting') return;
    const poll = setInterval(async () => {
      if (isSupabaseConfigured() && !room.is_local) {
        const { data } = await supabase
          .from('chess_private_rooms')
          .select('status')
          .eq('id', room.id)
          .maybeSingle();
        if (data && data.status === 'active') {
          setRoomStatus('active');
          clearInterval(poll);
          return;
        }
      }
      try {
        const raw = localStorage.getItem('chess_local_private_rooms');
        if (raw) {
          const rooms = JSON.parse(raw);
          if (rooms[room.id] && rooms[room.id].status === 'active') {
            setRoomStatus('active');
            clearInterval(poll);
          }
        }
      } catch (e) {}
    }, 1000);

    return () => clearInterval(poll);
  }, [room.id, roomStatus, room.is_local]);

  const handleMove = useCallback((from: string, to: string, promotion?: string) => {
    // Only allow move if it's my turn and game is active
    if (roomStatus !== 'active') return false;
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
  }, [game, roomStatus, myColor, moveHistory, room.id]);

  const handleLeave = useCallback(() => {
    deletePrivateRoom(room.id);
    onLeave();
  }, [room.id, onLeave]);

  const handleUndo = useCallback(() => {
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
  }, [game, moveHistory, room.id]);

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
                  isMyTurn ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/10 text-white/50'
                }`}>
                  {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
                </div>
              </div>

              <ChessBoard
                game={game}
                playerColor={myColor}
                onMove={handleMove}
                settings={settings}
              />

              <Controls
                game={game}
                onNewGame={handleLeave}
                onFlipBoard={() => {}}
                onUndo={handleUndo}
                onSurrender={handleLeave}
                onOpenMenu={() => {}}
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
