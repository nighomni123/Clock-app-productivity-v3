/**
 * `libraryScene` — a procedural, static "Fireside Library" study interior for p5.js.
 *
 * A warm, dark brown wall at night with a soft lamp glow from the upper-left,
 * three bookshelves carrying seeded book spines, a cold window on the right,
 * a subtle hearth glow at the bottom-left, and dust motes in the lamp beam.
 * All geometry is built once in `setup` using normalised 0..1 coordinates and
 * cached; `draw` is a pure, idempotent render. The central band (x 0.30–0.70,
 * y 0.32–0.64) is kept deliberately dark so white countdown digits remain
 * legible without an overlay.
 */
import type P5 from 'p5';
import type { CanvasSize, FocusSketch } from '../backgroundConfig';

type RGB = [number, number, number];

interface BookSpine {
  x: number;
  width: number;
  height: number;
  color: RGB;
  tilt: number;
}

interface Shelf {
  y: number;
  height: number;
  spines: BookSpine[];
}

export interface LibrarySceneOptions {
  seed: number;
}

const buildComposition = (p: P5, seed: number): {
  shelves: Shelf[];
  win: [number, number, number, number];
  motes: Array<{ x: number; y: number; s: number; a: number }>;
  embers: Array<[number, number]>;
} => {
  p.randomSeed(seed);
  p.noiseSeed(seed);

  const spineColours: RGB[] = [
    [100, 110, 80], [120, 60, 50], [80, 95, 110], [140, 120, 85], [50, 80, 60],
  ];
  const shelves: Shelf[] = [];
  const shelfYs = [0.30, 0.58, 0.86];

  for (let si = 0; si < shelfYs.length; si++) {
    const spines: BookSpine[] = [];
    const y = shelfYs[si];
    let cursor = 0.04;
    const bookCount = Math.floor(p.random(12, 20));

    for (let bi = 0; bi < bookCount; bi++) {
      if (p.random() < 0.12 && bi > 0 && bi < bookCount - 1) {
        cursor += p.random(0.01, 0.03);
        continue;
      }
      const width = p.random(0.008, 0.024);
      const height = p.random(0.55, 0.85);
      const colour = spineColours[Math.floor(p.random(spineColours.length))];
      const x = cursor + width / 2;
      const darkness = Math.min(1, (x - 0.2) / 0.6);
      const darkened: RGB = [
        Math.max(20, Math.round(colour[0] * (1 - darkness * 0.6))),
        Math.max(20, Math.round(colour[1] * (1 - darkness * 0.6))),
        Math.max(20, Math.round(colour[2] * (1 - darkness * 0.6))),
      ];
      spines.push({ x: cursor, width, height, color: darkened, tilt: (p.random() - 0.5) * 0.04 });
      cursor += width;
      if (cursor > 0.95) break;
    }
    shelves.push({ y, height: 0.06, spines });
  }

  const motes: Array<{ x: number; y: number; s: number; a: number }> = [];
  for (let i = 0; i < 25; i++) {
    motes.push({ x: p.random(0.05, 0.45), y: p.random(0.05, 0.45), s: p.random(0.001, 0.0035), a: p.random(0.3, 0.7) });
  }

  const embers: Array<[number, number]> = [];
  for (let i = 0; i < 4; i++) {
    embers.push([p.random(0.04, 0.20), p.random(0.88, 0.96)]);
  }

  return { shelves, win: [0.72, 0.06, 0.22, 0.28], motes, embers };
};

export const createLibraryScene = (options: LibrarySceneOptions): FocusSketch =>
  (p: P5, measure: () => CanvasSize) => {
    let comp: ReturnType<typeof buildComposition> | null = null;

    p.setup = () => {
      const { w, h } = measure();
      p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
      p.createCanvas(w, h);
      p.randomSeed(options.seed);
      p.noiseSeed(options.seed);
      p.rectMode(p.CORNER);
      p.ellipseMode(p.CENTER);
      comp = buildComposition(p, options.seed);
      p.noLoop();
    };

    p.draw = () => {
      const w = p.width;
      const h = p.height;
      const u = Math.min(w, h);
      if (!comp) return;
      const { shelves, win, motes, embers } = comp;
      const [winX, winY, winW, winH] = win;
      const ctx = p.drawingContext as CanvasRenderingContext2D | undefined;

      // Base wall: very dark warm brown
      p.background(42, 34, 28);

      // Lamp radial glow from upper-left (x≈0.22, y≈0.18)
      if (ctx?.createRadialGradient) {
        const g = ctx.createRadialGradient(w * 0.22, h * 0.18, 0, w * 0.22, h * 0.18, Math.max(w, h) * 0.65);
        g.addColorStop(0, 'rgba(240,200,160,0.18)');
        g.addColorStop(0.45, 'rgba(240,200,160,0.08)');
        g.addColorStop(1, 'rgba(240,200,160,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // Bookshelves and spines
      for (const shelf of shelves) {
        const shelfTop = h * shelf.y;
        const shelfH = h * shelf.height;
        p.noStroke();
        p.fill(65, 50, 40);
        p.rect(0, shelfTop, w, shelfH);
        for (const spine of shelf.spines) {
          const sl = w * spine.x;
          const sw = w * spine.width;
          const sh = shelfH * spine.height;
          p.push();
          p.translate(sl + sw / 2, shelfTop + shelfH);
          p.rotate(spine.tilt);
          p.fill(spine.color[0], spine.color[1], spine.color[2]);
          p.rect(-sw / 2, -sh, sw, sh);
          p.pop();
        }
      }

      // Window with mullion
      const wl = w * winX;
      const wt = h * winY;
      const ww = w * winW;
      const wh = h * winH;
      p.noStroke();
      p.fill(70, 75, 85);
      p.rect(wl, wt, ww, wh);
      const mt = Math.max(1, u * 0.003);
      p.fill(55, 60, 70);
      p.rect(wl, wt + wh / 2 - mt / 2, ww, mt);
      p.rect(wl + ww / 2 - mt / 2, wt, mt, wh);

      // Moonlight wash below window
      if (ctx?.createRadialGradient) {
        const g = ctx.createRadialGradient(
          wl + ww / 2, wt + wh, 0, wl + ww / 2, wt + wh, wh * 1.2
        );
        g.addColorStop(0, 'rgba(180,200,220,0.06)');
        g.addColorStop(1, 'rgba(180,200,220,0)');
        ctx.fillStyle = g;
        ctx.fillRect(wl - ww * 0.1, wt + wh, ww * 1.2, wh * 0.8);
      }

      // Hearth glow
      if (ctx?.createRadialGradient) {
        const g = ctx.createRadialGradient(w * 0.12, h * 0.95, 0, w * 0.12, h * 0.95, w * 0.25);
        g.addColorStop(0, 'rgba(220,140,80,0.12)');
        g.addColorStop(1, 'rgba(220,140,80,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, h * 0.8, w * 0.35, h * 0.2);
      }

      // Ember dots
      p.noStroke();
      p.fill(220, 140, 80);
      for (const [ex, ey] of embers) {
        p.ellipse(w * ex, h * ey, u * 0.008, u * 0.008);
      }

      // Dust motes
      p.noStroke();
      for (const mote of motes) {
        p.fill(240, 220, 180, mote.a * 255);
        p.ellipse(w * mote.x, h * mote.y, u * mote.s, u * mote.s);
      }

      // Final vignette
      if (ctx?.createRadialGradient) {
        const g = ctx.createRadialGradient(
          w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.85
        );
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.45)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    };

    p.windowResized = () => {
      const { w, h } = measure();
      if (!w || !h) return;
      p.resizeCanvas(w, h, false);
      p.redraw();
    };
  };
