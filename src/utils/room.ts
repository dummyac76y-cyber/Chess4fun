/**
 * Private-room networking helpers.
 *
 * There is no external game server in this app, so online rooms are carried
 * over a BroadcastChannel: two browser tabs on the same machine join the same
 * room code and play as two independent clients (one White, one Black).
 * Every move / result / chat message is broadcast to the other tab, so both
 * boards always show the identical position – each from its own player's
 * perspective (own color at the bottom, correct piece colors, synced moves).
 */

export type RoomMessage =
  | { t: 'hello'; id: string }
  | { t: 'welcome'; id: string; to: string }
  | { t: 'start'; id: string; fen: string; color: 'white' | 'black'; game: number }
  | { t: 'move'; id: string; san: string; game: number }
  | { t: 'result'; id: string; reason: 'surrender' | 'timeout' | 'checkmate' | 'stalemate' | 'draw'; winner: 'white' | 'black' | null }
  | { t: 'rematch'; id: string }
  | { t: 'leave'; id: string };

export function makeRoomId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function makeClientId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const roomStorageKey = (room: string) => `chessRoom:${room}`;

export interface RoomAssignment {
  hostId: string;
  guestId: string | null;
}

export function readRoom(room: string): RoomAssignment | null {
  try {
    const raw = localStorage.getItem(roomStorageKey(room));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.hostId === 'string') {
      return { hostId: parsed.hostId, guestId: typeof parsed.guestId === 'string' ? parsed.guestId : null };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeRoom(room: string, assignment: RoomAssignment): void {
  try {
    localStorage.setItem(roomStorageKey(room), JSON.stringify(assignment));
  } catch {
    /* storage unavailable – room still works within this tab pair via events */
  }
}

export function clearRoom(room: string): void {
  try {
    localStorage.removeItem(roomStorageKey(room));
  } catch { /* ignore */ }
}

/**
 * Claims a seat in the room. Returns the local client id and the color this
 * tab will play, or null when the room is already full (both seats taken by
 * live clients). The host slot doubles as a heartbeat: a stale host can be
 * taken over, which keeps rooms recoverable after a crashed tab.
 */
export function claimSeat(room: string, myId: string): { role: 'host' | 'guest'; color: 'white' | 'black' } | null {
  const now = Date.now();
  const a = readRoom(room);
  if (!a) {
    writeRoom(room, { hostId: myId, guestId: null });
    return { role: 'host', color: 'white' };
  }
  if (a.hostId === myId) return { role: 'host', color: 'white' };
  if (a.guestId === myId) return { role: 'guest', color: 'black' };
  if (!a.guestId) {
    writeRoom(room, { ...a, guestId: myId });
    return { role: 'guest', color: 'black' };
  }
  // Both seats claimed – allow taking over a dead host tab.
  const fresh = (now - (a as RoomAssignment & { hostTs?: number }).hostTs!) < 15000;
  if ((a as RoomAssignment & { hostTs?: number }).hostTs && !fresh) {
    writeRoom(room, { hostId: myId, guestId: null });
    return { role: 'host', color: 'white' };
  }
  return null;
}

/** Host refreshes its heartbeat while it is alive. */
export function touchHost(room: string, hostId: string): void {
  const a = readRoom(room);
  if (a && a.hostId === hostId) {
    writeRoom(room, { ...a, hostTs: Date.now() } as RoomAssignment & { hostTs: number });
  }
}
