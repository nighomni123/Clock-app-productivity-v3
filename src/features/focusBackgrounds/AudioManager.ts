/**
 * Ambient + music audio engine for focus-mode backdrops.
 *
 * Each backdrop may play two looping "voices" at once:
 *   - `ambient`: the scene's paired soundscape (rain, waves, wind, a pad…).
 *   - `music`:   a melodic track layered *under* the ambient, toggleable.
 *
 * Both voices share identical behaviour (crossfade on switch, retained paused
 * elements for instant return, gesture-retry for autoplay-blocked starts) — the
 * only difference is the slot name. To avoid duplicating ~250 lines, the logic
 * is built by a `makeSlot` factory with its own private element map / active
 * state; the public play / setVolume / stop functions for each slot are thin
 * re-exports.
 *
 * Deliberately framework-free: no React, no registry import. The hook in
 * `useFocusBackground.ts` is the only caller. It also avoids `AudioContext`
 * entirely; an `<audio>` element needs no context unlock dance and just works
 * with the service-worker-cached files.
 */

export interface AmbientTrack {
  /** Identity of the thing playing (e.g. a background id), not the file. */
  key: string;
  src: string;
}

/** Default fade length, in ms (~1s: soft in, soft out, no pop). */
const FADE_MS = 1000;

/** Upper bound on retained (paused) media elements before the oldest is dropped. */
const MAX_RETAINED = 4;

/** Media element volume is 0..1; guard against junk settings values. */
const clamp01 = (v: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));

/** Ease (smoothstep) so fades start and end gently instead of linearly. */
const ease = (t: number): number => t * t * (3 - 2 * t);

interface Voice {
  el: HTMLAudioElement;
  /** rAF handle for the in-flight volume ramp, if any. */
  ramp: number;
  /** Timeout that pauses the element once a fade-out completes. */
  settle: number;
}

type SlotName = 'ambient' | 'music';

/**
 * Build one independent voice slot. `ambient` and `music` each get their own
 * element pool and active tracker, so the two layers never fight over a
 * `<audio>` node and switching one backdrop crossfades only that layer.
 */
const makeSlot = (slot: SlotName) => {
  const voices = new Map<string, Voice>();
  /** `src` keys, in insertion order, for the retention cap. */
  const order: string[] = [];
  let active: { key: string; src: string; volume: number } | null = null;

  /** Pending gesture-retry (autoplay blocked). Cleared on any stop/switch. */
  let pendingGestureTrack: AmbientTrack | null = null;
  let gestureListener: ((e: Event) => void) | null = null;

  const canRun = (): boolean =>
    typeof window !== 'undefined' && typeof document !== 'undefined';

  const cancelRamp = (voice: Voice): void => {
    if (voice.ramp) cancelAnimationFrame(voice.ramp);
    voice.ramp = 0;
  };

  const cancelSettle = (voice: Voice): void => {
    if (voice.settle) clearTimeout(voice.settle);
    voice.settle = 0;
  };

  /**
   * Ramp `el.volume` to `target` over `ms`. Cancels any ramp already running on
   * the same element so rapid switching never stacks animations.
   */
  const rampTo = (voice: Voice, target: number, ms: number, onDone?: () => void): void => {
    cancelRamp(voice);
    const el = voice.el;
    if (!ms || ms <= 0) {
      el.volume = clamp01(target);
      onDone?.();
      return;
    }
    const start = el.volume;
    const t0 = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / ms);
      el.volume = clamp01(start + (target - start) * ease(t));
      if (t < 1) {
        voice.ramp = requestAnimationFrame(step);
      } else {
        voice.ramp = 0;
        onDone?.();
      }
    };
    voice.ramp = requestAnimationFrame(step);
  };

  const acquireVoice = (src: string): Voice | null => {
    const existing = voices.get(src);
    if (existing) {
      cancelSettle(existing);
      cancelRamp(existing);
      return existing;
    }
    if (!canRun()) return null;

    const el = new Audio();
    el.src = src;
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;

    const voice: Voice = { el, ramp: 0, settle: 0 };
    voices.set(src, voice);
    order.push(src);

    // Retain a handful of paused loops for instant, re-buffered-free switching.
    while (order.length > MAX_RETAINED) {
      const oldest = order.shift();
      if (!oldest || oldest === active?.src) continue;
      const stale = voices.get(oldest);
      if (stale) {
        cancelRamp(stale);
        cancelSettle(stale);
        stale.el.pause();
        stale.el.removeAttribute('src');
        stale.el.load();
        voices.delete(oldest);
      }
    }
    return voice;
  };

  const detachGestureRetry = (): void => {
    if (!gestureListener) return;
    window.removeEventListener('pointerdown', gestureListener, true);
    window.removeEventListener('keydown', gestureListener, true);
    gestureListener = null;
    pendingGestureTrack = null;
  };

  /**
   * If a browser autoplay policy rejected `play()`, retry once on the next real
   * user interaction. Covers focus blocks that start without a gesture (e.g.
   * "Auto-start Focus" or a session continuing across a reload).
   */
  const armGestureRetry = (track: AmbientTrack, volume: number): void => {
    pendingGestureTrack = track;
    if (gestureListener) return;
    gestureListener = () => {
      const retry = pendingGestureTrack;
      detachGestureRetry();
      if (retry) play(retry, volume);
    };
    window.addEventListener('pointerdown', gestureListener, { capture: true, once: true });
    window.addEventListener('keydown', gestureListener, { capture: true, once: true });
  };

  /** Fade the currently playing voice out (if any) and park it. */
  const fadeOutActive = (ms: number): void => {
    if (!active) return;
    const voice = voices.get(active.src);
    const src = active.src;
    active = null;
    if (!voice) return;
    cancelRamp(voice);
    cancelSettle(voice);
    rampTo(voice, 0, ms, () => {
      cancelSettle(voice);
      voice.el.pause();
    });
    // Safety net: pause even if the tab is hidden and rAF never fires.
    voice.settle = window.setTimeout(() => {
      voice.settle = 0;
      voices.get(src)?.el.pause();
    }, ms + 120);
  };

  /**
   * Start (or keep) a loop. Calling this repeatedly with the same `key` while it
   * is already playing only adjusts volume — the track never restarts.
   */
  const play = (track: AmbientTrack, volume: number, fadeMs = FADE_MS): void => {
    if (!canRun()) return;
    const target = clamp01(volume);
    detachGestureRetry();

    // Match on the *file*, not the backdrop: two backdrops can share one loop.
    const sameTrack = Boolean(active) && active.src === track.src;
    if (sameTrack) {
      const voice = voices.get(track.src);
      if (voice && !voice.el.paused) {
        active = { key: track.key, src: track.src, volume: target };
        rampTo(voice, target, Math.min(fadeMs, 400));
        return;
      }
      // Same file but the element stalled/ended (e.g. iOS suspended it): resume.
      if (voice) {
        voice.el.volume = 0;
        const started = voice.el.play();
        active = { key: track.key, src: track.src, volume: target };
        if (started && typeof started.catch === 'function') {
          started.catch(() => armGestureRetry(track, target));
        }
        rampTo(voice, target, fadeMs);
        return;
      }
    }

    const voice = acquireVoice(track.src);
    if (!voice) return;

    // Crossfade: bring the incoming voice up while the outgoing one sinks.
    fadeOutActive(fadeMs);
    active = { key: track.key, src: track.src, volume: target };

    voice.el.volume = 0;
    const started = voice.el.play();
    if (started && typeof started.catch === 'function') {
      started.catch(() => armGestureRetry(track, target));
    }
    rampTo(voice, target, fadeMs);
  };

  /** Re-target the active voice's volume (short fade, no restart). */
  const setVolume = (volume: number, fadeMs = 260): void => {
    const target = clamp01(volume);
    if (!active) return;
    const voice = voices.get(active.src);
    active = { ...active, volume: target };
    if (voice) rampTo(voice, target, fadeMs);
  };

  /** Fade the active voice out and stop tracking it. Safe to call when idle. */
  const stop = (fadeMs = FADE_MS): void => {
    if (!canRun()) return;
    detachGestureRetry();
    fadeOutActive(fadeMs);
  };

  /** Stop immediately (unmount / page hide): no fade, no lingering rAF. */
  const stopNow = (): void => {
    if (!canRun()) return;
    detachGestureRetry();
    if (!active) return;
    const voice = voices.get(active.src);
    active = null;
    if (!voice) return;
    cancelRamp(voice);
    cancelSettle(voice);
    voice.el.volume = 0;
    voice.el.pause();
  };

  /** Whether a given track key is currently the active voice. */
  const isPlaying = (key: string): boolean => active?.key === key;

  return { play, setVolume, stop, stopNow, isPlaying };
};

const ambient = makeSlot('ambient');
const music = makeSlot('music');

// --- Public ambient API (unchanged signatures for existing callers) ---------
export const playAmbient = ambient.play;
export const setAmbientVolume = ambient.setVolume;
export const stopAmbient = ambient.stop;
export const stopAmbientNow = ambient.stopNow;
export const isAmbientPlaying = ambient.isPlaying;

// --- Public music API (the layered melodic track) --------------------------
export const playMusic = music.play;
export const setMusicVolume = music.setVolume;
export const stopMusic = music.stop;
export const stopMusicNow = music.stopNow;
export const isMusicPlaying = music.isPlaying;
