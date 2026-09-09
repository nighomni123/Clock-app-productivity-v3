import type { Scene } from '../types';

/** Sentinel id used when no scene is selected. */
export const NONE_SCENE_ID = 'none';

/**
 * Scene catalog.
 *
 * Each scene pairs a background (CSS gradient for now; drop optimized WebP
 * files into `public/themes/images/` and switch `background` to
 * `{ type: 'image', value: '/themes/images/<id>.webp' }`) with an ambient
 * audio source.
 *
 * Audio sources come in two flavours (see `SceneAudioSource` in `src/types`):
 *   - `file`  : a seamless loop served same-origin from `/public/themes/audio`
 *              (cached by the service worker, works offline). This is what the
 *              shipped scenes use.
 *   - `synth` : runtime-generated filtered noise (no binary asset required).
 *              Kept as a zero-dependency fallback — restore `kind: 'synth'`
 *              with the matching `profile` if a binary loop is ever missing.
 *
 * All `file` loops below are CC0 or CC-BY (attribution in
 * `public/themes/audio/ATTRIBUTIONS.md`). CC-BY assets require the credit
 * shown there; CC0 assets are public domain and need no attribution.
 */
export const SCENES: Scene[] = [
  {
    id: 'rainy-window',
    name: 'Rainy Window',
    mood: 'Calm focus in the rain',
    thumbnailGradient:
      'linear-gradient(160deg, #1e293b 0%, #334155 45%, #475569 100%)',
    background: {
      type: 'gradient',
      value:
        'radial-gradient(120% 120% at 50% 0%, #243042 0%, #1b2533 55%, #0f1620 100%)',
    },
    audio: { kind: 'file', src: '/themes/audio/rain_window.wav' },
    defaultVolume: 0.18,
  },
  {
    id: 'quiet-meadow',
    name: 'Quiet Meadow',
    mood: 'Soft wind, open sky',
    thumbnailGradient:
      'linear-gradient(160deg, #a7f3d0 0%, #5eead4 50%, #0ea5a4 100%)',
    background: {
      type: 'gradient',
      value:
        'linear-gradient(180deg, #bae6fd 0%, #a7f3d0 45%, #fef9c3 100%)',
    },
    // CC-BY 3.0 — see ATTRIBUTIONS.md.
    audio: { kind: 'file', src: '/themes/audio/meadow_wind.ogg' },
    defaultVolume: 0.15,
  },
  {
    id: 'forest-grove',
    name: 'Forest Grove',
    mood: 'Birdsong & leaves',
    thumbnailGradient:
      'linear-gradient(160deg, #14532d 0%, #166534 50%, #052e16 100%)',
    background: {
      type: 'gradient',
      value:
        'radial-gradient(120% 120% at 30% 20%, #1b4332 0%, #14532d 50%, #052e16 100%)',
    },
    // CC0 seamless loop.
    audio: { kind: 'file', src: '/themes/audio/forest_ambience.mp3' },
    defaultVolume: 0.16,
  },
  {
    id: 'cozy-library',
    name: 'Cozy Library',
    mood: 'Warm fireplace, hushed study',
    thumbnailGradient:
      'linear-gradient(160deg, #78350f 0%, #92400e 50%, #451a03 100%)',
    background: {
      type: 'gradient',
      value:
        'radial-gradient(120% 120% at 70% 20%, #4c2a12 0%, #3a1f0c 55%, #1c1206 100%)',
    },
    // CC-BY 4.0 — see ATTRIBUTIONS.md.
    audio: { kind: 'file', src: '/themes/audio/library_fireplace.ogg' },
    defaultVolume: 0.14,
  },
  {
    id: 'snowfall-dusk',
    name: 'Snowfall at Dusk',
    mood: 'Still, gentle hush',
    thumbnailGradient:
      'linear-gradient(160deg, #475569 0%, #64748b 50%, #cbd5e1 100%)',
    background: {
      type: 'gradient',
      value:
        'linear-gradient(180deg, #334155 0%, #64748b 60%, #cbd5e1 100%)',
    },
    // CC0 gentle wind.
    audio: { kind: 'file', src: '/themes/audio/snowfall_wind.wav' },
    defaultVolume: 0.13,
  },
  {
    id: 'seaside-cliff',
    name: 'Seaside Cliff',
    mood: 'Waves & salt air',
    thumbnailGradient:
      'linear-gradient(160deg, #0c4a6e 0%, #0891b2 50%, #67e8f9 100%)',
    background: {
      type: 'gradient',
      value:
        'linear-gradient(180deg, #0c4a6e 0%, #0891b2 55%, #a5f3fc 100%)',
    },
    // CC-BY 3.0 — see ATTRIBUTIONS.md.
    audio: { kind: 'file', src: '/themes/audio/seaside_waves.ogg' },
    defaultVolume: 0.17,
  },

  // --- Royalty-free music scenes (all CC0 unless noted) --------------------
  // These give the user selectable, endlessly-looping focus music on top of
  // the ambient soundscapes above. Backgrounds are gradients; swap in
  // `/themes/images/<id>.webp` if illustrated art is added later.
  {
    id: 'lofi-lounge',
    name: 'Lo-Fi Lounge',
    mood: 'Chill beats for focus',
    thumbnailGradient:
      'linear-gradient(160deg, #312e81 0%, #6d28d9 50%, #db2777 100%)',
    background: {
      type: 'gradient',
      value:
        'radial-gradient(120% 120% at 50% 10%, #4c1d95 0%, #2e1065 55%, #0b0b1a 100%)',
    },
    // CC0 chill loop.
    audio: { kind: 'file', src: '/themes/audio/music_lofi.mp3' },
    defaultVolume: 0.15,
  },
  {
    id: 'neo-piano',
    name: 'Neo-Classical Piano',
    mood: 'Gentle solo piano',
    thumbnailGradient:
      'linear-gradient(160deg, #0f172a 0%, #1e3a8a 50%, #e0e7ff 100%)',
    background: {
      type: 'gradient',
      value:
        'linear-gradient(180deg, #0f172a 0%, #1e3a8a 55%, #c7d2fe 100%)',
    },
    // CC0 piano loop.
    audio: { kind: 'file', src: '/themes/audio/music_piano.wav' },
    defaultVolume: 0.16,
  },
  {
    id: 'ambient-drift',
    name: 'Ambient Drift',
    mood: 'Weightless pad',
    thumbnailGradient:
      'linear-gradient(160deg, #042f2e 0%, #0d9488 50%, #a5f3fc 100%)',
    background: {
      type: 'gradient',
      value:
        'radial-gradient(120% 120% at 30% 20%, #042f2e 0%, #0d9488 55%, #083344 100%)',
    },
    // CC0 seamless pad loop.
    audio: { kind: 'file', src: '/themes/audio/music_ambient_drift.ogg' },
    defaultVolume: 0.14,
  },
  {
    id: 'deep-focus',
    name: 'Deep Focus',
    mood: 'Warm sustained pad',
    thumbnailGradient:
      'linear-gradient(160deg, #451a03 0%, #b45309 50%, #fde68a 100%)',
    background: {
      type: 'gradient',
      value:
        'radial-gradient(120% 120% at 70% 20%, #451a03 0%, #92400e 55%, #1c1206 100%)',
    },
    // CC0 seamless pad loop.
    audio: { kind: 'file', src: '/themes/audio/music_deep_focus.ogg' },
    defaultVolume: 0.14,
  },
  {
    id: 'midnight-drift',
    name: 'Midnight Drift',
    mood: 'Moody ambient drone',
    thumbnailGradient:
      'linear-gradient(160deg, #0b0b1a 0%, #2e1065 50%, #4c1d95 100%)',
    background: {
      type: 'gradient',
      value:
        'radial-gradient(120% 120% at 50% 0%, #1e1b4b 0%, #2e1065 55%, #0b0b1a 100%)',
    },
    // CC0 seamless drone loop (moodier — good for night sessions).
    audio: { kind: 'file', src: '/themes/audio/music_midnight.ogg' },
    defaultVolume: 0.13,
  },
];

export const getScene = (id: string): Scene | null =>
  id === NONE_SCENE_ID ? null : SCENES.find((s) => s.id === id) ?? null;
