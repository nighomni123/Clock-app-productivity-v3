import type { Scene } from '../types';

/** Sentinel id used when no scene is selected. */
export const NONE_SCENE_ID = 'none';

/**
 * Placeholder scene catalog. v1 uses CSS-gradient backgrounds and a
 * runtime-synthesized ambient fallback (no binary assets required).
 *
 * To upgrade a scene to real art/audio later, drop optimized files into
 * `public/themes/` and switch the entries below:
 *   background: { type: 'image', value: '/themes/images/meadow.webp' }
 *   audio:      { kind: 'file', src: '/themes/audio/meadow.ogg' }
 * No other code changes are required.
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
    audio: { kind: 'synth', profile: 'rain' },
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
    audio: { kind: 'synth', profile: 'meadow' },
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
    audio: { kind: 'synth', profile: 'forest' },
    defaultVolume: 0.16,
  },
  {
    id: 'cozy-library',
    name: 'Cozy Library',
    mood: 'Warm, hushed study',
    thumbnailGradient:
      'linear-gradient(160deg, #78350f 0%, #92400e 50%, #451a03 100%)',
    background: {
      type: 'gradient',
      value:
        'radial-gradient(120% 120% at 70% 20%, #4c2a12 0%, #3a1f0c 55%, #1c1206 100%)',
    },
    audio: { kind: 'synth', profile: 'library' },
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
    audio: { kind: 'synth', profile: 'night' },
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
    audio: { kind: 'synth', profile: 'seaside' },
    defaultVolume: 0.17,
  },
];

export const getScene = (id: string): Scene | null =>
  id === NONE_SCENE_ID ? null : SCENES.find((s) => s.id === id) ?? null;
