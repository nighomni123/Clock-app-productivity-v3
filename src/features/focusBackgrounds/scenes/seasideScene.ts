/**
 * `seasideScene` — a procedural, static seaside horizon for p5.js.
 *
 * A calm late-afternoon ocean view: low horizon (y ≈ 0.60), soft rose-grey sky
 * fading to pale sand at the horizon, a low off-centre sun with faint halo, and
 * a glitter path descending from the sun toward the viewer. A few gull ticks
 * float high in the sky. The entire composition is built once in `setup` from
 * normalised 0..1 coordinates and cached; `draw` is a pure, idempotent render
 * of that cache so resizes and tab-visibility changes redraw the same painting.
 *
 * The sketch calls `noLoop()` at the end of `setup`: no randomness or noise
 * occurs at draw time, no input is read, nothing is attached to `window`, and
 * no assets are loaded — the mounting component owns the instance lifecycle.
 */
import type P5 from 'p5';
import type { CanvasSize, FocusSketch } from '../backgroundConfig';

type RGB = [number, number, number];

/** Cached elements in normalised 0..1 coordinates. */
interface SeasideComposition {
  sunX: number;
  sunY: number;
  sunRadius: number;
  haloRadius: number;
  horizonY: number;
  /** Glitter path: array of (x, y, length, brightness) tuples. */
  glitter: Array<{ x: number; y: number; len: number; bright: number }>;
  /** Gulls: array of (x, y, length, angle) tuples. */
  gulls: Array<{ x: number; y: number; len: number; angle: number }>;
  /** Foam dashes near the bottom: array of (x, y, length) tuples. */
  foam: Array<{ x: number; y: number; len: number }>;
}

export interface SeasideSceneOptions {
  /** Fixed seed → stable composition across renders, resizes and remounts. */
  seed: number;
}

/**
 * Build the entire seaside composition once, in normalised 0..1 space.
 * All positions are deterministic from the seed.
 */
const buildComposition = (p: P5, seed: number): SeasideComposition => {
  p.randomSeed(seed);
  p.noiseSeed(seed);

  // Horizon line at y ≈ 0.60
  const horizonY = 0.58 + p.random(-0.02, 0.02);

  // Sun: off-centre in x ∈ [0.16, 0.30], just above horizon
  const sunX = 0.16 + p.random(0.14);
  const sunY = horizonY - 0.04 - p.random(0.02);
  const sunRadius = 0.035 + p.random(0.015);
  const haloRadius = sunRadius * (1.8 + p.random(0.4));

  // Glitter path: short horizontal dashes descending from sun toward viewer
  // Column centred under the sun (x ≈ sunX), widening as it comes forward
  const glitterCount = Math.floor(p.random(18, 28));
  const glitter: Array<{ x: number; y: number; len: number; bright: number }> = [];
  for (let i = 0; i < glitterCount; i++) {
    const t = i / (glitterCount - 1); // 0 at sun, 1 at bottom of path
    const spread = 0.04 + t * 0.08; // widens as it descends
    const x = sunX + (p.random() - 0.5) * spread * (1 - t * 0.3);
    const y = sunY + t * (horizonY - sunY) * (0.8 + p.random(0.4));
    const len = p.random(0.008, 0.022) * (0.7 + t * 0.5); // longer toward bottom
    const bright = 0.4 + t * 0.6 + p.random(0.15); // brighter toward bottom
    glitter.push({ x, y, len, bright });
  }

  // Gulls: 2-4 thin ink strokes high in the sky (x < 0.55, y < 0.30)
  const gullCount = Math.floor(p.random(2, 5));
  const gulls: Array<{ x: number; y: number; len: number; angle: number }> = [];
  for (let i = 0; i < gullCount; i++) {
    const x = p.random(0.05, 0.55);
    const y = p.random(0.08, 0.30);
    const len = p.random(0.015, 0.035);
    const angle = p.random(-0.3, 0.3); // slight tilt
    gulls.push({ x, y, len, angle });
  }

  // Foam dashes near the bottom edge
  const foamCount = Math.floor(p.random(3, 6));
  const foam: Array<{ x: number; y: number; len: number }> = [];
  for (let i = 0; i < foamCount; i++) {
    const x = p.random(0.05, 0.95);
    const y = 0.92 + p.random(0.05);
    const len = p.random(0.02, 0.05);
    foam.push({ x, y, len });
  }

  return {
    sunX,
    sunY,
    sunRadius,
    haloRadius,
    horizonY,
    glitter,
    gulls,
    foam,
  };
};

/** Desaturated warm-grey/slate-pink palette. */
const SKY_TOP: RGB = [188, 176, 172];
const SKY_MID: RGB = [168, 156, 152];
const SKY_HORIZON: RGB = [212, 200, 188];
const SUN_CORE: RGB = [224, 196, 176];
const SUN_HALO: RGB = [240, 220, 200];
const SEA_BASE: RGB = [78, 86, 96];
const SEA_MID: RGB = [104, 112, 120];
/** Water right under the horizon catches the sky, then deepens toward the viewer. */
const SEA_NEAR: RGB = [128, 134, 140];

/**
 * Fill normalised y0..y1 with a linear colour ramp in `steps` bands.
 * Assumes `rectMode(CORNERS)`.
 */
const ramp = (
  p: P5,
  y0: number,
  y1: number,
  from: RGB,
  to: RGB,
  steps: number,
  w: number,
  h: number
): void => {
  for (let i = 0; i < steps; i++) {
    const a = y0 + (y1 - y0) * (i / steps);
    const b = y0 + (y1 - y0) * ((i + 1) / steps);
    const t = i / (steps - 1);
    p.fill(
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
      from[2] + (to[2] - from[2]) * t
    );
    p.rect(0, a * h, w, b * h + 0.6);
  }
};
const GLITTER_BASE: RGB = [232, 220, 208];
const FOAM: RGB = [220, 212, 200];
const GULL: RGB = [72, 76, 80];

/**
 * Create a `FocusSketch` for the seaside scene.
 *
 * Identical seed yields identical pixels. The composition is built once in
 * `setup` and cached; `draw` is a pure render of that cache.
 */
export const createSeasideScene =
  ({ seed }: SeasideSceneOptions): FocusSketch =>
  (p: P5, measure: () => CanvasSize) => {
    let composition: SeasideComposition | null = null;

    p.setup = () => {
      const { w, h } = measure();
      p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
      p.createCanvas(w, h);
      p.randomSeed(seed);
      p.noiseSeed(seed);
      p.noiseDetail(3, 0.5);
      p.strokeCap(p.ROUND);
      p.strokeJoin(p.ROUND);
      p.ellipseMode(p.CENTER);
      p.rectMode(p.CORNERS);

      composition = buildComposition(p, seed);
      p.noLoop();
    };

    p.draw = () => {
      const w = p.width;
      const h = p.height;
      const u = Math.min(w, h);

      if (!composition) return;

      const { sunX, sunY, sunRadius, haloRadius, horizonY, glitter, gulls, foam } =
        composition;

      // Sky and sea as continuous ramps. `rectMode(CORNERS)` means rect(x1, y1,
      // x2, y2): three discrete bands with unpainted gaps between them, and a sea
      // rect whose bottom edge sat *above* its top edge, which painted nothing and
      // left the whole lower third black. Ramp every pixel from the top edge down.
      p.noStroke();
      ramp(p, 0, horizonY, SKY_TOP, SKY_HORIZON, 30, w, h);
      ramp(p, horizonY, 1, SEA_NEAR, SEA_BASE, 24, w, h);

      // Horizon line: very subtle
      p.stroke(SEA_BASE[0], SEA_BASE[1], SEA_BASE[2], 40);
      p.strokeWeight(Math.max(0.5, u * 0.001));
      p.line(0, h * horizonY, w, h * horizonY);

      // Sun disc with faint halo (off-centre, low)
      p.noStroke();
      // Halo
      p.fill(SUN_HALO[0], SUN_HALO[1], SUN_HALO[2], 80);
      p.circle(sunX * w, sunY * h, haloRadius * u * 2);
      // Core
      p.fill(SUN_CORE[0], SUN_CORE[1], SUN_CORE[2]);
      p.circle(sunX * w, sunY * h, sunRadius * u * 2);

      // Glitter path: short horizontal dashes descending from sun
      p.strokeWeight(Math.max(0.8, u * 0.0025));
      for (const g of glitter) {
        const bright = g.bright * 255;
        const alpha = 120 + bright * 0.8;
        p.stroke(
          GLITTER_BASE[0],
          GLITTER_BASE[1],
          GLITTER_BASE[2],
          Math.min(255, alpha)
        );
        const x = g.x * w;
        const y = g.y * h;
        const len = g.len * u;
        p.line(x - len / 2, y, x + len / 2, y);
      }

      // Gulls: thin ink strokes
      p.stroke(GULL[0], GULL[1], GULL[2], 180);
      p.strokeWeight(Math.max(0.6, u * 0.0018));
      for (const g of gulls) {
        p.push();
        p.translate(g.x * w, g.y * h);
        p.rotate(g.angle);
        p.line(-g.len * u * 0.5, 0, g.len * u * 0.5, 0);
        // Slight wing detail
        p.line(-g.len * u * 0.35, -g.len * u * 0.1, -g.len * u * 0.5, 0);
        p.line(g.len * u * 0.35, -g.len * u * 0.1, g.len * u * 0.5, 0);
        p.pop();
      }

      // Foam dashes near bottom
      p.stroke(FOAM[0], FOAM[1], FOAM[2], 140);
      p.strokeWeight(Math.max(0.5, u * 0.0015));
      for (const f of foam) {
        p.line(f.x * w - f.len * u * 0.5, f.y * h, f.x * w + f.len * u * 0.5, f.y * h);
      }

      // Very subtle vignette to keep edges calm
      const ctx = p.drawingContext as CanvasRenderingContext2D | undefined;
      if (ctx && typeof ctx.createRadialGradient === 'function') {
        const gradient = ctx.createRadialGradient(
          w / 2,
          h / 2,
          u * 0.15,
          w / 2,
          h / 2,
          Math.max(w, h) * 0.85
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.08)');
        ctx.fillStyle = gradient;
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
