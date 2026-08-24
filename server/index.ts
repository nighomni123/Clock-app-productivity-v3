/**
 * Full-stack server: Express API + Vite dev middleware (or static dist in prod).
 *
 * Architectural constraint (AGENTS.md): the Gemini API key lives ONLY here,
 * read from .env via dotenv — it is never exposed to or bundled by the client.
 * The server always binds to port 3000 on host 0.0.0.0.
 */
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import {
  DayPlanRequestInput,
  MissingApiKeyError,
  WeeklyReviewRequestInput,
  generateDayPlan,
  generateWeeklyReview
} from './gemini';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 3000;
const HOST = '0.0.0.0';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '512kb' }));

const aiConfigured = Boolean(process.env.GEMINI_API_KEY);

// ---------------------------------------------------------------------------
// AI API routes
// ---------------------------------------------------------------------------

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function handleAiError(err: unknown, res: Response): void {
  if (err instanceof MissingApiKeyError) {
    res.status(503).json({ error: err.message });
    return;
  }
  console.error('[AI] request failed:', err);
  const message = err instanceof Error ? err.message : 'Unexpected server error.';
  res.status(502).json({ error: `Gemini request failed: ${message}` });
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, aiConfigured });
});

app.post('/api/ai/day-plan', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as Partial<DayPlanRequestInput>;
    const context = body.context ?? {} as Partial<DayPlanRequestInput['context']>;
    const input: DayPlanRequestInput = {
      tasks: asArray(body.tasks).map((t) => t as DayPlanRequestInput['tasks'][number]),
      journalEntries: asArray(body.journalEntries).map((j) => j as DayPlanRequestInput['journalEntries'][number]),
      context: {
        dayKey: String(context.dayKey ?? ''),
        nowISO: String(context.nowISO ?? new Date().toISOString()),
        defaultFocusMinutes: Number(context.defaultFocusMinutes) || 25,
        defaultBreakMinutes: Number(context.defaultBreakMinutes) || 5
      }
    };
    const plan = await generateDayPlan(input);
    res.json(plan);
  } catch (err) {
    handleAiError(err, res);
  }
});

app.post('/api/ai/weekly-review', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as Partial<WeeklyReviewRequestInput>;
    const input: WeeklyReviewRequestInput = {
      rangeLabel: String(body.rangeLabel ?? 'the last 7 days'),
      completedTasks: Number(body.completedTasks) || 0,
      openTasks: Number(body.openTasks) || 0,
      totalFocusMinutes: Math.round(Number(body.totalFocusMinutes)) || 0,
      sessionCount: Math.round(Number(body.sessionCount)) || 0,
      distractionCount: Math.round(Number(body.distractionCount)) || 0,
      dailyTargetMinutes: Math.round(Number(body.dailyTargetMinutes)) || 120,
      journalEntries: asArray(body.journalEntries).map((j) => j as WeeklyReviewRequestInput['journalEntries'][number])
    };
    const review = await generateWeeklyReview(input);
    res.json(review);
  } catch (err) {
    handleAiError(err, res);
  }
});

// ---------------------------------------------------------------------------
// Client delivery: Vite dev middleware (dev) or static dist (production)
// ---------------------------------------------------------------------------

async function attachClientServing(): Promise<ViteDevServer | null> {
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    // SPA fallback for client-side routes; never swallow /api responses.
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
    return null;
  }

  // Dev: serve the React SPA through Vite's middlewares (HMR respected via
  // DISABLE_HMR, matching vite.config.ts).
  const disableHmr = process.env.DISABLE_HMR === 'true';
  const vite = await createViteServer({
    configFile: path.join(ROOT_DIR, 'vite.config.ts'),
    appType: 'spa',
    server: {
      middlewareMode: true,
      hmr: disableHmr ? false : undefined,
      watch: disableHmr ? null : undefined
    }
  });
  app.use(vite.middlewares);
  return vite;
}

// JSON body parse errors → clean 400 instead of an HTML stack trace.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }
  console.error('[server] unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

async function start(): Promise<void> {
  const vite = await attachClientServing();

  const server = app.listen(PORT, HOST, () => {
    console.log(`Focus Study Clock listening on http://${HOST}:${PORT}`);
    console.log(`Gemini API key ${aiConfigured ? 'loaded' : 'MISSING'} (read server-side from .env only)`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n${signal} received — shutting down.`);
    server.close(() => {
      void vite?.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
