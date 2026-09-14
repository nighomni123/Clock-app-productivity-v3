/**
 * Single lazy entry point for the p5 library.
 *
 * p5 is ~1 MB minified, so it must never enter the app's initial graph: every
 * consumer (`BackgroundCanvas`, `thumbnails`) goes through `loadP5()`, which is
 * the only place in the app that calls `import('p5')`. Vite/Rollup therefore emit
 * it as its own chunk, fetched the first time a focus backdrop or the background
 * picker is actually opened, and the service worker's stale-while-revalidate
 * handler caches that chunk for offline use afterwards.
 *
 * The `import type` above is erased at build time, so this module itself stays
 * dependency-free.
 */
import type P5 from 'p5';

/** The p5 constructor (instance mode: `new P5(sketch, hostElement)`). */
export type P5Constructor = typeof P5;

let pending: Promise<P5Constructor> | null = null;

/** Resolve the p5 class, loading it on demand. Rejections are not cached. */
export const loadP5 = (): Promise<P5Constructor> => {
  if (!pending) {
    pending = import('p5')
      .then((mod) => {
        // p5 1.x ships a UMD build, so depending on the bundler's interop the
        // class can arrive either as `default` or as the namespace itself.
        const withDefault = mod as unknown as { default?: P5Constructor };
        const ctor = withDefault.default ?? (mod as unknown as P5Constructor);
        if (typeof ctor !== 'function') throw new Error('p5 module has no constructor');
        return ctor;
      })
      .catch((err) => {
        pending = null;
        throw err;
      });
  }
  return pending;
};
