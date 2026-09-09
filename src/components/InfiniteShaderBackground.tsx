import React, { useRef, useEffect, useCallback } from 'react';

/**
 * Infinite shader background: full-screen WebGL fragment shader with
 * double-warped fBm + very slow time scroll. Calm abstract canvas art
 * for the dark study clock app. No diffusion image models — pure GLSL.
 *
 * Respects prefers-reduced-motion (freezes to static seed) and pauses
 * when the tab is hidden.
 */
export interface ShaderFavourite {
  id: string;
  mode: 'fbm' | 'phyllotaxis';
  seed: number;
  savedAt: number;
}

export const InfiniteShaderBackground: React.FC<{ mode?: 'fbm' | 'phyllotaxis'; seed?: number }> = ({ mode = 'fbm', seed }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const sessionSeedRef = useRef<number>(seed ?? Math.random() * 100000);
  const reducedMotionRef = useRef<boolean>(false);
  const [favourites, setFavourites] = React.useState<ShaderFavourite[]>(() => {
    try {
      const raw = localStorage.getItem('shader_favourites');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const initShader = useCallback((gl: WebGL2RenderingContext) => {
    const vsSource = `#version 300 es
      in vec2 a_position;
      out vec2 v_uv;
      void main() {
        v_uv = a_position; // clip-space to UV
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fsPhyllotaxis = `#version 300 es
      precision mediump float;
      in vec2 v_uv;
      out vec4 outColor;
      uniform float u_time;
      uniform float u_seed;
      uniform vec2 u_resolution;

      float hash(vec2 p) {
        float h = dot(p, vec2(127.1, 311.7));
        return fract(sin(h) * 43758.5453123);
      }

      void main() {
        // Center of screen in [0,1]
        vec2 center = vec2(0.5, 0.5) + vec2(sin(u_time * 0.0005), cos(u_time * 0.0003)) * 0.05;
        vec2 uv = v_uv * 0.5 + 0.5; // [-1,1] -> [0,1]
        vec2 p = uv - center;
        float r = length(p);
        float theta = atan(p.y, p.x);

        // Golden angle (~137.508° in radians)
        float seedOffset = u_seed * 0.1;
        float goldenAngle = 2.39996322972865332 + seedOffset * 0.5;
        float maxDots = 350.0;
        float dotSize = 0.003;

        float intensity = 0.0;
        float baseColor = 0.10;

        for (float i = 0.0; i < maxDots; i++) {
          float t = i / maxDots;
          float spiralR = 0.35 * sqrt(i); // Fibonacci/spiral growth
          float spiralTheta = t * goldenAngle * 12.0 + u_time * 0.1;
          vec2 dotPos = center + vec2(cos(spiralTheta), sin(spiralTheta)) * spiralR;
          float dist = distance(uv, dotPos);
          float alpha = smoothstep(dotSize, dotSize * 0.3, dist);
          // Subtle color variation per dot using index hash
          float hueShift = hash(vec2(i, 42.0)) * 0.08;
          vec3 color = mix(vec3(0.10, 0.13, 0.18), vec3(0.14, 0.16, 0.20), hueShift);
          intensity += alpha * mix(0.3, 0.7, t);
          baseColor += alpha * 0.005;
        }

        float bg = 0.10 + 0.03 * sin(u_time * 0.005) * cos(u_time * 0.003);
        vec3 finalColor = mix(vec3(bg), vec3(0.20, 0.24, 0.30) + intensity * 0.25, 0.6);
        outColor = vec4(finalColor, 1.0);
      }
    `;

    const fsSource = mode === 'phyllotaxis' ? fsPhyllotaxis : `#version 300 es
      precision mediump float;
      in vec2 v_uv;
      out vec4 outColor;
      uniform float u_time;
      uniform float u_seed;
      uniform vec2 u_resolution;

      // Simple pseudo-random
      float hash(vec2 p) {
        float h = dot(p, vec2(127.1, 311.7));
        return fract(sin(h) * 43758.5453123);
      }

      // Simple 2D noise approximation
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f); // smoothstep
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      // Fractal Brownian motion (fBm)
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for (int i = 0; i < 4; i++) {
          value += amplitude * noise(p * frequency);
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        return value;
      }

      // Domain warp (Quilez-style): warp space by noise before sampling
      float domainWarp(vec2 p) {
        float w = fbm(p + vec2(0.0, 1.5 * u_time * 0.05));
        float h = fbm(p + vec2(1.0, 0.5 * u_time * 0.05));
        return fbm(p + vec2(w, h) * 0.4);
      }

      void main() {
        vec2 uv = v_uv; // v_uv is in [-1,1] for full-screen quad
        // Map to [0,1] with a slight zoom/shift for calm motion
        vec2 p = uv * 0.5 + 0.5;
        p.x += u_time * 0.002;
        p.y += u_time * 0.001;

        float seedOffset = u_seed * 0.1;
        float n = domainWarp(p * 2.0 + vec2(seedOffset, seedOffset * 0.7));
        // Dark premium palette: very low saturation, muted teal/amber accents
        float base = 0.10; // visible dark premium base
        float accent = smoothstep(0.35, 0.65, n) * 0.35;
        float tone = mix(vec3(0.14, 0.18, 0.24), vec3(0.28, 0.35, 0.42), n);
        vec3 color = mix(vec3(base), tone + vec3(0.06, 0.10, 0.14) * accent, 0.7);
        // Slow hue drift over time (very subtle)
        float hueShift = 0.01 * sin(u_time * 0.01);
        color.r += hueShift;
        color.g -= hueShift * 0.5;

        outColor = vec4(color, 1.0);
      }
    `;

    const compileShader = (type: number, src: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    };

    const vShader = compileShader(gl.VERTEX_SHADER, vsSource);
    const fShader = compileShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vShader || !fShader) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Full-screen quad (two triangles)
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // Clip-space coordinates covering the full viewport
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    programRef.current = prog;
    return () => {};
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    if (!canvas || !gl) return;
    const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(window.devicePixelRatio, 1.5) : 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }, []);

  const renderLoop = useCallback(() => {
    const gl = glRef.current;
    const prog = programRef.current;
    if (!gl || !prog) return;

    const time = (Date.now() - startTimeRef.current) / 1000;
    gl.clearColor(0.02, 0.02, 0.03, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const uTimeLoc = gl.getUniformLocation(prog, 'u_time');
    const uResLoc = gl.getUniformLocation(prog, 'u_resolution');
    const uSeedLoc = gl.getUniformLocation(prog, 'u_seed');
    if (uTimeLoc) gl.uniform1f(uTimeLoc, time);
    if (uResLoc) gl.uniform2f(uResLoc, gl.canvas.width, gl.canvas.height);
    if (uSeedLoc) gl.uniform1f(uSeedLoc, sessionSeedRef.current);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }, []);

  const animate = useCallback(() => {
    if (reducedMotionRef.current) {
      renderLoop(); // single static frame
      return;
    }
    renderLoop();
    animFrameRef.current = requestAnimationFrame(animate);
  }, [renderLoop]);

  useEffect(() => {
    // Observe reduced-motion preference
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (mq) {
      reducedMotionRef.current = mq.matches;
      const onChange = (e: MediaQueryListEvent) => {
        reducedMotionRef.current = e.matches;
        if (e.matches) {
          renderLoop(); // freeze to current/static frame
        } else {
          animFrameRef.current = requestAnimationFrame(animate);
        }
      };
      mq.addEventListener('change', onChange);
      // Cleanup stored separately
      return () => {
        mq.removeEventListener('change', onChange);
      };
    }
  }, [animate, renderLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) {
      console.warn('WebGL2 not available — shader background disabled');
      return;
    }
    glRef.current = gl;
    initShader(gl);
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Visibility-aware: pause when hidden
    const handleVisibility = () => {
      if (document.hidden) {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      } else {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [initShader, resizeCanvas, animate]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 -z-10 pointer-events-none aria-hidden"
        aria-hidden="true"
        style={{ background: '#05060a' }}
      />
      {/* Favourite / replay controls */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 items-end">
        <button
          onClick={() => {
            const fav: ShaderFavourite = { id: Date.now().toString(), mode: (mode as 'fbm' | 'phyllotaxis'), seed: sessionSeedRef.current, savedAt: Date.now() };
            const next = [fav, ...favourites.filter((f) => f.seed !== fav.seed || f.mode !== fav.mode)];
            setFavourites(next.slice(0, 8));
            try { localStorage.setItem('shader_favourites', JSON.stringify(next.slice(0, 8))); } catch {}
          }}
          className="px-2.5 py-1 text-[10px] font-medium bg-black/60 text-amber-300 border border-amber-700/30 rounded-full hover:bg-amber-900/40 hover:text-amber-200 transition-colors shadow-lg backdrop-blur-sm"
          aria-label="Star current shader design"
          title="Star current design (variables saved)"
        >
          ★ Star
        </button>
        {favourites.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-end max-w-[12rem]">
            {favourites.map((f) => (
              <button
                key={f.id}
                onClick={() => { sessionSeedRef.current = f.seed; }}
                className="px-2 py-0.5 text-[9px] font-medium bg-zinc-800/70 text-zinc-300 border border-zinc-600/20 rounded-full hover:bg-zinc-700/80 transition-colors"
                aria-label={`Replay saved design: ${f.mode}`}
                title={`Replay saved ${f.mode} design (seed ${Math.round(f.seed)})`}
              >
                {f.mode === 'phyllotaxis' ? '🌻' : '◈'}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
