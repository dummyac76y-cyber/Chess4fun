import { useCallback, useEffect, useRef, useState } from 'react';
import { TimeControl } from '../App';

export function timeControlToSeconds(tc: TimeControl): number | null {
  switch (tc) {
    case '5min': return 300;
    case '10min': return 600;
    case '15min': return 900;
    case '30min': return 1800;
    default: return null; // unlimited
  }
}

export interface GameClock {
  whiteTime: number;
  blackTime: number;
  running: boolean;
  timeoutWinner: 'white' | 'black' | null;
  start: () => void;
  pause: () => void;
  resume: () => void;
  /** Call right after a move is made – switches the active clock. */
  onMoveCompleted: () => void;
  reset: (tc: TimeControl) => void;
}

/**
 * Lightweight chess clock. Ticks at most once per second and only updates
 * React state for the side whose clock is actually running.
 */
export function useGameClock(
  initialTimeControl: TimeControl,
  initialRunning = false,
): GameClock {
  const initial = timeControlToSeconds(initialTimeControl);
  const [times, setTimes] = useState<{ white: number; black: number }>({
    white: initial ?? Infinity,
    black: initial ?? Infinity,
  });
  const [running, setRunning] = useState(initialRunning && initial !== null);
  const [activeColor, setActiveColor] = useState<'white' | 'black'>('white');
  const [timeoutWinner, setTimeoutWinner] = useState<'white' | 'black' | null>(null);

  const timesRef = useRef(times);
  const runningRef = useRef(running);
  const activeRef = useRef(activeColor);
  const limitRef = useRef<number | null>(initial);
  const lastTickRef = useRef(Date.now());
  const intervalRef = useRef<number | null>(null);

  runningRef.current = running;
  activeRef.current = activeColor;

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (!runningRef.current || limitRef.current === null) return;
    const now = Date.now();
    const elapsed = (now - lastTickRef.current) / 1000;
    lastTickRef.current = now;

    const color = activeRef.current;
    const next = Math.max(0, timesRef.current[color] - elapsed);
    timesRef.current = { ...timesRef.current, [color]: next };
    setTimes(timesRef.current);

    if (next <= 0) {
      stopInterval();
      setRunning(false);
      setTimeoutWinner(color === 'white' ? 'black' : 'white');
    }
  }, [stopInterval]);

  const startInterval = useCallback(() => {
    stopInterval();
    lastTickRef.current = Date.now();
    intervalRef.current = window.setInterval(tick, 1000);
  }, [stopInterval, tick]);

  useEffect(() => stopInterval, [stopInterval]);

  const start = useCallback(() => {
    if (limitRef.current === null) return;
    setRunning(true);
    runningRef.current = true;
    startInterval();
  }, [startInterval]);

  const pause = useCallback(() => {
    setRunning(false);
    runningRef.current = false;
    stopInterval();
  }, [stopInterval]);

  const resume = useCallback(() => {
    if (limitRef.current === null) return;
    setRunning(true);
    runningRef.current = true;
    startInterval();
  }, [startInterval]);

  const onMoveCompleted = useCallback(() => {
    setActiveColor(prev => {
      const next = prev === 'white' ? 'black' : 'white';
      activeRef.current = next;
      return next;
    });
    if (runningRef.current) lastTickRef.current = Date.now();
  }, []);

  const reset = useCallback((tc: TimeControl) => {
    stopInterval();
    const seconds = timeControlToSeconds(tc);
    limitRef.current = seconds;
    const fresh = { white: seconds ?? Infinity, black: seconds ?? Infinity };
    timesRef.current = fresh;
    setTimes(fresh);
    setActiveColor('white');
    activeRef.current = 'white';
    setTimeoutWinner(null);
    setRunning(false);
    runningRef.current = false;
  }, [stopInterval]);

  return {
    whiteTime: times.white,
    blackTime: times.black,
    running,
    timeoutWinner,
    start,
    pause,
    resume,
    onMoveCompleted,
    reset,
  };
}

export function formatClock(seconds: number): string {
  if (!isFinite(seconds)) return '\u221E';
  const s = Math.ceil(seconds);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
