/**
 * `rainOnGlassScene` — a rain-washed window at night, for p5.js.
 *
 * Cold glass, a few blurred city lights behind it, condensation through the
 * lower half, and a slow field of streaks running down the pane. Unlike the
 * paper florals this one *is* animated: streak positions are a pure function of
 * `p.frameCount`, so the motion is deterministic and `draw()` still contains no
 * randomness at all. The host freezes it on the first frame for
 * `prefers-reduced-motion` users (see `BackgroundCanvas.tsx`), which is why the
 * first frame has to look like rain on its own.
 *
 * Frame rate is capped low on purpose — this sits behind a countdown, so the
 * impression wanted is "weather outside", not a screensaver.
 */
import type P5 from 'p5';
import type { CanvasSize, FocusSketch } from '../backgroundConfig';

type RGB = [number, number, number];

interface RainPalette {
  /** Glass tint at the top of the pane (the sky side). */
  top: RGB;
  /** Glass tint at the bottom (the room side). */
  bottom: RGB;
  /** Warm street/window lights. */
  warm: RGB;
  /** Cool daylight leaks. */
  cool: RGB;
  /** Condensation specks and streak highlights. */
  speck: RGB;
  /** Vignette strength, 0..1. */
  vignette: number;
}

const PALETTE: RainPalette = {
  // Teal-shifted glass: the first version was too blue-neutral and read as a
  // colder Nocturne Bloom rather than as weather.
  top: [22, 40, 45],
  bottom: [9, 19, 23],
  warm: [226, 150, 68],
  cool: [138, 180, 190],
  speck: [198, 220, 226],
  vignette: 0.22,
};

export interface RainOnGlassSceneOptions {
  /** Fixed seed → the same storm every time; different seed → a new one. */
  seed: number;
}

// --- Cached composition (normalised 0..1; unit = min(width, height)) ---------

/** Blurred light behind the glass: three stacked discs fake a soft edge. */
interface BokehSpec {
  x: number;
  y: number;
  radius: number;
  color: RGB;
  alpha: number;
}

/** A bead of water that has already stopped; static. */
interface BeadSpec {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

/** A running streak. `phase`/`speed` drive its frame-count position. */
interface StreakSpec {
  x: number;
  /** Normalised start offset so streaks are not all aligned at frame 0. */
  offset: number;
  /** Fall speed, in frame units per canvas height. */
  speed: number;
  length: number;
  weight: number;
  alpha: number;
  sway: number;
  wobble: number;
}

interface CondensationSpec {
  x: number;
  y: number;
  alpha: number;
}

/**
 * The countdown digits sit over this box, so nothing bright, sharp or busy may
 * live inside it: bokeh is pushed into the outer thirds and below the digits.
 */
const KEEP_CLEAR = { x0: 0.3, x1: 0.7, y0: 0.32, y1: 0.64 };

const inClearBox = (x: number, y: number): boolean =>
  x > KEEP_CLEAR.x0 && x < KEEP_CLEAR.x1 && y > KEEP_CLEAR.y0 && y < KEEP_CLEAR.y1;

const buildComposition = (p: P5, palette: RainPalette) => {
  const bokeh: BokehSpec[] = [];
  for (let attempt = 0; attempt < 26 && bokeh.length < 12; attempt++) {
    const x = p.random(0.04, 0.96);
    const y = p.random(0.42, 0.92);
    if (inClearBox(x, y)) continue;
    bokeh.push({
      x,
      y,
      radius: p.random(0.028, 0.075),
      color: p.random() < 0.62 ? palette.warm : palette.cool,
      // A touch brighter than the first pass: behind the scrim these lights are
      // the only thing that says "city", and at 16–40 they vanished entirely.
      alpha: Math.round(p.random(24, 54)),
    });
  }

  const beads: BeadSpec[] = [];
  for (let i = 0; i < 84; i++) {
    const x = p.random(0.02, 0.98);
    const y = p.random(0.05, 0.95);
    if (inClearBox(x, y) && p.random() < 0.85) continue;
    beads.push({ x, y, radius: p.random(0.0028, 0.0085), alpha: p.random(26, 66) });
  }

  const streaks: StreakSpec[] = [];
  const streakCount = 44;
  for (let i = 0; i < streakCount; i++) {
    // Skew the density toward the edges: the middle stays a quiet pane of glass.
    const edge = p.random() < 0.6;
    const x = edge
      ? p.random() < 0.5
        ? p.random(0.03, 0.3)
        : p.random(0.7, 0.97)
      : p.random(0.05, 0.95);
    const fast = p.random() < 0.22;
    streaks.push({
      x,
      offset: p.random(0, 1.3),
      // 0.0035 ≈ one pane every five seconds at 24 fps; the fast tail is ~1.5 s.
      speed: fast ? p.random(0.012, 0.02) : p.random(0.0028, 0.0068),
      length: p.random(0.05, 0.16),
      weight: p.random(0.9, 2.1),
      alpha: Math.round(p.random(fast ? 60 : 26, fast ? 110 : 72)),
      sway: p.random(0.002, 0.011),
      wobble: p.random(1.6, 4.4),
    });
  }

  // Condensation sits in the lower half, where the glass is coldest.
  const fog: CondensationSpec[] = [];
  const fogCount = Math.min(1600, Math.round(p.width * p.height * 0.0007));
  for (let i = 0; i < fogCount; i++) {
    fog.push({
      x: p.random(0, 1),
      y: p.random(0.46, 1),
      alpha: p.random(6, 26),
    });
  }

  return { bokeh, beads, streaks, fog };
};

/**
 * Create a `FocusSketch` of a rain-streaked window.
 *
 * Animated by design (`animated: true` in the registry); the mounting component
 * owns the loop, the visibility pause and the reduced-motion freeze.
 */
export const createRainOnGlassScene =
  ({ seed }: RainOnGlassSceneOptions): FocusSketch =>
  (p: P5, measure: () => CanvasSize) => {
    let scene: ReturnType<typeof buildComposition> = { bokeh: [], beads: [], streaks: [], fog: [] };

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
      // Gentle, and cheap: the pane never needs 60 fps.
      p.frameRate(24);

      scene = buildComposition(p, PALETTE);
      // Note: no `p.noLoop()` — this scene animates unless the host freezes it.
    };

    p.draw = () => {
      const w = p.width;
      const h = p.height;
      const u = Math.min(w, h);

      // Glass: cold sky above, darker room below.
      const bands = 40;
      p.noStroke();
      for (let row = 0; row < bands; row++) {
        const t = row / (bands - 1);
        p.fill(
          PALETTE.top[0] + (PALETTE.bottom[0] - PALETTE.top[0]) * t,
          PALETTE.top[1] + (PALETTE.bottom[1] - PALETTE.top[1]) * t,
          PALETTE.top[2] + (PALETTE.bottom[2] - PALETTE.top[2]) * t,
          255
        );
        p.rect(w / 2, t * h, w + 1, h / (bands - 1) + 1);
      }

      // Blurred lights behind the glass.
      for (const light of scene.bokeh) {
        const c = light.color;
        for (let shell = 3; shell >= 1; shell--) {
          p.fill(c[0], c[1], c[2], light.alpha / shell);
          p.circle(light.x * w, light.y * h, light.radius * u * (0.6 + shell * 0.75));
        }
      }

      // Condensation.
      p.strokeWeight(1);
      for (const speck of scene.fog) {
        p.stroke(PALETTE.speck[0], PALETTE.speck[1], PALETTE.speck[2], speck.alpha);
        p.point(speck.x * w, speck.y * h);
      }

      // Beads that have already stopped on the pane.
      p.noStroke();
      for (const bead of scene.beads) {
        p.fill(PALETTE.speck[0], PALETTE.speck[1], PALETTE.speck[2], bead.alpha * 0.5);
        p.circle(bead.x * w, bead.y * h, bead.radius * u * 2);
        p.fill(PALETTE.speck[0], PALETTE.speck[1], PALETTE.speck[2], bead.alpha);
        p.circle(
          bead.x * w - bead.radius * u * 0.3,
          bead.y * h - bead.radius * u * 0.3,
          bead.radius * u * 0.75
        );
      }

      // Running streaks: position is a pure function of the frame count.
      for (const streak of scene.streaks) {
        const travel = (streak.offset + p.frameCount * streak.speed) % 1.35;
        const head = travel - 0.12;
        if (head < -0.1 || head > 1.1) continue;
        const x =
          streak.x * w +
          Math.sin((head + streak.offset) * streak.wobble * p.PI) * streak.sway * u;
        p.stroke(PALETTE.speck[0], PALETTE.speck[1], PALETTE.speck[2], streak.alpha);
        p.strokeWeight(streak.weight * Math.max(0.6, u / 520));
        p.line(x, (head - streak.length) * h, x, head * h);
        // The heavy droplet at the head is what makes it read as rain.
        p.noStroke();
        p.fill(PALETTE.speck[0], PALETTE.speck[1], PALETTE.speck[2], streak.alpha * 1.25);
        p.circle(x, head * h, streak.weight * Math.max(1.4, u / 300));
      }

      // Vignette: keeps the middle of the pane calm for the timer.
      const ctx = p.drawingContext as CanvasRenderingContext2D | undefined;
      if (ctx && typeof ctx.createRadialGradient === 'function') {
        const gradient = ctx.createRadialGradient(
          w / 2,
          h * 0.46,
          u * 0.22,
          w / 2,
          h * 0.46,
          Math.max(w, h) * 0.8
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${PALETTE.vignette})`);
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
