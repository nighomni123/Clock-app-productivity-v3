# Focus-backdrop ambient loops

Seamless looping audio paired with the selectable backdrops in
`src/features/focusBackgrounds/backgroundConfig.ts`. Every file here is **CC0
(public domain)**, so no attribution is required in the app UI — the entries
below are provenance only, in case a loop is ever swapped out.

| File | Title — Author | License | Source |
| --- | --- | --- | --- |
| `music_ambient_drift.ogg` | Heavenly Loop — isaiah658 | CC0 1.0 | https://opengameart.org/content/heavenly-loop |
| `forest_ambience.mp3` | Forest Ambience — TinyWorlds | CC0 1.0 | https://opengameart.org/content/forest-ambience |
| `music_midnight.ogg` | Project Utopia (seamless loop) — Cong Xu (congusbongus) | CC0 1.0 | https://opengameart.org/content/project-utopia-seamless-loop |

These same paths are listed in `ASSETS_TO_CACHE` in `public/sw.js`, so each loop
is precached and keeps working offline after the first load.

## Adding a loop

1. Drop the file in this folder (keep it small: a seamless loop, `ogg`/`mp3`
   preferred over `wav`).
2. Reference it from a backdrop option: `audio: { src: '/themes/audio/<file>', volume: 0.14 }`
   and add the path to `ASSETS_TO_CACHE` in `public/sw.js`.
3. If the license is anything other than CC0, record the exact credit text here
   and surface it in the app.

Licensing rules for this project: prefer CC0; CC-BY is acceptable only with its
credit reproduced in-app; avoid CC-BY-NC and marketplaces whose terms forbid
redistribution inside a shipped bundle (Pixabay, Mixkit, Zapsplat). Full
sourcing notes: `research/01-audio-assets.md`.
