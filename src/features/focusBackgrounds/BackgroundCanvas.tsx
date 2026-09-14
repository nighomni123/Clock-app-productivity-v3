/**
 * Full-bleed focus-mode backdrop: mounts a p5.js sketch (or a static image)
 * behind the timer UI and keeps it legible with a per-option scrim.
 *
 * Responsibilities — and only these:
 *  - own the p5 *instance* lifecycle (instance mode, `new P5(sketch, host)`,
 *    always `.remove()`d), so React remains the only thing deciding when a
 *    sketch exists and nothing touches global mode or `window`;
 *  - swap backdrops by crossfading host layers (incoming fades in over the
 *    outgoing one, which is destroyed once faded) so switching never flashes;
 *  - pause the draw loop with the Page Visibility API and repaint on return;
 *  - honour `prefers-reduced-motion` (animated variants freeze on frame one).
 *
 * It renders nothing interactive: `pointer-events: none` plus `aria-hidden`.
 * Sketch definitions come from the registry; audio is handled elsewhere.
 */
import React, { useEffect, useRef, useState } from 'react';
import type P5 from 'p5';
import type { FocusBackgroundOption } from './backgroundConfig';
import { loadP5 } from './p5Loader';

/** CSS opacity crossfade for backdrop swaps (ms). */
const CROSSFADE_MS = 500;
/** Fallback scrim if an option forgets to declare one. */
const DEFAULT_SCRIM = 'bg-black/40';

interface HostLayer {
  el: HTMLDivElement;
  inst: P5 | null;
  removed: boolean;
}

/** Track the reduced-motion preference reactively (shared shape with the hook). */
export const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
};

interface BackgroundCanvasProps {
  /** `null` (or the `none` option) renders nothing at all. */
  option: FocusBackgroundOption | null;
  /** Positioning for the layer, e.g. `fixed inset-0 z-0` / `absolute inset-0 z-0`. */
  className?: string;
}

export const BackgroundCanvas: React.FC<BackgroundCanvasProps> = ({
  option,
  className = 'fixed inset-0 z-0',
}) => {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const hostsRef = useRef<HostLayer[]>([]);
  const reducedMotion = usePrefersReducedMotion();

  // One host layer per selected option. Swapping creates the incoming layer
  // first and retires the outgoing one, so two canvases can overlap briefly
  // during the crossfade but never more than that.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !option) return;

    const el = document.createElement('div');
    el.className = 'absolute inset-0';
    el.style.opacity = '0';
    el.style.transition = `opacity ${CROSSFADE_MS}ms ease-out`;
    const host: HostLayer = { el, inst: null, removed: false };
    hostsRef.current.push(host);
    layer.appendChild(el);

    const measure = () => ({
      w: el.clientWidth || window.innerWidth,
      h: el.clientHeight || window.innerHeight,
    });

    const retire = (target: HostLayer) => {
      if (target.removed) return;
      target.removed = true;
      const at = hostsRef.current.indexOf(target);
      if (at !== -1) hostsRef.current.splice(at, 1);
      target.el.style.opacity = '0';
      // Keep the canvas alive through the fade, then fully tear the instance
      // down (p5 `.remove()` drops its listeners and its draw loop).
      window.setTimeout(() => {
        target.inst?.remove();
        target.inst = null;
        target.el.remove();
      }, CROSSFADE_MS + 80);
    };

    const reveal = () => {
      if (host.removed) return;
      el.style.opacity = '1';
      hostsRef.current.filter((h) => h !== host).forEach(retire);
    };

    let cancelled = false;
    let rafA = 0;
    let rafB = 0;
    const nextFrames = (fn: () => void) => {
      rafA = requestAnimationFrame(() => {
        rafB = requestAnimationFrame(fn);
      });
    };

    if (option.kind === 'image' && option.image) {
      el.style.backgroundImage = `url("${option.image}")`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      nextFrames(reveal);
    } else if (option.kind === 'sketch' && option.sketch) {
      const sketch = option.sketch;
      loadP5()
        .then((P5Constructor) => {
          if (cancelled) return;
          host.inst = new P5Constructor((p) => sketch(p, measure), el);
          if (import.meta.env.DEV) {
            // Devtools affordance: inspect the live instance to confirm looping
            // state and that no instance survives its host layer.
            (el as HTMLDivElement & { __p5?: P5 }).__p5 = host.inst;
          }
          // Describes the canvas for assistive tech even though it is hidden.
          try {
            host.inst?.describe?.('Decorative focus-mode artwork background.');
          } catch {
            /* optional API */
          }
          // Reduced motion: animated variants stop after their first frame.
          nextFrames(() => {
            if (cancelled) return;
            reveal();
            if (reducedMotion && option.animated) host.inst?.noLoop();
          });
        })
        .catch((err) => {
          if (cancelled) return;
          console.warn('Focus backdrop failed to load p5; using flat swatch.', err);
          el.style.backgroundImage = option.swatch;
          reveal();
        });
    }

    // Repaint on layout-only size changes (p5 only listens for window resizes,
    // e.g. the focus card → fullscreen transition changes the host box instead).
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            const inst = host.inst;
            if (!inst || host.removed) return;
            const { w, h } = measure();
            if (!w || !h) return;
            if (Math.abs(inst.width - w) < 1 && Math.abs(inst.height - h) < 1) return;
            inst.windowResized?.();
          })
        : null;
    observer?.observe(el);

    // Page Visibility: stop the draw loop while hidden, repaint on return
    // (mobile browsers can blank a canvas that has been backgrounded).
    let loopingBefore = false;
    const onVisibility = () => {
      const inst = host.inst;
      if (!inst) return;
      if (document.hidden) {
        loopingBefore = inst.isLooping();
        if (loopingBefore) inst.noLoop();
        return;
      }
      if (loopingBefore && !(reducedMotion && option.animated)) inst.loop();
      inst.redraw();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (rafA) cancelAnimationFrame(rafA);
      if (rafB) cancelAnimationFrame(rafB);
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
      retire(host);
    };
  }, [option, reducedMotion]);

  // Unmount safety net: destroy anything still hanging around immediately.
  useEffect(() => {
    const hosts = hostsRef.current;
    return () => {
      hosts.forEach((host) => {
        if (host.removed) return;
        host.removed = true;
        host.inst?.remove();
        host.inst = null;
        host.el.remove();
      });
      hosts.length = 0;
    };
  }, []);

  if (!option) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none overflow-hidden ${className}`}
    >
      <div ref={layerRef} className="absolute inset-0" />
      <div className={`absolute inset-0 ${option.scrim ?? DEFAULT_SCRIM}`} />
    </div>
  );
};

export default BackgroundCanvas;
