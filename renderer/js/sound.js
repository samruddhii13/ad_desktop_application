/**
 * sound.js — Web Audio API sound effects for IP Detectives.
 * All sounds are generated programmatically — no external audio files needed.
 */

let audioCtx = null;
let _muted = false;

/** Lazily initialise the AudioContext (browsers require a user gesture first). */
function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/* ── Utility: play a tone at a given frequency and duration ──── */
function playTone(freq, duration, type = 'sine', volume = 0.3, delay = 0) {
  if (_muted) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

/* ── Public sound effects ────────────────────────────────────── */

/** Short happy ascending tone — correct answer. */
export function playCorrect() {
  playTone(523, 0.12, 'sine', 0.25, 0);       // C5
  playTone(659, 0.15, 'sine', 0.25, 0.08);     // E5
  playTone(784, 0.2, 'sine', 0.2, 0.16);       // G5
}

/** Short descending buzzer — wrong answer. */
export function playWrong() {
  playTone(330, 0.15, 'square', 0.15, 0);      // E4
  playTone(262, 0.25, 'square', 0.12, 0.1);    // C4
}

/** Ascending arpeggio — level complete. */
export function playLevelComplete() {
  playTone(523, 0.15, 'sine', 0.2, 0);         // C5
  playTone(659, 0.15, 'sine', 0.2, 0.12);      // E5
  playTone(784, 0.15, 'sine', 0.2, 0.24);      // G5
  playTone(1047, 0.3, 'sine', 0.25, 0.36);     // C6
}

/** Short click. */
export function playClick() {
  playTone(800, 0.04, 'sine', 0.1, 0);
}

/** Sparkle — star earned. */
export function playStar() {
  playTone(1319, 0.08, 'sine', 0.15, 0);       // E6
  playTone(1568, 0.12, 'sine', 0.15, 0.06);    // G6
  playTone(2093, 0.15, 'sine', 0.1, 0.12);     // C7
}

/** Whoosh — screen transition. */
export function playTransition() {
  if (_muted) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

/* ── Mute controls ───────────────────────────────────────────── */
export function setMuted(muted) {
  _muted = muted;
}

export function isMuted() {
  return _muted;
}
