/**
 * Ambient audio engine for the "Scenes" subsystem.
 *
 * Plays a single looping ambient voice at a time and crossfades between
 * scenes. Two source kinds are supported:
 *   - 'synth': runtime-generated filtered noise per scene profile (no binary
 *     assets required — used for v1 placeholders).
 *   - 'file' : an <audio> loop pointed at a URL under /public/themes.
 *
 * This is intentionally separate from src/lib/audio.ts (which only does
 * short timer-completion chimes).
 */
import type { AmbienceProfile, Scene } from '../types';

const FADE_MS = 800;

const clamp01 = (v: number) => Math.min(1, Math.max(0, Number(v) || 0));

// --- AudioContext (own instance, separate from the chime context) ----------
let sharedCtx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) sharedCtx = new Ctor();
  if (sharedCtx.state === 'suspended') sharedCtx.resume().catch(() => {});
  return sharedCtx;
};

/** Resume/unlock audio from inside a user gesture (autoplay policy). */
export const primeAudio = (): void => {
  getCtx();
};

// --- Noise buffer (white noise, shaped per profile by filters) -------------
let noiseBuffer: AudioBuffer | null = null;
const getNoise = (ctx: AudioContext): AudioBuffer => {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const len = Math.floor(ctx.sampleRate * 2);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
};

const configureFilter = (filter: BiquadFilterNode, profile: AmbienceProfile) => {
  switch (profile) {
    case 'rain':
      filter.type = 'highpass';
      filter.frequency.value = 1500;
      filter.Q.value = 0.7;
      break;
    case 'meadow':
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      break;
    case 'forest':
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      break;
    case 'library':
      filter.type = 'lowpass';
      filter.frequency.value = 350;
      break;
    case 'night':
      filter.type = 'lowpass';
      filter.frequency.value = 280;
      break;
    case 'seaside':
      filter.type = 'bandpass';
      filter.frequency.value = 600;
      filter.Q.value = 0.6;
      break;
  }
};

// --- Generic value ramper ---------------------------------------------------
interface Ramped {
  ramp: (target: number, ms?: number) => void;
  stop: () => void;
}
const makeRamped = (setRaw: (v: number) => void, initial: number): Ramped => {
  let current = initial;
  let raf = 0;
  const cancel = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const ramp = (target: number, ms = FADE_MS) => {
    cancel();
    const start = current;
    const t0 = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / ms);
      current = start + (target - start) * t;
      setRaw(current);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  return { ramp, stop: cancel };
};

// --- Voice abstraction (synth or file) --------------------------------------
interface Voice {
  setGain: (g: number) => void;
  stop: () => void;
}

const createSynthVoice = (profile: AmbienceProfile, reducedMotion: boolean): Voice => {
  const ctx = getCtx();
  if (!ctx) return { setGain: () => {}, stop: () => {} };

  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  configureFilter(filter, profile);

  const baseGain = ctx.createGain();
  baseGain.gain.value = 0;

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 1;

  src.connect(filter);
  filter.connect(baseGain);
  baseGain.connect(lfoGain);
  lfoGain.connect(ctx.destination);

  let lfo: OscillatorNode | null = null;
  if (!reducedMotion && (profile === 'meadow' || profile === 'seaside' || profile === 'forest')) {
    lfo = ctx.createOscillator();
    lfo.frequency.value = profile === 'seaside' ? 0.12 : 0.07;
    const depth = ctx.createGain();
    depth.gain.value = 0.15; // gentle movement, never negative
    lfo.connect(depth);
    depth.connect(lfoGain.gain);
    lfo.start();
  }

  src.start();

  const ramper = makeRamped((v) => {
    baseGain.gain.value = Math.max(0, v);
  }, 0);

  return {
    setGain: (g) => ramper.ramp(g),
    stop: () => {
      ramper.stop();
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
      try {
        lfo?.stop();
      } catch {
        /* already stopped */
      }
    },
  };
};

const createFileVoice = (srcUrl: string): Voice => {
  const el = new Audio();
  el.src = srcUrl;
  el.loop = true;
  el.volume = 0;
  el.crossOrigin = 'anonymous';
  el.play().catch(() => {});
  const ramper = makeRamped((v) => {
    el.volume = Math.max(0, Math.min(1, v));
  }, 0);
  return {
    setGain: (g) => ramper.ramp(g),
    stop: () => {
      ramper.stop();
      el.pause();
      el.removeAttribute('src');
      el.load();
    },
  };
};

// --- Engine state ----------------------------------------------------------
let current: Voice | null = null;
let currentKey = '';
let lastVolume = 0.15;

/**
 * Switch the active scene. Pass `null` to stop. Crossfades over FADE_MS.
 */
export const setScene = (
  scene: Scene | null,
  volume: number,
  reducedMotion: boolean
): void => {
  const target = clamp01(volume);
  lastVolume = target;

  if (!scene) {
    if (current) {
      const old = current;
      old.setGain(0);
      setTimeout(() => old.stop(), FADE_MS + 60);
      current = null;
      currentKey = '';
    }
    return;
  }

  const key = `${scene.id}:${scene.audio.kind}`;
  // Same scene already playing → just adjust volume.
  if (key === currentKey && current) {
    current.setGain(target);
    return;
  }

  const incoming: Voice =
    scene.audio.kind === 'file'
      ? createFileVoice(scene.audio.src)
      : createSynthVoice(scene.audio.profile, reducedMotion);

  incoming.setGain(target);

  if (current) {
    const old = current;
    old.setGain(0);
    setTimeout(() => old.stop(), FADE_MS + 60);
  }
  current = incoming;
  currentKey = key;
};

/** Update the master ambient volume (0..1) of the active voice. */
export const setVolume = (v: number): void => {
  const target = clamp01(v);
  lastVolume = target;
  if (current) current.setGain(target);
};

/** Stop any playing ambient audio immediately-ish (fade out). */
export const stopAmbient = (): void => {
  if (current) {
    const old = current;
    old.setGain(0);
    setTimeout(() => old.stop(), FADE_MS + 60);
    current = null;
    currentKey = '';
  }
};
