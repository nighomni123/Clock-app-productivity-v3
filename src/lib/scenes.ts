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
 *
 * Backgrounds are intentionally VIBRANT and happy — bright, saturated
 * multi-stop gradients that read as cheerful, energising study vibes.
 */
export const SCENES: Scene[] = [
  {
    id: 'rainy-window',
    name: 'Sunny Window',
    mood: 'Bright, cheerful morning light',
    thumbnailGradient:
      'linear-gradient(160deg, #38bdf8 0%, #0ea5e9 100%)',
    background: {
      type: 'gradient',
      value:
        'radial-gradient(120% 120% at 50% 0%, #38bdf8 0%, #0ea5e9 55%, #fde68a 100%)',
    },
    audio: { kind: 'file', src: '/themes/audio/rain_window.wav' },
    defaultVolume: 0.18,
  },
  {
    id: 'quiet-meadow',
    name: 'Sunny Meadow',
    mood: 'Open, airy, carefree calm',
    thumbnailGradient:
      'linear-gradient(160deg, #34d399 0%, #6ee7b7 100%)',
    background: {
      type: 'gradient',
      value:
        'linear-gradient(180deg, #34d399 0%, #10b981 50%, #fef08a 100%)',
    },
    // CC-BY 3.0 — see ATTRIBUTIONS.md.
    audio: { kind: 'file', src: '/themes/audio/meadow_wind.ogg' },
    defaultVolume: 0.15,
  },
  {
    id: 'forest-grove',
    name: 'Lush Forest',
    mood: 'Fresh, green, alive',
    thumbnailGradient:
      'linear-gradient(160deg, #22c55e 0%, #16a34a 100%)',
    background: {
      type: 'gradient',
      value:
        'radial-gradient(120% 120% at 30% 20%, #22c55e 0%, #16a34a 50%, #065f46 100%)',
    },
    // CC0 seamless loop.
    audio: { kind: 'file', src: '/themes/audio/forest_ambience.mp3' },
    defaultVolume: 0.16,
  },
  {
    id: 'cozy-library',
    name: 'Warm Sunset',
    mood: 'Golden-hour glow',
    thumbnailGradient:
      'linear-gradient(160deg, #fb923c 0%, #f97316 100%)',
    background: {
      type: 'gradient',
      value:
        'radial-gradient(120% 120% at 70% 20%, #fb923c 0%, #f97316 55%, #f43f5e 100%)',
    },
    // CC-BY 4.0 — see ATTRIBUTIONS.md.
    audio: { kind: 'file', src: '/themes/audio/library_fireplace.ogg' },
    defaultVolume: 0.14,
  },
  {
    id: 'snowfall-dusk',
    name: 'Cotton Candy',
    mood: 'Soft pastel daydream',
    thumbnailGradient:
      'linear-gradient(160deg, #818cf8 0%, #c084fc 100%)',
    background: {
      type: 'gradient',
      value:
        'linear-gradient(180deg, #818cf8 0%, #c084fc 60%, #f9a8d4 100%)',
    },
    // CC0 gentle wind.
    audio: { kind: 'file', src: '/themes/audio/snowfall_wind.wav' },
    defaultVolume: 0.13,
  },
  {
    id: 'seaside-cliff',
    name: 'Tropical Beach',
    mood: 'Salty, sunny, bright',
    thumbnailGradient:
      'linear-gradient(160deg, #06b6d4 0%, #34d399 100%)',
    background: {
      type: 'gradient',
      value:
        'linear-gradient(180deg, #06b6d4 0%, #0891b2 55%, #34d399 100%)',
    },
    // CC-BY 3.0 — see ATTRIBUTIONS.md.
    audio: { kind: 'file', src: '/themes/audio/seaside_waves.ogg' },
    defaultVolume: 0.17,
  },

  // --- Royalty-free music scenes (all CC0 unless noted) --------------------
  // These give the user selectable, endlessly-looping focus music on top of
  // the ambient soundscapes above. Backgrounds are vibrant gradients.
  {
    id: 'lofi-lounge',
    name: 'Lo-Fi Lounge',
    mood: 'Chill but colourful',
    thumbnailGradient:
      'linear-gradient(160deg, #ec4899 0%, #f59e0b 100%)',
    background: {
      type: 'gradient',
      value:
        'radial-gradient(120% 120% at 50% 10%, #ec4899 0%, #f59e0b 55%, #f43f5e 100%)',
    },
    // CC0 chill loop.
    audio: { kind: 'file', src: '/themes/audio/music_lofi.mp3' },
    defaultVolume: 0.15,
  },
  {
    id: 'neo-piano',
    name: 'Neo-Classical Piano',
    mood: 'Bright solo piano',
    thumbnailGradient:
      'linear-gradient(160deg, #3b82f6 0%, #60a5fa 100%)',
    background: {
      type: 'gradient',
      value:
        'linear-gradient(180deg, #3b82f6 0%, #60a5fa 55%, #fbbf24 100%)',
    },
    // CC0 piano loop.
    audio: { kind: 'file', src: '/themes/audio/music_piano.wav' },
    defaultVolume: 0.16,
  },
  {
    id: 'ambient-drift',
    name: 'Ambient Drift',
    mood: 'Floaty pastel pad',
    thumbnailGradient:
      'linear-gradient(160deg, #22c55e 0%, #14b8a6 100%)',
    background: {
      type: 'gradient',
      value:
        'radial-gradient(120% 120% at 30% 20%, #22c55e 0%, #14b8a6 55%, #3b82f6 100%)',
    },
    // CC0 seamless pad loop.
    audio: { kind: 'file', src: '/themes/audio/music_ambient_drift.ogg' },
    defaultVolume: 0.14,
  },
  {
    id: 'deep-focus',
    name: 'Deep Focus',
    mood: 'Warm golden energy',
    thumbnailGradient:
      'linear-gradient(160deg, #f59e0b 0%, #f97316 100%)',
    background: {
      type: 'gradient',
      value:
        'radial-gradient(120% 120% at 70% 20%, #f59e0b 0%, #f97316 55%, #ea580c 100%)',
    },
    // CC0 seamless pad loop.
    audio: { kind: 'file', src: '/themes/audio/music_deep_focus.ogg' },
    defaultVolume: 0.14,
  },
  {
    id: 'midnight-drift',
    name: 'Midnight Drift',
    mood: 'Dreamy neon haze',
    thumbnailGradient:
      'linear-gradient(160deg, #8b5cf6 0%, #d946ef 100%)',
    background: {
      type: 'gradient',
      value:
        'radial-gradient(120% 120% at 50% 0%, #8b5cf6 0%, #d946ef 55%, #06b6d4 100%)',
    },
    // CC0 seamless drone loop (moodier — good for night sessions).
    audio: { kind: 'file', src: '/themes/audio/music_midnight.ogg' },
    defaultVolume: 0.13,
  },
];

export const getScene = (id: string): Scene | null =>
  id === NONE_SCENE_ID ? null : SCENES.find((s) => s.id === id) ?? null;
