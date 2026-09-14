/**
 * `minimalFlowerScene` — a procedural, mostly-static floral study for p5.js.
 *
 * A small number of noise-driven stems rise from the bottom edge of a
 * paper-toned canvas, each carrying a few leaves and one restrained bloom, seed
 * head or bud. Everything is derived from a fixed seed so the composition is
 * identical on every render (including the offscreen thumbnail pass and the
 * remount that happens when fullscreen focus mode opens), and all positions are
 * stored in normalised 0..1 space so a resize re-draws the same painting rather
 * than a new one.
 *
 * The sketch calls `noLoop()` at the end of `setup`: `draw()` is a pure render
 * of the cached composition (no randomness at draw time) and is only re-invoked
 * by `windowResized`. No pointer or keyboard input is read, nothing is attached
 * to `window`, and no assets are loaded — the mounting component owns the
 * instance lifecycle. Audio and UI are deliberately absent from this file.
 */
import type P5 from 'p5';
import type { CanvasSize, FocusSketch } from '../backgroundConfig';

type RGB = [number, number, number];

/** Named colourways. Restrained by design: one paper, one ink, 3–4 accents. */
export type FlowerPaletteName = 'warm' | 'sage' | 'nocturne';

interface FlowerPalette {
  /** Canvas ground (the "paper"). */
  paper: RGB;
  /** Stems, veins and stipple. */
  ink: RGB;
  /** Foliage wash. */
  leaf: RGB;
  /** Rotating accent colours for petals. */
  petals: RGB[];
  /** Grain tint, scattered over the paper. */
  grain: RGB;
  /** Vignette strength, 0..1. */
  vignette: number;
}

const PALETTES: Record<FlowerPaletteName, FlowerPalette> = {
  warm: {
    paper: [243, 238, 228],
    ink: [68, 70, 60],
    leaf: [122, 132, 104],
    petals: [
      [199, 124, 96],
      [208, 158, 148],
      [212, 168, 92],
      [166, 122, 116],
    ],
    grain: [96, 88, 74],
    vignette: 0.09,
  },
  sage: {
    paper: [236, 240, 231],
    ink: [70, 82, 64],
    leaf: [142, 164, 128],
    petals: [
      [176, 190, 152],
      [206, 172, 96],
      [226, 226, 210],
      [196, 148, 138],
    ],
    grain: [84, 92, 72],
    vignette: 0.08,
  },
  nocturne: {
    paper: [30, 33, 41],
    ink: [198, 202, 206],
    leaf: [124, 142, 146],
    petals: [
      [224, 218, 205],
      [168, 152, 176],
      [206, 176, 140],
      [140, 160, 170],
    ],
    grain: [216, 220, 226],
    vignette: 0.22,
  },
};

export interface FlowerSceneOptions {
  /** Fixed seed → stable composition across renders, resizes and remounts. */
  seed: number;
  palette?: FlowerPaletteName;
  /** Force a stem count (default scales gently with canvas area). */
  stems?: number;
}

// --- Cached composition (normalised coordinates; unit = min(width, height)) --

interface LeafSpec {
  /** Position along the stem, 0 (base) → 1 (head). */
  t: number;
  /** -1 or 1: which side of the stem the leaf hangs. */
  side: number;
  length: number;
  width: number;
  /** Extra rotation relative to the stem tangent, in radians. */
  tilt: number;
  color: RGB;
}

interface PetalSpec {
  angle: number;
  length: number;
  width: number;
  color: RGB;
  alpha: number;
}

type HeadKind = 'bloom' | 'seed' | 'bud';

interface HeadSpec {
  kind: HeadKind;
  petals: PetalSpec[];
  radius: number;
  tint: RGB;
}

interface StemSpec {
  baseX: number;
  /** Slightly below the bottom edge so stems read as growing out of frame. */
  baseY: number;
  height: number;
  /** Outward arc strength. */
  lean: number;
  /** Noise sway amplitude. */
  sway: number;
  noiseOffset: number;
  weight: number;
  /** Stroke alpha for the stem line (the centre arcs are drawn fainter). */
  alpha: number;
  leaves: LeafSpec[];
  head: HeadSpec;
}

/** Point on a stem at `t`, in normalised canvas space. */
const stemPoint = (p: P5, stem: StemSpec, t: number): { x: number; y: number } => {
  const jitter = p.noise(stem.noiseOffset + t * 1.9) - 0.5;
  const arc = Math.sin(t * Math.PI * 0.85) * stem.lean;
  return {
    x: stem.baseX + arc + jitter * stem.sway * t,
    y: stem.baseY - stem.height * t,
  };
};

/** Approximate stem tangent angle in canvas space (y grows downward). */
const stemAngle = (p: P5, stem: StemSpec, t: number): number => {
  const a = stemPoint(p, stem, Math.max(0, t - 0.04));
  const b = stemPoint(p, stem, Math.min(1, t + 0.04));
  return Math.atan2(b.y - a.y, b.x - a.x);
};

const buildComposition = (
  p: P5,
  stemCount: number,
  palette: FlowerPalette
): StemSpec[] => {
  const stems: StemSpec[] = [];
  // The timer clock lives in the middle of the frame, so the tall stems are
  // planted in the two flanking bands and only short buds may cross the centre.
  const LEFT_BAND = { from: 0.04, to: 0.34 };
  const RIGHT_BAND = { from: 0.66, to: 0.96 };
  const slotsPerBand = Math.ceil(stemCount / 2);
  // Blooms arrive on an irregular cadence, otherwise the heads look stamped.
  const bloomEvery = 2 + Math.floor(p.random(3));
  let tallIndex = 0;

  const addStem = (baseX: number, height: number, kind: HeadKind, alpha: number) => {
    const petalCount = Math.round(p.random(5, 9));
    const petalLength = kind === 'bloom' ? p.random(0.042, 0.098) : 0;
    const spread = p.random(0.72, 1.05);
    // Whole-head rotation so two blooms of the same petal count never match.
    const spin = p.random(p.TWO_PI);
    const petals: PetalSpec[] = [];
    for (let k = 0; k < petalCount; k++) {
      petals.push({
        angle: spin + (k / petalCount) * p.TWO_PI * spread + p.random(-0.1, 0.1),
        length: petalLength * p.random(0.75, 1.2),
        // Rounder petals read as flowers instead of pinwheels.
        width: petalLength * p.random(0.42, 0.62),
        color: palette.petals[Math.floor(p.random(palette.petals.length))],
        alpha: Math.round(p.random(120, 200)),
      });
    }

    const leaves: LeafSpec[] = [];
    const leafCount = Math.round(p.random(2, 4));
    for (let l = 0; l < leafCount; l++) {
      leaves.push({
        t: p.random(0.24, 0.8),
        side: l % 2 === 0 ? -1 : 1,
        length: p.random(0.045, 0.085),
        width: p.random(0.014, 0.028),
        tilt: p.random(0.25, 0.75),
        color: p.random() < 0.35 ? palette.ink : palette.leaf,
      });
    }

    stems.push({
      baseX,
      baseY: 1 + p.random(0.01, 0.06),
      height,
      // Lean away from the middle so heads stay clear of the clock.
      lean: p.random(-0.06, 0.06) + (baseX < 0.5 ? -0.055 : 0.055),
      sway: p.random(0.03, 0.075),
      noiseOffset: stems.length * 17.3 + p.random(0, 40),
      weight: p.random(1.9, 3.1),
      alpha,
      leaves,
      head: {
        kind,
        petals,
        radius:
          kind === 'bud'
            ? p.random(0.012, 0.02)
            : kind === 'seed'
              ? p.random(0.009, 0.014)
              : p.random(0.014, 0.024),
        tint: palette.petals[Math.floor(p.random(palette.petals.length))],
      },
    });
  };

  for (let i = 0; i < stemCount; i++) {
    const band = i % 2 === 0 ? LEFT_BAND : RIGHT_BAND;
    const within = (Math.floor(i / 2) + 0.5) / slotsPerBand;
    let baseX = band.from + (band.to - band.from) * within + p.random(-0.03, 0.03);
    let height = p.random(0.36, 0.76);

    // Some stems are low centre buds: they keep the ground busy without ever
    // reaching the digits.
    const lowCentre = i % 3 === 2 && p.random() < 0.55;
    if (lowCentre) {
      baseX = 0.5 + p.random(-0.12, 0.12);
      height = p.random(0.16, 0.28);
    }

    const roll = p.random();
    const kind: HeadKind = lowCentre
      ? roll < 0.62
        ? 'bud'
        : 'seed'
      : tallIndex++ % bloomEvery === 0
        ? 'bloom'
        : roll < 0.3
          ? 'seed'
          : 'bloom';

    addStem(baseX, height, kind, 205);
  }

  // Two faint tall stems arc through the upper middle. They break the "two
  // clumps with a dead centre" reading, and their heads sit at y ≈ 0.2–0.32 —
  // well above the countdown, which occupies the vertical middle band.
  for (const side of [-1, 1]) {
    addStem(
      0.5 + side * p.random(0.09, 0.14),
      p.random(0.68, 0.8),
      p.random() < 0.5 ? 'bloom' : 'seed',
      168
    );
  }

  return stems;
};

const drawLeaf = (
  p: P5,
  x: number,
  y: number,
  angle: number,
  leaf: LeafSpec,
  ink: RGB,
  u: number
) => {
  const span = leaf.length * u;
  p.push();
  p.translate(x, y);
  p.rotate(angle + leaf.side * leaf.tilt);
  p.noStroke();
  p.fill(leaf.color[0], leaf.color[1], leaf.color[2], 150);
  p.ellipse((leaf.side * span) / 2, 0, span, leaf.width * u);
  p.stroke(ink[0], ink[1], ink[2], 60);
  p.strokeWeight(Math.max(0.6, u * 0.0022));
  p.line(0, 0, leaf.side * span * 0.95, 0);
  p.pop();
};

const drawHead = (p: P5, head: HeadSpec, x: number, y: number, ink: RGB, u: number) => {
  if (head.kind === 'bloom') {
    for (const petal of head.petals) {
      p.push();
      p.translate(x, y);
      p.rotate(petal.angle);
      p.noStroke();
      p.fill(petal.color[0], petal.color[1], petal.color[2], petal.alpha);
      p.beginShape();
      p.vertex(0, 0);
      p.quadraticVertex(petal.width * u, -petal.length * u * 0.45, 0, -petal.length * u);
      p.quadraticVertex(-petal.width * u, -petal.length * u * 0.45, 0, 0);
      p.endShape(p.CLOSE);
      p.pop();
    }
    p.noStroke();
    p.fill(ink[0], ink[1], ink[2], 190);
    p.circle(x, y, head.radius * u * 0.9);
  } else if (head.kind === 'seed') {
    const radius = head.radius * u;
    // A plain stippled disc. Radiating spokes were tried and always read as a
    // clip-art sun, which breaks the botanical language of the scene.
    p.noStroke();
    p.fill(ink[0], ink[1], ink[2], 120);
    p.circle(x, y, radius * 2);
    p.fill(ink[0], ink[1], ink[2], 55);
    p.circle(x, y, radius * 3.1);
    p.noFill();
    p.stroke(ink[0], ink[1], ink[2], 90);
    p.strokeWeight(Math.max(0.7, u * 0.0024));
    p.circle(x, y, radius * 2.4);
  } else {
    p.noStroke();
    p.fill(head.tint[0], head.tint[1], head.tint[2], 175);
    p.ellipse(x, y, head.radius * u * 1.5, head.radius * u * 2.4);
    p.fill(head.tint[0], head.tint[1], head.tint[2], 90);
    p.ellipse(
      x + head.radius * u * 0.5,
      y - head.radius * u * 0.3,
      head.radius * u,
      head.radius * u * 1.7
    );
  }
};

/**
 * Create a `FocusSketch` for the minimal floral scene.
 *
 * `palette` defaults to `warm` (paper + terracotta/ochre). A different `seed`
 * yields an entirely different — but still reproducible — painting.
 */
export const createMinimalFlowerScene =
  ({ seed, palette = 'warm', stems }: FlowerSceneOptions): FocusSketch =>
  (p: P5, measure: () => CanvasSize) => {
    const colors = PALETTES[palette];
    // Stems are drawn in a softened ink (ink pulled toward the foliage tone) so
    // the line-work reads as botanical wash rather than hard black outline.
    const soften = (a: number, b: number) => Math.round(a + (b - a) * 0.4);
    const stemInk: RGB = [
      soften(colors.ink[0], colors.leaf[0]),
      soften(colors.ink[1], colors.leaf[1]),
      soften(colors.ink[2], colors.leaf[2]),
    ];
    let composition: StemSpec[] = [];
    let grain: Array<{ x: number; y: number; a: number }> = [];

    p.setup = () => {
      const { w, h } = measure();
      p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
      p.createCanvas(w, h);
      p.randomSeed(seed);
      p.noiseSeed(seed);
      p.noiseDetail(3, 0.55);
      p.strokeCap(p.ROUND);
      p.strokeJoin(p.ROUND);
      p.ellipseMode(p.CENTER);
      p.rectMode(p.CENTER);

      const stemCount =
        stems ?? Math.max(5, Math.min(9, Math.round((w * h) / 120000)));
      composition = buildComposition(p, stemCount, colors);

      // Paper speckle: sparse, low-alpha, generated once so the grain never
      // "boils" between redraws.
      const grainCount = Math.min(4200, Math.round((w * h) / 640));
      grain = [];
      for (let i = 0; i < grainCount; i++) {
        grain.push({ x: p.random(w), y: p.random(h), a: p.random(4, 13) });
      }

      p.noLoop();
    };

    p.draw = () => {
      const w = p.width;
      const h = p.height;
      const u = Math.min(w, h);

      p.background(colors.paper[0], colors.paper[1], colors.paper[2]);

      // Soft ground band so the stems sit in a plane instead of floating.
      p.noStroke();
      p.fill(colors.ink[0], colors.ink[1], colors.ink[2], 10);
      p.rect(w / 2, h * 0.965, w, h * 0.07);

      for (const stem of composition) {
        const segments = 26;
        let prev = stemPoint(p, stem, 0);
        for (let k = 1; k <= segments; k++) {
          const t = k / segments;
          const point = stemPoint(p, stem, t);
          p.stroke(stemInk[0], stemInk[1], stemInk[2], stem.alpha);
          p.strokeWeight(Math.max(0.5, (stem.weight * (1 - t * 0.72) * u) / 260));
          p.line(prev.x * w, prev.y * h, point.x * w, point.y * h);
          prev = point;
        }

        const tip = stemPoint(p, stem, 1);
        for (const leaf of stem.leaves) {
          const at = stemPoint(p, stem, leaf.t);
          drawLeaf(p, at.x * w, at.y * h, stemAngle(p, stem, leaf.t), leaf, colors.ink, u);
        }
        drawHead(p, stem.head, tip.x * w, tip.y * h, colors.ink, u);
      }

      // Paper grain.
      p.strokeWeight(1);
      for (const speck of grain) {
        p.stroke(colors.grain[0], colors.grain[1], colors.grain[2], speck.a);
        p.point(speck.x, speck.y);
      }

      // Vignette: deepens the edges and keeps the centre calm for the timer UI.
      const ctx = p.drawingContext as CanvasRenderingContext2D | undefined;
      if (colors.vignette > 0 && ctx && typeof ctx.createRadialGradient === 'function') {
        const gradient = ctx.createRadialGradient(
          w / 2,
          h / 2,
          u * 0.25,
          w / 2,
          h / 2,
          Math.max(w, h) * 0.78
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${colors.vignette})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }
    };

    p.windowResized = () => {
      const { w, h } = measure();
      if (!w || !h) return;
      // `noRedraw = false` so the cached composition is repainted at the new
      // size even though the sketch never loops.
      p.resizeCanvas(w, h, false);
      p.redraw();
    };
  };
