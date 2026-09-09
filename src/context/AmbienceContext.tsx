import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { Scene, UserSettings } from '../types';
import { getScene, NONE_SCENE_ID } from '../lib/scenes';
import { primeAudio, setScene, setVolume } from '../lib/ambientAudio';

interface AmbienceContextValue {
  scene: Scene | null;
  enabled: boolean;
  volume: number;
  reducedMotion: boolean;
  /** Select a scene by id (also enables ambience). */
  setSceneId: (id: string) => void;
  /** Toggle ambience on/off for the current scene. */
  toggleEnabled: () => void;
  /** Set master ambient volume (0..1). */
  setVolume: (v: number) => void;
}

const AmbienceContext = createContext<AmbienceContextValue | null>(null);

interface AmbienceProviderProps {
  settings: UserSettings;
  onUpdateSettings: (next: UserSettings) => void;
  children: React.ReactNode;
}

const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return !!reduced;
};

export const AmbienceProvider: React.FC<AmbienceProviderProps> = ({
  settings,
  onUpdateSettings,
  children,
}) => {
  const { ambience } = settings;
  const reducedMotion = usePrefersReducedMotion();

  const scene = useMemo(() => getScene(ambience.sceneId), [ambience.sceneId]);

  // Drive the audio engine whenever the active scene/volume/reduced-motion change.
  useEffect(() => {
    if (ambience.enabled && scene) {
      setScene(scene, ambience.volume, reducedMotion);
    } else {
      setScene(null, 0, reducedMotion);
    }
  }, [scene, ambience.enabled, ambience.volume, reducedMotion]);

  const setSceneId = useCallback(
    (id: string) => {
      // Unlock audio from inside the user gesture (autoplay policy).
      primeAudio();
      const picked = getScene(id);
      const nextVolume =
        !ambience.enabled && picked?.defaultVolume != null
          ? picked.defaultVolume
          : ambience.volume;
      onUpdateSettings({
        ...settings,
        ambience: {
          sceneId: id,
          enabled: id !== NONE_SCENE_ID,
          volume: nextVolume,
        },
      });
    },
    [ambience, settings, onUpdateSettings]
  );

  const toggleEnabled = useCallback(() => {
    primeAudio();
    onUpdateSettings({
      ...settings,
      ambience: { ...ambience, enabled: !ambience.enabled },
    });
  }, [ambience, settings, onUpdateSettings]);

  const setVolumeCb = useCallback(
    (v: number) => {
      onUpdateSettings({
        ...settings,
        ambience: { ...ambience, volume: Math.min(1, Math.max(0, v)) },
      });
    },
    [ambience, settings, onUpdateSettings]
  );

  const value: AmbienceContextValue = {
    scene,
    enabled: ambience.enabled,
    volume: ambience.volume,
    reducedMotion,
    setSceneId,
    toggleEnabled,
    setVolume: setVolumeCb,
  };

  return <AmbienceContext.Provider value={value}>{children}</AmbienceContext.Provider>;
};

export const useAmbience = (): AmbienceContextValue => {
  const ctx = useContext(AmbienceContext);
  if (!ctx) throw new Error('useAmbience must be used within an AmbienceProvider');
  return ctx;
};
