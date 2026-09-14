# Focus-backdrop ambient loops

Seamless looping audio paired with the selectable backdrops in
`src/features/focusBackgrounds/backgroundConfig.ts`.

## CC0 — public domain, no attribution required

| File | Title — Author | License | Source |
| --- | --- | --- | --- |
| `music_ambient_drift.ogg` | Heavenly Loop — isaiah658 | CC0 1.0 | https://opengameart.org/content/heavenly-loop |
| `forest_ambience.mp3` | Forest Ambience — TinyWorlds | CC0 1.0 | https://opengameart.org/content/forest-ambience |
| `music_midnight.ogg` | Project Utopia (seamless loop) — Cong Xu (congusbongus) | CC0 1.0 | https://opengameart.org/content/project-utopia-seamless-loop |
| `music_lofi.mp3` | Calm Loop — wipics | CC0 1.0 | https://opengameart.org/content/calm-loop |
| `music_deep_focus.ogg` | Ambient Relaxing Loop — isaiah658 | CC0 1.0 | https://opengameart.org/content/ambient-relaxing-loop |
| `music_piano.wav` | Emotional Piano Loop — extenz | CC0 1.0 | https://opengameart.org/content/emotional-piano-loop |
| `rain_window.m4a` | Rain on Window Loop — OpenGameArt uploader | CC0 1.0 | https://opengameart.org/content/rain-on-window-loop |
| `snowfall_wind.m4a` | wind1 — Luke.RUSTLTD | CC0 1.0 | https://opengameart.org/content/wind1 |

`rain_window.m4a` and `snowfall_wind.m4a` were transcoded from the original
`.wav` files with `afconvert -f m4af -d aac -b 64000` (mono, ~5× smaller; loop
points unchanged). Two backdrops intentionally share a loop where the mood fits
(Nocturne Bloom / Ink Garden, Minimal Flowers / Terracotta Field) — the audio
engine matches on file, so switching between them never restarts the track.

### Layered music track

Each backdrop may carry a **`music`** track in addition to its `audio`
soundscape. The music loop is layered *under* the ambient and toggled
independently (the "Music" switch in the backdrop picker). The five CC0 music
loops above (`music_ambient_drift`, `music_deep_focus`, `music_lofi`,
`music_midnight`, `music_piano`) are reused as the per-backdrop music tracks —
see `backgroundConfig.ts`. They were downsampled to mono 22.05 kHz with Python's
`wave` module (no `ffmpeg` available) to keep the repo lean.

## CC BY — attribution required (surfaced in the picker footer)

| File | Title — Author | License | Source |
| --- | --- | --- | --- |
| `seaside_waves.ogg` | Oceanwavescrushing — Luftrum | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:Oceanwavescrushing.ogg |
| `library_fireplace.ogg` | Fire of the forge crackling — Work With Sounds / La Fonderie | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:WWS_Fireoftheforge.ogg |

The credit text for these two is rendered under the backdrop picker in
`Settings & Stats` (`BackgroundPicker.tsx`). If a CC-BY file is removed, drop its
credit there too.

## Offline

Most of these paths are listed in `ASSETS_TO_CACHE` in `public/sw.js` and are
therefore precached. `seaside_waves.ogg` is deliberately **not** precached (2.8 MB
for one backdrop); the service worker's stale-while-revalidate handler caches it
on first playback, so it works offline from then on.

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
