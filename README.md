# Focus Study Clock

A minimalist, iOS-inspired study productivity app. Dark-mode first, with fluid animations, real-time Firestore sync, and offline support.

## Features

- **Clock & Exams** — Live clock, exam countdown, and a one-tap "Add to Google Calendar" link for your exam.
- **Focus Space** — Pomodoro-style focus timer (focus / break / long break), animated progress ring, strict mode (records tab-switch distractions), fullscreen mode, quick notes, and distraction logging.
- **Daily Tasks** — Task queue with priorities, estimated minutes, swipe/toggle completion, and per-task Google Calendar links.
- **Journal** — Frictionless activity journal: one-tap quick entries (30 min / 1 hr / 2 hr / 3 hr), swipe-to-delete, tap-to-edit, and a bottom-sheet modal for specific time ranges.
- **Settings & Stats** — Timer durations, sounds, auto-start, notifications, daily targets, today's stats, and device sync codes.
- **Sync & Accounts** — Anonymous guest sessions, Google sign-in, and shareable sync codes to mirror a session across devices.
- **Offline & PWA** — Firebase persistent local cache + a service worker for offline degradation.

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4** (utility-only styling)
- **motion** (fluid layout/transition animations)
- **lucide-react** (icons)
- **Firebase** (Auth + Firestore, modular v9+ SDK)
- **Vercel Analytics & Speed Insights**

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your Firebase web-app credentials:

```bash
cp .env.example .env
```

Required variables (see `src/lib/firebase.ts`):

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | Firestore database (optional) |
| `VITE_FIREBASE_MEASUREMENT_ID` | Analytics measurement ID |
| `VITE_FIREBASE_OAUTH_CLIENT_ID` | Google sign-in client ID (optional) |
| `VITE_FIREBASE_RECAPTCHA_SITE_KEY` | reCAPTCHA key (optional) |

### 3. Run

```bash
npm run dev      # dev server on http://0.0.0.0:3000
```

Other scripts:

```bash
npm run build    # production build
npm run preview  # preview the production build
npm run lint     # TypeScript typecheck (tsc --noEmit)
```

## Project Structure

```
src/
├── App.tsx                     # Root state, Firestore sync, tab routing
├── main.tsx                    # Entry point
├── types.ts                    # Shared TypeScript interfaces
├── components/
│   ├── Navbar.tsx              # iOS-style bottom tab bar
│   ├── ClockView.tsx           # Clock + exam countdown
│   ├── FocusWorkspace.tsx      # Focus timer & workspace
│   ├── TaskQueue.tsx           # Daily tasks
│   ├── ActivityJournal.tsx     # Journal with quick-entry
│   ├── SettingsStats.tsx       # Settings & stats (iOS grouped style)
│   ├── AuthModal.tsx           # Sign-in / guest modal
│   └── TimePickerInput.tsx     # Time input used in the journal
└── lib/
    ├── firebase.ts             # Firebase init & re-exports
    ├── audio.ts                # Completion sounds
    ├── notifications.ts        # Web Notification helpers
    └── gcal.ts                 # Google Calendar link builders (tasks & exams)
```

## Firestore Collections

`users/{uid}` (profile + settings) with `daily/{dateKey}`, `stats/summary`, `monthly/{monthKey}` subcollections, plus top-level `tasks`, `sessions`, `activity_logs`, `notes`, and `sync_sessions`. Security rules live in `firestore.rules`; the schema blueprint is in `firebase-blueprint.json`.

## Design Notes

- Dark mode only (`class="dark"` on `<html>`, `bg-black text-zinc-100`).
- Minimalist iOS aesthetic: rounded-2xl cards, glassmorphism, spring animations, 44px+ touch targets.
- The previous "Timetable & GCal" tab has been removed; calendar links remain on tasks and exams.

## License

Apache-2.0
