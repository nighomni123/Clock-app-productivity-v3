/**
 * Selected focus backdrop: persistence + audio lifecycle.
 *
 * The selection lives inside `UserSettings.focusBackground`, so it reuses the
 * app's existing settings pipeline wholesale: mirrored to
 * `localStorage['focus_local_settings']` in guest mode, written to the
 * `sync_sessions/<CODE>` document when a 9-letter sync code is active (and
 * therefore scoped to that code), otherwise merged into `users/<uid>`. Nothing
 * in this hook re-implements storage or sync.
 *
 * Each backdrop plays up to two layered, looping voices — an `ambient`
 * soundscape and an optional `music` track — both managed by `AudioManager`.
 * This hook is the only bridge between React state and that framework-free
 * engine.
 */
import { useCallback, useEffect, useMemo } from 'react';
import type { FocusBackgroundSettings, UserSettings } from '../../types';
import {
  getFocusBackground,
  NONE_BACKGROUND_ID,
  type FocusBackgroundOption,
} from './backgroundConfig';
import {
  playAmbient,
  setAmbientVolume,
  stopAmbient,
  stopAmbientNow,
  playMusic,
  setMusicVolume as setMusicEngineVolume,
  stopMusic,
  stopMusicNow,
} from './AudioManager';

/** Fallback ambient level when nothing has been stored yet. */
const DEFAULT_VOLUME = 0.14;
/** Fallback music level: subtle, sits under the ambient bed. */
const DEFAULT_MUSIC_VOLUME = 0.1;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));

/**
 * Normalise a persisted value that may be absent or partial — older app
 * versions, sync peers that predate this feature, and shallow Firestore merges
 * can all hand us `undefined` or an object missing keys.
 */
export const normaliseFocusBackground = (
  raw: FocusBackgroundSettings | undefined
): FocusBackgroundSettings => {
  const id = typeof raw?.id === 'string' && raw.id ? raw.id : NONE_BACKGROUND_ID;
  return {
    id,
    audioEnabled: raw?.audioEnabled !== false,
    volume: typeof raw?.volume === 'number' ? clamp01(raw.volume) : DEFAULT_VOLUME,
    musicEnabled: raw?.musicEnabled !== false,
    musicVolume: typeof raw?.musicVolume === 'number' ? clamp01(raw.musicVolume) : DEFAULT_MUSIC_VOLUME,
  };
};

export interface FocusBackgroundController {
  /** Stored id (`'none'` when no backdrop is selected). */
  id: string;
  /** Resolved registry option, or `null` for `none`/unknown ids. */
  option: FocusBackgroundOption | null;
  volume: number;
  audioEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  /** Whether focus mode is currently running (backdrop + audio should be on). */
  active: boolean;
  /** Persist a new selection. Call from a click handler (unlocks audio on iOS). */
  setId: (id: string) => void;
  setVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  toggleAudio: () => void;
  toggleMusic: () => void;
}

interface UseFocusBackgroundArgs {
  settings: UserSettings;
  onUpdateSettings: (next: UserSettings) => void | Promise<void>;
  /** Focus mode is live: a focus block is running or fullscreen focus is open. */
  active: boolean;
}

export const useFocusBackground = ({
  settings,
  onUpdateSettings,
  active,
}: UseFocusBackgroundArgs): FocusBackgroundController => {
  const stored = useMemo(() => normaliseFocusBackground(settings.focusBackground), [settings.focusBackground]);
  const option = useMemo(() => getFocusBackground(stored.id), [stored.id]);

  const commit = useCallback(
    (next: FocusBackgroundSettings) => {
      onUpdateSettings({ ...settings, focusBackground: next });
    },
    [onUpdateSettings, settings]
  );

  // Declarative driver: focus start/stop, mode changes, reloads, sync updates.
  useEffect(() => {
    if (active && stored.audioEnabled && option?.audio) {
      playAmbient({ key: option.id, src: option.audio.src }, stored.volume);
    } else {
      stopAmbient();
    }
    if (active && stored.musicEnabled && option?.music) {
      playMusic({ key: option.id, src: option.music.src }, stored.musicVolume);
    } else {
      stopMusic();
    }
  }, [active, stored.audioEnabled, stored.volume, stored.musicEnabled, stored.musicVolume, option]);

  // Leaving the app (unmount) should not leave a loop running behind.
  useEffect(() => () => {
    stopAmbientNow();
    stopMusicNow();
  }, []);

  // Called straight from click handlers so the play() call sits inside the
  // user gesture (iOS Safari rejects media started from a post-paint effect).
  const drive = useCallback(
    (next: FocusBackgroundSettings) => {
      const nextOption = getFocusBackground(next.id);
      if (active && next.audioEnabled && nextOption?.audio) {
        playAmbient({ key: nextOption.id, src: nextOption.audio.src }, next.volume);
      } else {
        stopAmbient();
      }
      if (active && next.musicEnabled && nextOption?.music) {
        playMusic({ key: nextOption.id, src: nextOption.music.src }, next.musicVolume);
      } else {
        stopMusic();
      }
    },
    [active]
  );

  const setId = useCallback(
    (id: string) => {
      const next: FocusBackgroundSettings = {
        ...stored,
        id,
        // Picking a backdrop is an intent to use it: re-enable ambience + music.
        audioEnabled: id === NONE_BACKGROUND_ID ? stored.audioEnabled : true,
        musicEnabled: id === NONE_BACKGROUND_ID ? stored.musicEnabled : true,
      };
      if (next.id === stored.id && next.audioEnabled === stored.audioEnabled && next.musicEnabled === stored.musicEnabled) {
        return;
      }
      // A newly selected track falls back to its own gentle default level the
      // first time it is chosen, so loud files never surprise anyone.
      if (next.id !== stored.id) {
        const fresh = getFocusBackground(next.id);
        const hasUserLevel = Object.prototype.hasOwnProperty.call(
          settings.focusBackground ?? {},
          'volume'
        );
        if (fresh?.audio && !hasUserLevel) next.volume = fresh.audio.volume;
        const hasUserMusicLevel = Object.prototype.hasOwnProperty.call(
          settings.focusBackground ?? {},
          'musicVolume'
        );
        if (fresh?.music && !hasUserMusicLevel) next.musicVolume = fresh.music.volume;
      }
      commit(next);
      drive(next);
    },
    [commit, drive, settings.focusBackground, stored]
  );

  const setVolume = useCallback(
    (volume: number) => {
      const next: FocusBackgroundSettings = { ...stored, volume: clamp01(volume) };
      commit(next);
      // Immediate audible feedback without waiting for the effect round-trip.
      if (active && next.audioEnabled && option?.audio) setAmbientVolume(next.volume);
    },
    [active, commit, option, stored]
  );

  const setMusicVolume = useCallback(
    (volume: number) => {
      const next: FocusBackgroundSettings = { ...stored, musicVolume: clamp01(volume) };
      commit(next);
      if (active && next.musicEnabled && option?.music) setMusicEngineVolume(next.musicVolume);
    },
    [active, commit, option, stored]
  );

  const toggleAudio = useCallback(() => {
    const next: FocusBackgroundSettings = { ...stored, audioEnabled: !stored.audioEnabled };
    commit(next);
    drive(next);
  }, [commit, drive, stored]);

  const toggleMusic = useCallback(() => {
    const next: FocusBackgroundSettings = { ...stored, musicEnabled: !stored.musicEnabled };
    commit(next);
    drive(next);
  }, [commit, drive, stored]);

  return {
    id: stored.id,
    option,
    volume: stored.volume,
    audioEnabled: stored.audioEnabled,
    musicEnabled: stored.musicEnabled,
    musicVolume: stored.musicVolume,
    active,
    setId,
    setVolume,
    setMusicVolume,
    toggleAudio,
    toggleMusic,
  };
};

export default useFocusBackground;
