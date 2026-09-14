/**
 * Thumbnail generation for the focus backdrop picker.
 *
 * Each sketch option is rendered **once** into a detached p5 host at a small
 * fixed size and captured as a PNG data URL, then cached in `localStorage`.
 * The picker therefore never mounts live p5 instances inside its grid (a dozen
 * concurrent sketches would be both slow and visually noisy), and reopening the
 * picker is free.
 *
 * Cached entries are keyed by `THUMB_CACHE_KEY`, which encodes the cache
 * version; the entry also stores the exact option-id set it was built from, so
 * adding or changing a backdrop invalidates it automatically.
 */
import type P5 from 'p5';
import {
  FOCUS_BACKGROUND_OPTIONS,
  THUMB_CACHE_KEY,
  THUMB_SIZE,
  type FocusBackgroundOption,
} from './backgroundConfig';
import { loadP5 } from './p5Loader';

export type ThumbnailMap = Record<string, string>;

interface ThumbnailCache {
  ids: string[];
  thumbs: ThumbnailMap;
}

const optionIds = (): string[] => FOCUS_BACKGROUND_OPTIONS.map((o) => o.id);

const readCache = (): ThumbnailMap | null => {
  try {
    const raw = localStorage.getItem(THUMB_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ThumbnailCache;
    if (!parsed?.thumbs) return null;
    if (parsed.ids?.join(',') !== optionIds().join(',')) return null;
    return parsed.thumbs;
  } catch {
    return null;
  }
};

const writeCache = (thumbs: ThumbnailMap): void => {
  try {
    const payload: ThumbnailCache = { ids: optionIds(), thumbs };
    localStorage.setItem(THUMB_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Private mode / quota exceeded — thumbnails simply regenerate later.
  }
};

/** Resolve once p5 has created a canvas for this host (bounded retries). */
const waitForCanvas = (host: HTMLElement): Promise<HTMLCanvasElement | null> =>
  new Promise((resolve) => {
    let frames = 0;
    const tick = () => {
      const canvas = host.querySelector('canvas');
      if (canvas && canvas.width > 0) {
        resolve(canvas);
        return;
      }
      if (frames++ > 20) {
        resolve(null);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

/** Render a single option offscreen to a PNG data URL (or its own URL if static). */
const renderThumb = async (option: FocusBackgroundOption): Promise<string | null> => {
  if (option.kind === 'image' && option.image) return option.image;
  if (option.kind !== 'sketch' || !option.sketch) return null;

  const P5Constructor = await loadP5();
  const host = document.createElement('div');
  // Never attached to the document, so nothing can flash on screen; the sketch
  // is handed a fixed `measure()` instead of reading a live layout box.
  host.style.width = `${THUMB_SIZE.w}px`;
  host.style.height = `${THUMB_SIZE.h}px`;

  let inst: P5 | null = null;
  try {
    const sketch = option.sketch;
    inst = new P5Constructor((p) => sketch(p, () => THUMB_SIZE), host);
    const canvas = await waitForCanvas(host);
    if (!canvas) return null;
    // One extra frame so a `noLoop()` scene that painted during setup is done.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn(`Could not render thumbnail for "${option.id}"`, err);
    return null;
  } finally {
    inst?.remove();
    host.remove();
  }
};

let inflight: Promise<ThumbnailMap> | null = null;

/**
 * Resolve the thumbnail map for every registered backdrop, using the cache when
 * it is still valid. Called lazily by the picker — never on app load.
 */
export const getFocusThumbnails = (): Promise<ThumbnailMap> => {
  const cached = readCache();
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;

  const run = (async (): Promise<ThumbnailMap> => {
    const thumbs: ThumbnailMap = {};
    for (const option of FOCUS_BACKGROUND_OPTIONS) {
      // Sequential on purpose: one offscreen sketch at a time keeps the main
      // thread free while the user is looking at the picker.
      const dataUrl = await renderThumb(option);
      if (dataUrl) thumbs[option.id] = dataUrl;
    }
    writeCache(thumbs);
    return thumbs;
  })().catch((err) => {
    console.warn('Focus backdrop thumbnails unavailable.', err);
    return {} as ThumbnailMap;
  });

  inflight = run.finally(() => {
    inflight = null;
  });
  return inflight;
};
