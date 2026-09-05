ponytail-audit: full repo scan — over-engineering only. Ranked biggest cut first.

`src/lib/taskImport.ts`: stdlib/natived: 120-line hand-rolled `parseDelimited()` (quoted fields, escaped quotes, delimiter sniff). Replace with `String.prototype.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)` or native `CSV.parse()` from std web APIs; drop ~100 lines. [src/lib/taskImport.ts]

`src/App.tsx`: yagni: 11 separate `useEffect()` blocks (lines ~350-450) mirroring 10 `localStorage` keys one-at-a-time (`tasks`, `distractions`, `daily`, `settings`, etc.). Replace with a single generic `useLocalStorageSync(key, value, isActive)` hook or a `useEffect` mapping over `LOCAL_KEYS` array; drop ~9 effects, -80 lines. [src/App.tsx]

`src/App.tsx`: yagni: 5 near-identical handler callbacks (`handleUpdateExam`, `handleUpdateDailyTarget`, `handleUpdateIntention`, `handleUpdateNotes`, `handleUpdateSettings`) all branch `syncCode` → `updateSyncDoc` → `isLocalOnlyMode` → `setDoc(db, ...)` with a debounce/ref pattern. Extract one `updateDoc(key: string, updates, debounceMs?)` factory; drop 4 duplicated callbacks, -200 lines. [src/App.tsx]

`src/App.tsx`: delete: `stripUndefined()` (lines ~140) is used but can be replaced by inline `Object.fromEntries(...)` at each call site; the abstraction has one caller pattern repeated. Delete helper, inline, -6 lines. [src/App.tsx]

`src/lib/firebase.ts`: delete: `getOrGenerateLocalGuestUid()` builds a timestamp-random UID (`guest_..._date`). A simple deterministic `guest_` prefix + `crypto.randomUUID()` (or nothing — the `uid` is already anonymous) removes the manual timestamp concat; delete ~6 lines. [src/lib/firebase.ts]

`src/components/AiDayPlannerModal.tsx`: shrink: manual block-add/remove/update handlers with `AnimatePresence` motion wrapping for each item. For a max 12-item list, `motion.li` layout animations are overkill; native CSS `transition` on `opacity/transform` achieves same visual with 0 `motion/react` overhead; shrink animation code, -30 lines. [src/components/AiDayPlannerModal.tsx]

`src/components/FocusWorkspace.tsx`: shrink: `isRunningRef`, `modeRef`, `timeLeftRef` triple-ref pattern for strict-mode visibility tracking. Use a single `useReducer` or a `useRef({ isRunning, mode, timeLeft })` combined state object; eliminate 2 refs + 3 `useEffect()` sync blocks, -20 lines. [src/components/FocusWorkspace.tsx]

`package.json`: delete: `@vercel/analytics` and `@vercel/speed-insights` dependencies (2 packages) add 2 Vercel-specific tags (`<Analytics />`, `<SpeedInsights />`). If the app isn't deployed on Vercel exclusively, these are speculative; remove imports + deps, -2 deps. [package.json, src/App.tsx]

`dist/`, `.DS_Store`, `.kilo/`, `Qwen-thinking.txt`: delete: leftover build artifacts, macOS metadata, and an unrelated file (Qwen-thinking.txt) in repo root; clean out, 0 code impact. [repo root]

`server/index.ts` + `api/_shared.ts`: delete: server-side AI endpoint logic duplicated between `server/index.ts` (Express) and `api/ai/*.ts` (Vercel serverless). The `api/_lib/gemini.ts` is the shared source; the Vercel handlers in `api/ai/` are one-shot re-exports. Not dead, but the Express server (`server/index.ts`) duplicates `asArray` and `handleAiError` helpers already in `api/_shared.ts`. Import from `_shared` in server instead of re-declaring; -15 lines. [server/index.ts]

`net: -350 lines, -2 deps possible. Not lean yet — App.tsx dominates bloat.`
