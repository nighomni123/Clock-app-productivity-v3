/**
 * `ridgelineScene` — a procedural, static mountain ridgeline scene for p5.js.
 *
 * A predawn view of overlapping mountain ridges, with a soft sky gradient,
 * scattered stars, a pale moon, and pine-tree ticks along the nearest ridge.
 * The entire composition is built once in `setup` from a fixed seed and stored
 * in normalised 0..1 coordinates; `draw` is a pure render of that cached data
 * so resizes and tab-visibility changes redraw the same painting identically.
 */
import type P5 from 'p5';
import type { CanvasSize, FocusSketch } from '../backgroundConfig';

export interface RidgelineSceneOptions {
  seed: number;
}

// Palette: muted, desaturated, cool family with warm accent
const INDIGO = [40, 48, 72];
const SLATE = [68, 80, 96];
const WARM_GLOW = [124, 92, 76];
const PALE_MOON = [220, 216, 208];
const STAR_COLOR = [220, 216, 208];

interface Ridge {
  base: number;
  step: number;
  pts: number;
  fill: [number, number, number, number];
  stroke?: [number, number, number, number];
  sw: number;
  off: number;
  scale: number;
  /** How much noise space the silhouette walks across the frame. */
  freq: number;
  /**
   * Precomputed silhouette, normalised y per vertex (length `pts` + 1). Built in
   * `setup`: the first pass sampled `p.noise(off + (t*2-1) * step)` with
   * `step ≈ 0.01`, i.e. it walked 0.02 of noise space across the whole frame —
   * mathematically a straight line, which is why every "ridge" was a flat band.
   */
  ys: number[];
}

interface Star { x: number; y: number; s: number; a: number; }
interface Pine { x: number; y: number; h: number; w: number; }

export const createRidgelineScene = (
  { seed }: RidgelineSceneOptions
): FocusSketch =>
  (p: P5, measure: () => CanvasSize) => {
    let ridges: Ridge[] = [];
    let stars: Star[] = [];
    let moon: { x: number; y: number; r: number; c: [number, number, number, number]; ha1: number; ha2: number } | null = null;
    let pines: Pine[] = [];
    interface Mist { y: number; alpha: number; height: number }
    let mist: Mist[] = [];

    p.setup = () => {
      const { w, h } = measure();
      p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
      p.createCanvas(w, h);
      p.randomSeed(seed);
      p.noiseSeed(seed);
      p.noiseDetail(3, 0.5);

      // 5 ridges back-to-front
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        // Remapped luminance: [58,66,84] -> [22,26,36] over 5 layers
        // -6/-6.5/-8 per layer: the front ridge lands at [34,40,52] instead of
        // [22,26,36], which the last review flagged as indistinguishable from black.
        const rBase = [58 - i * 6, 66 - i * 6.5, 84 - i * 8];
        ridges.push({
          base: 0.52 + t * 0.43,
          step: 0.008 + p.random(0.004),
          pts: 120 + Math.floor(p.random(40)),
          fill: [
            rBase[0] / 255,
            rBase[1] / 255,
            rBase[2] / 255,
            (140 + t * 115) / 255,
          ],
          // Pale rim on the near crest (a *dark* stroke here previously drew a
          // second hard line right where the ridge already met the void).
          stroke: i === 4 ? [0.36, 0.39, 0.46, 0.35] : undefined,
          sw: i === 4 ? 0.0016 : 0,
          off: i * 1000 + p.random(1000),
          scale: 0.07 + p.random(0.045) - t * 0.025,
          freq: 0.75 + p.random(1.15),
          ys: [],
        });
      }

      // Silhouettes: two noise octaves (broad mass + rocky ripple), sharpened
      // with a power curve so ridgelines come to a point instead of rolling.
      for (const r of ridges) {
        r.ys = [];
        // One dominant massif per layer, so the eye reads "a mountain range"
        // rather than a repeating hill profile.
        const peakAt = p.random(0.14, 0.86);
        const peakWide = p.random(0.09, 0.2);
        for (let i = 0; i <= r.pts; i++) {
          const t = i / r.pts;
          const x = r.off + (t * 2 - 1) * r.freq;
          const shape = p.noise(x, r.off * 0.13);
          // ridgeMask carves deep valleys: subtracting a broad low-frequency
          // curve is what separates crests instead of rounding them off.
          const valley = p.noise(x * 0.38 + 47.1, r.off * 0.29 + 9.4);
          const massif = Math.exp(-(((t - peakAt) / peakWide) ** 2));
          const raw = Math.min(1, Math.max(0, shape * 0.66 + massif * 0.4 - valley * 0.34));
          r.ys.push(r.base - (Math.pow(raw, 1.85) - 0.3) * r.scale * 2.4);
        }
      }

      // ~40-70 stars in upper 45%, avoiding quiet box
      const starCount = 40 + Math.floor(p.random(30));
      for (let i = 0; i < starCount; i++) {
        let x, y, attempts = 0;
        do { x = p.random(); y = p.random(0.45); attempts++; }
        while (attempts < 10 && x >= 0.3 && x <= 0.7 && y >= 0.32 && y <= 0.64);
        const isBig = p.random() < 0.1;
        stars.push({ x, y, s: p.random(0.003, 0.008) * (isBig ? 1.5 : 1), a: p.random(0.55, 0.90) });
      }

      // Moon: off-centre in upper band
      moon = {
        x: 0.66 + p.random(0.16),
        y: 0.14 + p.random(0.12),
        r: 0.03 + p.random(0.015),
        c: [PALE_MOON[0] / 255, PALE_MOON[1] / 255, PALE_MOON[2] / 255, 0.80 + p.random(0.15)],
        ha1: 14 + p.random(12),  // halo alpha 1: 14-26
        ha2: 18 + p.random(8),   // halo alpha 2: 18-26
      };
      if (moon.x >= 0.3 && moon.x <= 0.7 && moon.y >= 0.32 && moon.y <= 0.64)
        moon.x = moon.x < 0.5 ? 0.25 : 0.75;

      // ~8-15 pines on front ridge
      const fr = ridges[4];
      for (let i = 0; i < (8 + Math.floor(p.random(7))); i++) {
        const t = p.random();
        const n = p.noise(fr.off + (t * 2 - 1) * fr.step);
        pines.push({ x: t, y: fr.base + (n - 0.5) * fr.scale, h: p.random(0.025, 0.055), w: p.random(0.008, 0.016) });
      }

      mist = [1, 2, 3].map((i) => ({
        // Sit the band ~2px above the boundary it belongs to; centring it on the
        // line just blurred the edge without reading as haze.
        y: ridges[i].base - 0.006,
        alpha: 0.23 + p.random(0.07),
        height: 0.04 + p.random(0.02),
      }));
      p.noLoop();
    };

    const ridgeY = (r: Ridge, t: number, h: number) =>
      r.ys[Math.min(r.ys.length - 1, Math.round(t * r.pts))] * h;

    const drawRidge = (r: Ridge, w: number, h: number) => {
      p.beginShape();
      p.noStroke();
      p.fill(r.fill[0] * 255, r.fill[1] * 255, r.fill[2] * 255, r.fill[3] * 255);
      for (let i = 0; i <= r.pts; i++) {
        const t = i / r.pts;
        p.vertex(t * w, ridgeY(r, t, h));
      }
      p.vertex(w, h);
      p.vertex(0, h);
      p.endShape(p.CLOSE);

      if (r.stroke && r.sw > 0) {
        p.stroke(r.stroke[0] * 255, r.stroke[1] * 255, r.stroke[2] * 255, r.stroke[3] * 255);
        p.strokeWeight(r.sw * Math.min(w, h));
        p.noFill();
        p.beginShape();
        for (let i = 0; i <= r.pts; i++) {
          const t = i / r.pts;
          p.vertex(t * w, ridgeY(r, t, h));
        }
        p.endShape();
      }
    };

    p.draw = () => {
      const w = p.width, h = p.height, u = Math.min(w, h);
      const ctx = p.drawingContext as CanvasRenderingContext2D | undefined;

      // Sky: vertical gradient indigo -> slate + radial warm glow
      if (ctx?.createLinearGradient) {
        const g1 = ctx.createLinearGradient(0, 0, 0, h);
        g1.addColorStop(0, `rgba(${INDIGO[0]},${INDIGO[1]},${INDIGO[2]},1)`);
        g1.addColorStop(0.45, `rgba(${SLATE[0]},${SLATE[1]},${SLATE[2]},1)`);
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, w, h);

        const g2 = ctx.createRadialGradient(w * 0.75, h * 0.85, 0, w * 0.75, h * 0.85, w * 0.4);
        g2.addColorStop(0, `rgba(${WARM_GLOW[0]},${WARM_GLOW[1]},${WARM_GLOW[2]},0.12)`);
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, w, h);

        // Horizon wash
        const g3 = ctx.createLinearGradient(0, h * 0.6, 0, h);
        g3.addColorStop(0, 'rgba(0,0,0,0)');
        g3.addColorStop(1, `rgba(${SLATE[0]},${SLATE[1]},${SLATE[2]},0.14)`);
        ctx.fillStyle = g3; ctx.fillRect(0, 0, w, h);
      } else {
        p.background(SLATE[0], SLATE[1], SLATE[2]);
      }

      // Ridges back-to-front
      for (const r of ridges) drawRidge(r, w, h);

      // Haze settling in each valley between layers.
      p.noStroke();
      for (const band of mist) {
        p.fill(180, 192, 208, band.alpha * 255);
        p.rect(0, band.y * h, w, band.height * h);
      }

      // Pines on front ridge
      p.fill(32, 44, 52, 220);
      for (const pi of pines) {
        const x = pi.x * w, y = pi.y * h, th = pi.h * u, tw = pi.w * u;
        p.push();
        p.translate(x, y);
        p.beginShape();
        p.vertex(0, 0);
        p.vertex(-tw / 2, -th * 0.4);
        p.vertex(tw / 4, -th * 0.7);
        p.vertex(0, -th);
        p.vertex(-tw / 4, -th * 0.7);
        p.vertex(tw / 2, -th * 0.4);
        p.endShape(p.CLOSE);
        p.pop();
      }

      // Stars
      for (const s of stars) {
        p.fill(STAR_COLOR[0], STAR_COLOR[1], STAR_COLOR[2], s.a * 255);
        const sz = s.s * u;
        p.circle(s.x * w, s.y * h, sz);
        p.circle(s.x * w + sz * 0.3, s.y * h, sz * 0.6);
      }

      // Moon with soft halo
      if (moon) {
        const mc = moon.c, mr = moon.r * u * 1.8;
        p.fill(mc[0] * 255, mc[1] * 255, mc[2] * 255, moon.ha1);
        p.circle(moon.x * w, moon.y * h, mr * 2.0);
        p.fill(mc[0] * 255, mc[1] * 255, mc[2] * 255, moon.ha2);
        p.circle(moon.x * w, moon.y * h, mr * 3.2);
        p.fill(mc[0] * 255, mc[1] * 255, mc[2] * 255, mc[3] * 255);
        p.circle(moon.x * w, moon.y * h, mr);
        p.fill(mc[0] * 255, mc[1] * 255, mc[2] * 255, mc[3] * 180);
        p.circle(moon.x * w, moon.y * h, mr * (1.2 / 1.8));
      }
    };

    p.windowResized = () => {
      const { w, h } = measure();
      if (!w || !h) return;
      p.resizeCanvas(w, h, false);
      p.redraw();
    };
  };
