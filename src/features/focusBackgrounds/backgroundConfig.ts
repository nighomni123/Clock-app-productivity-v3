/**
 * Focus-mode background registry.
 *
 * The single shared surface for the `focusBackgrounds` feature: every option
 * pairs a visual (a lazily-loaded p5.js sketch *or* a static image) with a
 * same-origin ambient audio loop. Sketch logic (`scenes/*`), audio logic
 * (`AudioManager.ts`) and React UI (`BackgroundCanvas.tsx`,
 * `BackgroundPicker.tsx`) talk to each other only through the types and data
 * declared here — nothing in this folder imports React state, and no scene
 * file imports audio or UI code.
 *
 * p5 is imported as a *type only* below so this module never pulls the library
 * into the eager bundle graph; the actual `import('p5')` happens on demand in
 * `BackgroundCanvas.tsx` / `thumbnails.ts`.
 */
import type P5 from 'p5';
import { createMinimalFlowerScene } from './scenes/minimalFlowerScene';

/** Canvas size in CSS pixels, measured from the mounting host. */
export interface CanvasSize {
  w: number;
  h: number;
}

/**
 * An instance-mode p5 sketch. `measure()` returns the size the canvas should
 * occupy (the host element's box when mounted live, a fixed thumbnail size when
 * rendered offscreen). Implementations must register `setup`/`draw`/
 * `windowResized` on the instance and must never touch global mode.
 */
export type FocusSketch = (p: P5, measure: () => CanvasSize) => void;

export interface FocusBackgroundOption {
  /** Stable id persisted in `UserSettings.focusBackground.id`. */
  id: string;
  label: string;
  /** Short mood line shown under the label in the picker. */
  mood: string;
  kind: 'sketch' | 'image';
  /** Required when `kind === 'sketch'`. */
  sketch?: FocusSketch;
  /** Required when `kind === 'image'`; same-origin path (cached offline by the SW). */
  image?: string;
  /** Seed for generative variants of the same sketch function. */
  seed?: number;
  /** Ambient loop paired with this backdrop. Omit for silence. */
  audio?: { src: string; volume: number };
  /** CSS gradient shown while the thumbnail renders (or if p5 fails to load). */
  swatch: string;
  /** Tailwind classes for the legibility scrim drawn above the artwork. */
  scrim?: string;
  /**
   * Whether the sketch animates. `false` (the default) means a single static
   * frame; animated variants must fall back to the first frame when the user
   * prefers reduced motion.
   */
  animated?: boolean;
}

/** Sentinel id meaning "no backdrop, plain dark app". */
export const NONE_BACKGROUND_ID = 'none';

/** Shared scrim for the light paper-toned scenes: heavy enough that the white
 *  timer digits keep AA contrast on top of a near-white artwork. */
/**
 * Scrim over the light "paper" scenes. Warm near-black (stone-950) rather than
 * neutral black so the paper keeps its cream cast instead of going grey, and
 * graduated so the artwork survives at the top and bottom of the frame while the
 * clock — which sits mid-frame — keeps a solid contrast bed.
 */
const PAPER_SCRIM =
  'bg-gradient-to-b from-stone-950/45 via-stone-950/62 to-stone-950/82';

/**
 * Selectable backdrops. The first three all use the same
 * `createMinimalFlowerScene` generator with different seeds/palettes, which is
 * what keeps this catalog cheap to extend: add a palette, get an artwork.
 */
export const FOCUS_BACKGROUND_OPTIONS: FocusBackgroundOption[] = [
  {
    id: 'minimal-flowers',
    label: 'Minimal Flowers',
    mood: 'Noise-driven stems on warm paper',
    kind: 'sketch',
    sketch: createMinimalFlowerScene({ seed: 2719 }),
    seed: 2719,
    // CC0 "Heavenly Loop" — public/themes/audio/README.md
    audio: { src: '/themes/audio/music_ambient_drift.ogg', volume: 0.14 },
    swatch: 'linear-gradient(160deg, #efe7d9 0%, #cbb79b 100%)',
    scrim: PAPER_SCRIM,
    animated: false,
  },
  {
    id: 'wildflower-stems',
    label: 'Wildflower Stems',
    mood: 'Tall sage-and-ochre meadow lines',
    kind: 'sketch',
    sketch: createMinimalFlowerScene({ seed: 50219, palette: 'sage' }),
    seed: 50219,
    // CC0 "Forest Ambience" — public/themes/audio/README.md
    audio: { src: '/themes/audio/forest_ambience.mp3', volume: 0.12 },
    swatch: 'linear-gradient(160deg, #e9eee2 0%, #a9bb96 100%)',
    scrim: PAPER_SCRIM,
    animated: false,
  },
  {
    id: 'nocturne-bloom',
    label: 'Nocturne Bloom',
    mood: 'Pale ink botanicals on dark paper',
    kind: 'sketch',
    sketch: createMinimalFlowerScene({ seed: 8821, palette: 'nocturne' }),
    seed: 8821,
    // CC0 "Project Utopia" seamless drone — public/themes/audio/README.md
    audio: { src: '/themes/audio/music_midnight.ogg', volume: 0.11 },
    swatch: 'linear-gradient(160deg, #1c1f27 0%, #3b4252 100%)',
    scrim: 'bg-black/25',
    animated: false,
  },
];

/** Resolve an id to an option; `null` for `none`/unknown ids. */
export const getFocusBackground = (id: string): FocusBackgroundOption | null => {
  if (!id || id === NONE_BACKGROUND_ID) return null;
  return FOCUS_BACKGROUND_OPTIONS.find((option) => option.id === id) ?? null;
};

/** Picker/cache identity for thumbnails; bump when scenes or options change. */
/**
 * Bump whenever a scene's look changes so stale PNGs are re-rendered once
 * (v4: seed heads are stippled discs now that the sun-like spokes are gone).
 */
export const THUMB_CACHE_KEY = 'focus_bg_thumbs_v4';

/** Offscreen thumbnail render size (CSS px). */
export const THUMB_SIZE: CanvasSize = { w: 240, h: 150 };
