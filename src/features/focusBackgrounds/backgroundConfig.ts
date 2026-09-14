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
import { createRainOnGlassScene } from './scenes/rainOnGlassScene';
import { createSnowfieldScene } from './scenes/snowfieldScene';
import { createRidgelineScene } from './scenes/ridgelineScene';
import { createSeasideScene } from './scenes/seasideScene';
import { createLibraryScene } from './scenes/libraryScene';

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
  /** Optional melodic track layered *under* the ambient while focus is active. */
  music?: { src: string; volume: number };
  /** CSS gradient shown while the thumbnail renders (or if p5 fails to load). */
  swatch: string;
  /** Tailwind classes for the legibility scrim drawn above the artwork. */
  scrim?: string;
  /**
   * `background-position` for the picker tile only. Tiles are ~2:1 while the
   * thumbnails are 8:5, so a cover-crop has to choose a band: scenes whose
   * subject sits high (the seaside sun) need an explicit offset.
   */
  thumbCrop?: string;
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
  'bg-gradient-to-b from-stone-950/45 via-stone-950/58 to-stone-950/78';

/** Same job for a cold (blue/white) artwork — neutral black instead of warm.
 *  Lighter than PAPER_SCRIM because its ground is mid-grey, not near-white. */
const COLD_PAPER_SCRIM =
  'bg-gradient-to-b from-zinc-950/36 via-zinc-950/52 to-zinc-950/78';

/** Bright sky near the digits: barely there — the sky is already pale, and a
 *  heavy wash over it just muddies the whole frame. */
const BRIGHT_SCRIM =
  'bg-gradient-to-b from-zinc-950/22 via-zinc-950/40 to-zinc-950/76';

/** Artwork that is already dark: a whisper of scrim, mostly for the grain. */
const DARK_SCRIM = 'bg-black/22';

/**
 * Selectable backdrops. The first three all use the same
 * `createMinimalFlowerScene` generator with different seeds/palettes, which is
 * what keeps this catalog cheap to extend: add a palette, get an artwork. The
 * rest are distinct locations, each its own scene function, plus two gently
 * animated weather panes (`animated: true`).
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
    // CC0 "Emotional Piano Loop" — layered music track.
    music: { src: '/themes/audio/music_piano.wav', volume: 0.16 },
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
    // CC0 "Ambient Relaxing Loop" — layered music track.
    music: { src: '/themes/audio/music_deep_focus.ogg', volume: 0.14 },
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
    // CC0 "Emotional Piano Loop" — layered music track.
    music: { src: '/themes/audio/music_piano.wav', volume: 0.12 },
    swatch: 'linear-gradient(160deg, #1c1f27 0%, #3b4252 100%)',
    scrim: DARK_SCRIM,
    animated: false,
  },
  {
    id: 'blush-meadow',
    label: 'Blush Meadow',
    mood: 'Soft peonies on pink-warmed paper',
    kind: 'sketch',
    sketch: createMinimalFlowerScene({ seed: 13107, palette: 'blush' }),
    seed: 13107,
    // CC0 "Calm Loop" — public/themes/audio/README.md
    audio: { src: '/themes/audio/music_lofi.mp3', volume: 0.11 },
    // CC0 "Heavenly Loop" — layered music track (soft pad under the lo-fi).
    music: { src: '/themes/audio/music_ambient_drift.ogg', volume: 0.12 },
    swatch: 'linear-gradient(160deg, #f6eaea 0%, #d7a9a4 100%)',
    scrim: PAPER_SCRIM,
    animated: false,
  },
  {
    id: 'ink-garden',
    label: 'Ink Garden',
    mood: 'Pale botanicals on graphite paper',
    kind: 'sketch',
    sketch: createMinimalFlowerScene({ seed: 6041, palette: 'ink' }),
    seed: 6041,
    // Shares CC0 "Project Utopia" with Nocturne Bloom (see README.md).
    audio: { src: '/themes/audio/music_midnight.ogg', volume: 0.11 },
    // CC0 "Emotional Piano Loop" — layered music track.
    music: { src: '/themes/audio/music_piano.wav', volume: 0.12 },
    swatch: 'linear-gradient(160deg, #262a30 0%, #4a5560 100%)',
    scrim: DARK_SCRIM,
    animated: false,
  },
  {
    id: 'terracotta-field',
    label: 'Terracotta Field',
    mood: 'Clay tones with ochre heads',
    kind: 'sketch',
    sketch: createMinimalFlowerScene({ seed: 30331, palette: 'terracotta' }),
    seed: 30331,
    // Shares CC0 "Heavenly Loop" with Minimal Flowers.
    audio: { src: '/themes/audio/music_ambient_drift.ogg', volume: 0.13 },
    // CC0 "Calm Loop" — layered music track (lo-fi under the warm pad).
    music: { src: '/themes/audio/music_lofi.mp3', volume: 0.12 },
    swatch: 'linear-gradient(160deg, #ecd5be 0%, #c4795a 100%)',
    scrim: PAPER_SCRIM,
    animated: false,
  },
  {
    id: 'rain-window',
    label: 'Rain on Glass',
    mood: 'City lights through a wet pane',
    kind: 'sketch',
    sketch: createRainOnGlassScene({ seed: 70707 }),
    seed: 70707,
    // CC0 "Rain on Window Loop" — public/themes/audio/README.md
    audio: { src: '/themes/audio/rain_window.m4a', volume: 0.14 },
    // CC0 "Calm Loop" — layered music track (lo-fi rainy mood).
    music: { src: '/themes/audio/music_lofi.mp3', volume: 0.14 },
    swatch: 'linear-gradient(160deg, #1f2530 0%, #0e1116 100%)',
    scrim: 'bg-black/28',
    // Gentle drift; frozen on frame one under prefers-reduced-motion.
    animated: true,
  },
  {
    id: 'snowfield-birch',
    label: 'Snowfield Birches',
    mood: 'Pale trunks, slow drifting snow',
    kind: 'sketch',
    sketch: createSnowfieldScene({ seed: 910111 }),
    seed: 910111,
    // CC0 "wind1" — public/themes/audio/README.md
    audio: { src: '/themes/audio/snowfall_wind.m4a', volume: 0.12 },
    // CC0 "Project Utopia" seamless drone — layered music track (cold).
    music: { src: '/themes/audio/music_midnight.ogg', volume: 0.12 },
    swatch: 'linear-gradient(160deg, #92a0b0 0%, #e4e9ee 100%)',
    scrim: COLD_PAPER_SCRIM,
    animated: true,
  },
  {
    id: 'ridgelines',
    label: 'Ridgelines',
    mood: 'Predawn mountains under thin stars',
    kind: 'sketch',
    sketch: createRidgelineScene({ seed: 4200 }),
    seed: 4200,
    // CC0 "Ambient Relaxing Loop" — public/themes/audio/README.md
    audio: { src: '/themes/audio/music_deep_focus.ogg', volume: 0.12 },
    // CC0 "Emotional Piano Loop" — layered music track (cinematic peaks).
    music: { src: '/themes/audio/music_piano.wav', volume: 0.13 },
    swatch: 'linear-gradient(160deg, #28303f 0%, #10131a 100%)',
    // The brightened ridges carry their own separation; only a whisper of scrim.
    scrim: 'bg-black/16',
    animated: false,
  },
  {
    id: 'seaside-horizon',
    label: 'Seaside Horizon',
    mood: 'Late light on a flat horizon',
    kind: 'sketch',
    sketch: createSeasideScene({ seed: 4217 }),
    seed: 4217,
    // CC BY 3.0 "Oceanwavescrushing" — credited in the picker footer
    audio: { src: '/themes/audio/seaside_waves.ogg', volume: 0.12 },
    // CC0 "Ambient Relaxing Loop" — layered music track (airy pad over waves).
    music: { src: '/themes/audio/music_deep_focus.ogg', volume: 0.13 },
    swatch: 'linear-gradient(180deg, #bcb0ac 0%, #d4c8b8 52%, #565f68 100%)',
    scrim: BRIGHT_SCRIM,
    thumbCrop: 'center 44%',
    animated: false,
  },
  {
    id: 'fireside-library',
    label: 'Fireside Library',
    mood: 'Lamp-lit shelves, cold window',
    kind: 'sketch',
    sketch: createLibraryScene({ seed: 4201 }),
    seed: 4201,
    // CC BY 4.0 "Fire of the forge" — credited in the picker footer
    audio: { src: '/themes/audio/library_fireplace.ogg', volume: 0.13 },
    // CC0 "Emotional Piano Loop" — layered music track (warm piano by the fire).
    music: { src: '/themes/audio/music_piano.wav', volume: 0.15 },
    swatch: 'linear-gradient(150deg, #2a221c 0%, #100c09 100%)',
    // Already the darkest piece in the set: any more overlay kills the shelf detail.
    scrim: 'bg-black/10',
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
 * (v6: ridgelines brightened, birch shading softened, rain hue shifted teal,
 * terracotta desaturated, scrims re-tuned).
 */
export const THUMB_CACHE_KEY = 'focus_bg_thumbs_v7';

/** Offscreen thumbnail render size (CSS px). */
export const THUMB_SIZE: CanvasSize = { w: 240, h: 150 };
