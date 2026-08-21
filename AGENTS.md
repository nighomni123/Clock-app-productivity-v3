# AI Agent Instructions for Focus Study Clock

## Project Overview
This is a study productivity application featuring a focus clock and timer, a task queue, an activity journal, real-time Firestore synchronization, web notifications, Google Calendar integration, and offline support. It is built as a React SPA using Vite, TypeScript, and Tailwind CSS.

## General Coding Rules
1. **Component Structure**: Keep components modular and single-responsibility. Extract new complex views into `src/components/`.
2. **State Management**: Prefer local component state for UI and Firebase Firestore for persistent data syncing. Use `onSnapshot` for real-time listener updates.
3. **Styling**: Strictly use Tailwind CSS utility classes. Avoid creating custom CSS rules unless strictly required (e.g., hiding scrollbars).
4. **Icons**: Use `lucide-react` for all icons.
5. **Animation**: Use `motion` (from `motion/react`) for layout animations and component transitions.

## Data Persistence & Firebase Integration
- Prefer using Firebase SDK v9+ modular syntax (e.g., `doc`, `setDoc`, `onSnapshot`).
- Ensure Firestore collection names and document structures adhere to the interfaces defined in `src/types.ts`.
- Maintain graceful degradation for offline functionality using Firebase's local caching and the registered service worker.

## Architectural Constraints
- **Client-Side vs Full-Stack**: The app is currently a client-side Single Page Application (SPA). If integrating third-party APIs with secrets (like OpenAI, Stripe, or Gemini), you must transition the architecture to a full-stack Express + Vite setup to secure API keys server-side.
- **Port Constraints**: If transitioning to a server backend, always ensure the server binds to port `3000` and host `0.0.0.0`.

## Visual & UX Design Guidelines
- The app operates in a dark mode context (`class="dark"` on `<html>`, `bg-black text-zinc-100` on `<body>`). All newly added components should maintain this premium dark theme aesthetic.
- Prioritize clear, distraction-free visual hierarchy for the active study timer and task lists.
- For timers or interactive elements, ensure proper aria labels and touch-target sizes for accessibility.
