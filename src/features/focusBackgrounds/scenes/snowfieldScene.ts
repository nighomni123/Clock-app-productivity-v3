/**
 * `snowfieldScene` — birches at the edge of a snowfield under an overcast sky,
 * for p5.js.
 *
 * The cold counterpart to the paper florals: pale bark trunks planted only in
 * the outer thirds of the frame, a line of distant firs sitting *below* the
 * countdown, and a slow drift of flakes. Like `rainOnGlassScene` the motion is
 * a pure function of `p.frameCount`, so `draw()` stays free of randomness and
 * the reduced-motion freeze on frame one is already a finished picture.
 *
 * Flakes fall at a third of a screen height per minute-ish. This is a focus
 * timer, not a snow globe.
 */
import type P5 from 'p5';
import type { CanvasSize, FocusSketch } from '../backgroundConfig';

type RGB = [number, number, number];

interface SnowPalette {
  /** Overcast sky at the top of the frame. */
  sky: RGB;
  /** Sky where it meets the ground. */
  haze: RGB;
  /** The snowfield itself. */
  ground: RGB;
  /** Birch bark. */
  bark: RGB;
  /** Bark shading on the shaded side of each trunk. */
  barkShade: RGB;
  /** Lenticel dashes, branch and fir ink. */
  ink: RGB;
  /** Distant firs. */
  fir: RGB;
  /** Flakes. */
  flake: RGB;
  /** Vignette strength, 0..1. */
  vignette: number;
}

const PALETTE: SnowPalette = {
  sky: [146, 160, 176],
  haze: [198, 208, 216],
  ground: [228, 233, 238],
  bark: [243, 246, 248],
  barkShade: [178, 186, 194],
  ink: [52, 58, 66],
  fir: [88, 102, 106],
  flake: [252, 253, 255],
  vignette: 0.16,
};

export interface SnowfieldSceneOptions {
  /** Fixed seed → the same stand of birches every time. */
  seed: number;
}

// --- Cached composition (normalised 0..1; unit = min(width, height)) ---------

interface TrunkSpec {
  x: number;
  width: number;
  /** Darker trunks sit "further back". */
  shade: number;
  /** Horizontal bark dashes, stored as [y, span, alpha]. */
  marks: Array<[number, number, number]>;
  branches: Array<{ y: number; side: number; reach: number; lift: number }>;
}

interface FirSpec {
  x: number;
  baseY: number;
  width: number;
  height: number;
  alpha: number;
}

interface FlakeSpec {
  x: number;
  offset: number;
  speed: number;
  radius: number;
  alpha: number;
  sway: number;
  wobble: number;
}

/**
 * The quiet box for the countdown digits. Trunks are planted outside it and the
 * firs are kept below it, so the middle of the frame is only sky and drift.
 */
const KEEP_CLEAR = { x0: 0.3, x1: 0.7, y0: 0.32, y1: 0.64 };

/** Ground line as a gentle seeded undulation, in normalised y. */
const GROUND_Y = 0.78;

const buildComposition = (p: P5, palette: SnowPalette) => {
  const trunks: TrunkSpec[] = [];
  const trunkCount = 5;
  for (let i = 0; i < trunkCount; i++) {
    const left = i % 2 === 0;
    const x = left ? p.random(0.02, 0.27) : p.random(0.73, 0.98);
    const width = p.random(0.03, 0.075);
    const marks: Array<[number, number, number]> = [];
    const markCount = Math.round(p.random(14, 26));
    for (let m = 0; m < markCount; m++) {
      marks.push([p.random(0.02, 0.98), p.random(0.18, 0.62), p.random(70, 165)]);
    }
    const branches: TrunkSpec['branches'] = [];
    const branchCount = Math.round(p.random(1, 3));
    for (let b = 0; b < branchCount; b++) {
      // Only outward-reaching branches, so they never cross the digits.
      branches.push({
        y: p.random(0.06, 0.42),
        side: left ? -1 : 1,
        reach: p.random(0.05, 0.13),
        lift: p.random(0.05, 0.16),
      });
    }
    trunks.push({ x, width, shade: p.random(0.15, 0.75), marks, branches });
  }

  const firs: FirSpec[] = [];
  for (let i = 0; i < 7; i++) {
    const x = p.random(0.3, 0.7);
    // Under the quiet box, never behind it.
    if (x > KEEP_CLEAR.x0 && x < KEEP_CLEAR.x1 && p.random() < 0.5) continue;
    firs.push({
      x,
      baseY: p.random(GROUND_Y - 0.02, GROUND_Y + 0.05),
      width: p.random(0.02, 0.05),
      height: p.random(0.06, 0.15),
      alpha: Math.round(p.random(70, 140)),
    });
  }

  // The drift line the snowfield breaks over.
  const ridge: number[] = [];
  const ridgePoints = 26;
  for (let i = 0; i <= ridgePoints; i++) {
    ridge.push(p.noise(i * 0.22, palette.ground[0] * 0.001) * 0.05);
  }

  const flakes: FlakeSpec[] = [];
  const flakeCount = 108;
  for (let i = 0; i < flakeCount; i++) {
    flakes.push({
      x: p.random(0, 1),
      offset: p.random(0, 1.2),
      speed: p.random(0.0011, 0.0038),
      radius: p.random(0.0035, 0.011),
      alpha: Math.round(p.random(110, 235)),
      sway: p.random(0.004, 0.02),
      wobble: p.random(0.8, 2.6),
    });
  }

  return { trunks, firs, ridge, flakes };
};

/**
 * Create a `FocusSketch` of birches on a snowfield.
 *
 * Animated by design (`animated: true` in the registry); the mounting component
 * owns the loop, the visibility pause and the reduced-motion freeze.
 */
export const createSnowfieldScene =
  ({ seed }: SnowfieldSceneOptions): FocusSketch =>
  (p: P5, measure: () => CanvasSize) => {
    let scene: ReturnType<typeof buildComposition> = {
      trunks: [],
      firs: [],
      ridge: [],
      flakes: [],
    };

    p.setup = () => {
      const { w, h } = measure();
      p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
      p.createCanvas(w, h);
      p.randomSeed(seed);
      p.noiseSeed(seed);
      p.noiseDetail(3, 0.5);
      p.strokeCap(p.ROUND);
      p.ellipseMode(p.CENTER);
      p.rectMode(p.CENTER);
      p.frameRate(24);

      scene = buildComposition(p, PALETTE);
      // No `p.noLoop()`: the drift is the point.
    };

    p.draw = () => {
      const w = p.width;
      const h = p.height;
      const u = Math.min(w, h);

      // Overcast sky, brightening toward the horizon.
      const bands = 34;
      p.noStroke();
      for (let row = 0; row < bands; row++) {
        const t = row / (bands - 1);
        p.fill(
          PALETTE.sky[0] + (PALETTE.haze[0] - PALETTE.sky[0]) * t,
          PALETTE.sky[1] + (PALETTE.haze[1] - PALETTE.sky[1]) * t,
          PALETTE.sky[2] + (PALETTE.haze[2] - PALETTE.sky[2]) * t,
          255
        );
        p.rect(w / 2, t * GROUND_Y * h, w + 1, (GROUND_Y * h) / (bands - 1) + 1);
      }

      // Snowfield, breaking over the seeded ridge line.
      p.fill(PALETTE.ground[0], PALETTE.ground[1], PALETTE.ground[2]);
      p.beginShape();
      p.vertex(0, h + 1);
      for (let i = 0; i < scene.ridge.length; i++) {
        const x = (i / (scene.ridge.length - 1)) * w;
        p.vertex(x, (GROUND_Y - scene.ridge[i]) * h);
      }
      p.vertex(w, h + 1);
      p.endShape(p.CLOSE);

      // Distant firs on the horizon.
      for (const fir of scene.firs) {
        p.fill(PALETTE.fir[0], PALETTE.fir[1], PALETTE.fir[2], fir.alpha);
        p.noStroke();
        p.triangle(
          fir.x * w - (fir.width * u) / 2,
          fir.baseY * h,
          fir.x * w + (fir.width * u) / 2,
          fir.baseY * h,
          fir.x * w,
          (fir.baseY - fir.height) * h
        );
      }

      for (const trunk of scene.trunks) {
        const half = (trunk.width * u) / 2;
        const cx = trunk.x * w;

        p.noStroke();
        p.fill(
          PALETTE.bark[0] + (PALETTE.barkShade[0] - PALETTE.bark[0]) * trunk.shade,
          PALETTE.bark[1] + (PALETTE.barkShade[1] - PALETTE.bark[1]) * trunk.shade,
          PALETTE.bark[2] + (PALETTE.barkShade[2] - PALETTE.bark[2]) * trunk.shade
        );
        p.rect(cx, h / 2, trunk.width * u, h * 1.12);

        // Shaded right edge: three narrow, fainter bands hugging the silhouette
        // fake a soft falloff. One solid rect here read as a second trunk parked
        // beside the first, which ruined the whole scene.
        for (let s = 0; s < 3; s++) {
          const band = half * (0.3 - s * 0.09);
          p.fill(
            PALETTE.barkShade[0],
            PALETTE.barkShade[1],
            PALETTE.barkShade[2],
            46 - s * 14
          );
          p.rect(cx + half - band / 2 - s * half * 0.14, h / 2, band, h * 1.12);
        }

        // Lenticels: the dash pattern is what makes it a birch.
        for (const [y, span, alpha] of trunk.marks) {
          p.stroke(PALETTE.ink[0], PALETTE.ink[1], PALETTE.ink[2], alpha);
          p.strokeWeight(Math.max(1, u * 0.004));
          p.line(cx - half * 0.8, y * h, cx - half * 0.8 + half * 1.6 * span, y * h);
        }

        p.noFill();
        for (const branch of trunk.branches) {
          p.stroke(PALETTE.ink[0], PALETTE.ink[1], PALETTE.ink[2], 190);
          p.strokeWeight(Math.max(1, (trunk.width * u) / 9));
          p.line(
            cx + branch.side * half * 0.7,
            branch.y * h,
            cx + branch.side * (half + branch.reach * u),
            (branch.y - branch.lift) * h
          );
        }
      }

      // Drifting flakes: position is a pure function of the frame count.
      p.noStroke();
      for (const flake of scene.flakes) {
        const travel = (flake.offset + p.frameCount * flake.speed) % 1.2;
        const y = travel * h - 0.06 * h;
        const x =
          flake.x * w + Math.sin(travel * flake.wobble * p.PI * 2) * flake.sway * u;
        p.fill(PALETTE.flake[0], PALETTE.flake[1], PALETTE.flake[2], flake.alpha);
        p.circle(x, y, flake.radius * u * 2);
      }

      // Cold vignette.
      const ctx = p.drawingContext as CanvasRenderingContext2D | undefined;
      if (ctx && typeof ctx.createRadialGradient === 'function') {
        const gradient = ctx.createRadialGradient(
          w / 2,
          h * 0.44,
          u * 0.24,
          w / 2,
          h * 0.44,
          Math.max(w, h) * 0.82
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(10,14,20,${PALETTE.vignette})`);
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
