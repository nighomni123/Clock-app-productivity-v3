# Remix Focus Study Clock

A study-productivity PWA: focus timer with remix-style session planning, daily
task queue, journaling, Gemini-assisted planning, Firestore multi-device sync
(9-letter sync code), push notifications, and full offline support.

**Live demo:** https://clock-app-productivity-v3.vercel.app (installable PWA; works offline)

## Stack
React + Vite PWA · Firebase (Firestore + messaging) · Gemini API (server-side,
per the applet config) · service-worker offline cache.

## How it was built
Vibe-coded with an agent pair: specs and review by hand, implementation and
iteration by agents (the `ponytail-audit-report.md` in this repo is the agents'
own over-engineering review that trimmed this codebase). Fast to run, not fast
to read — the audit report shows the loop.

## Notes
- `firebase-applet-config.json` is the *example*-shaped config; fill in your own
  Firebase project to run locally (`npm i && npm run dev`).
- This is a personal productivity tool, not a commercial product; no analytics,
  no accounts, no data leaves Firebase.
