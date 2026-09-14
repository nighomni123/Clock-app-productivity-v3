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
 * Mount this hook **once** (in `App.tsx`) and pass the returned controller down
 * as a prop — mirroring how the rest of the app threads `settings` +
 * `onUpdateSettings`. It is the only bridge between React state and the
 * framework-free `AudioManager`.
 */
import { useCallback, useEffect, useMemo } from 'react';
import type { FocusBackgroundSettings, UserSettings } from '../../types';
import {
  getFocusBackground,
  NONE_BACKGROUND_ID,
  type FocusBackgroundOption,
} from './backgroundConfig';
import { playAmbient, setAmbientVolume, stopAmbient, stopAmbientNow } from './AudioManager';

/** Fallback ambient level when nothing has been stored yet. */
const DEFAULT_VOLUME = 0.14;

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
  };
};

export interface FocusBackgroundController {
  /** Stored id (`'none'` when no backdrop is selected). */
  id: string;
  /** Resolved registry option, or `null` for `none`/unknown ids. */
  option: FocusBackgroundOption | null;
  volume: number;
  audioEnabled: boolean;
  /** Whether focus mode is currently running (backdrop + audio should be on). */
  active: boolean;
  /** Persist a new selection. Call from a click handler (unlocks audio on iOS). */
  setId: (id: string) => void;
  setVolume: (volume: number) => void;
  toggleAudio: () => void;
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
  }, [active, stored.audioEnabled, stored.volume, option]);

  // Leaving the app (unmount) should not leave a loop running behind.
  useEffect(() => () => stopAmbientNow(), []);

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
    },
    [active]
  );

  const setId = useCallback(
    (id: string) => {
      const next: FocusBackgroundSettings = {
        ...stored,
        id,
        // Picking a backdrop is an intent to use it: re-enable ambience.
        audioEnabled: id === NONE_BACKGROUND_ID ? stored.audioEnabled : true,
      };
      if (next.id === stored.id && next.audioEnabled === stored.audioEnabled) return;
      // A newly selected track falls back to its own gentle default level the
      // first time it is chosen, so loud files never surprise anyone.
      if (next.id !== stored.id) {
        const fresh = getFocusBackground(next.id);
        const hasUserLevel = Object.prototype.hasOwnProperty.call(
          settings.focusBackground ?? {},
          'volume'
        );
        if (fresh?.audio && !hasUserLevel) next.volume = fresh.audio.volume;
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

  const toggleAudio = useCallback(() => {
    const next: FocusBackgroundSettings = { ...stored, audioEnabled: !stored.audioEnabled };
    commit(next);
    drive(next);
  }, [commit, drive, stored]);

  return {
    id: stored.id,
    option,
    volume: stored.volume,
    audioEnabled: stored.audioEnabled,
    active,
    setId,
    setVolume,
    toggleAudio,
  };
};

export default useFocusBackground;
