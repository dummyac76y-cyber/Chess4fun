import { useState } from 'react';
import { createPrivateRoom, joinPrivateRoom, normalizeAccessCode, PrivateRoom } from '../lib/supabase';

interface RoomLobbyProps {
  onRoomJoined: (room: PrivateRoom, isHost: boolean, myColor: 'white' | 'black') => void;
  onBack: () => void;
}

export function RoomLobby({ onRoomJoined, onBack }: RoomLobbyProps) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [joinCode, setJoinCode] = useState('');
  const [hostColor, setHostColor] = useState<'white' | 'black'>('white');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const room = await createPrivateRoom(hostColor);
      onRoomJoined(room, true, hostColor);
    } catch (err: any) {
      console.error('RoomLobby handleCreate error:', err);
      setError(err?.message || 'Could not create room. Please try again.');
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    // Normalize before validating so invisible/autocorrect characters can't
    // make a correct code look empty or too short.
    const cleanCode = normalizeAccessCode(joinCode);
    if (cleanCode.length === 0) {
      setError('Please enter an access code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await joinPrivateRoom(cleanCode);
      onRoomJoined(result.room, false, result.myColor);
    } catch (err: any) {
      console.error('RoomLobby handleJoin error:', err);
      setError(err?.message || 'Could not join room. Please check code and try again.');
      setLoading(false);
    }
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
            {mode === 'choose' && (
              <>
                <h2 className="text-3xl font-bold text-white text-center">Private Room</h2>
                <p className="text-white/60 text-center text-sm">
                  Play a friend with a secret access code
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => setMode('create')}
                    className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 hover:from-emerald-500/40 hover:to-teal-500/40 border border-white/20 rounded-2xl text-white font-semibold text-lg transition-all"
                  >
                    Create Room
                  </button>
                  <button
                    onClick={() => setMode('join')}
                    className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-white font-semibold text-lg transition-all"
                  >
                    Join with Code
                  </button>
                </div>
              </>
            )}

            {mode === 'create' && (
              <>
                <h2 className="text-3xl font-bold text-white text-center">Create Room</h2>
                <p className="text-white/60 text-center text-sm">
                  Choose your color, then share the code with your friend
                </p>
                <div>
                  <span className="text-white block mb-3">Your Color</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setHostColor('white')}
                      className={`py-4 rounded-xl font-semibold text-lg transition-all border-2 ${
                        hostColor === 'white'
                          ? 'bg-white text-gray-900 border-white'
                          : 'bg-white/10 text-white border-transparent hover:bg-white/20'
                      }`}
                    >
                      White
                    </button>
                    <button
                      onClick={() => setHostColor('black')}
                      className={`py-4 rounded-xl font-semibold text-lg transition-all border-2 ${
                        hostColor === 'black'
                          ? 'bg-gray-900 text-white border-white'
                          : 'bg-white/10 text-white border-transparent hover:bg-white/20'
                      }`}
                    >
                      Black
                    </button>
                  </div>
                </div>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                <div className="space-y-3">
                  <button
                    onClick={handleCreate}
                    disabled={loading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 hover:from-emerald-500/40 hover:to-teal-500/40 border border-white/20 rounded-xl text-white font-medium transition-all disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Room'}
                  </button>
                  <button
                    onClick={() => { setMode('choose'); setError(''); }}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all"
                  >
                    Back
                  </button>
                </div>
              </>
            )}

            {mode === 'join' && (
              <>
                <h2 className="text-3xl font-bold text-white text-center">Join Room</h2>
                <p className="text-white/60 text-center text-sm">
                  Enter the 6-character code your friend shared
                </p>
                <div>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(normalizeAccessCode(e.target.value).slice(0, 6))}
                    placeholder="ENTER CODE"
                    maxLength={6}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className="w-full py-4 px-6 bg-white/10 border border-white/20 rounded-xl text-white text-2xl font-bold text-center tracking-[0.3em] uppercase focus:outline-none focus:border-emerald-400/60 placeholder:text-white/30"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
                  />
                </div>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                <div className="space-y-3">
                  <button
                    onClick={handleJoin}
                    disabled={loading || normalizeAccessCode(joinCode).length < 4}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 hover:from-emerald-500/40 hover:to-teal-500/40 border border-white/20 rounded-xl text-white font-medium transition-all disabled:opacity-50"
                  >
                    {loading ? 'Joining...' : 'Join Room'}
                  </button>
                  <button
                    onClick={() => { setMode('choose'); setError(''); setJoinCode(''); }}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all"
                  >
                    Back
                  </button>
                </div>
              </>
            )}
          </div>

          {mode === 'choose' && (
            <button
              onClick={onBack}
              className="w-full mt-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all"
            >
              Back to Menu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
