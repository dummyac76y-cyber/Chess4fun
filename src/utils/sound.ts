/**
 * Tiny WebAudio-based sound effects – no network requests, no missing assets.
 * All sounds are synthesized lazily after the first user gesture.
 */
type SoundName = 'move' | 'capture' | 'check' | 'gameEnd';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(
  audio: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainValue = 0.08,
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainValue, startAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(startAt);
  osc.stop(startAt + duration);
}

export function playSound(name: SoundName) {
  const audio = getCtx();
  if (!audio) return;
  const t = audio.currentTime;
  switch (name) {
    case 'move':
      blip(audio, 660, t, 0.08, 'triangle');
      break;
    case 'capture':
      blip(audio, 330, t, 0.1, 'square', 0.06);
      blip(audio, 220, t + 0.03, 0.12, 'sawtooth', 0.05);
      break;
    case 'check':
      blip(audio, 880, t, 0.09, 'triangle');
      blip(audio, 1175, t + 0.09, 0.12, 'triangle');
      break;
    case 'gameEnd':
      blip(audio, 523, t, 0.15, 'triangle');
      blip(audio, 659, t + 0.15, 0.15, 'triangle');
      blip(audio, 784, t + 0.3, 0.25, 'triangle');
      break;
  }
}
