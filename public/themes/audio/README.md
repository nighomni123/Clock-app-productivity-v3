# Focus-backdrop audio loops

Seamless looping audio paired with the selectable backdrops in
`src/features/focusBackgrounds/backgroundConfig.ts`. Every backdrop may carry
two layers: an `audio` soundscape (rain, waves, wind, pads…) and a melodic
`music` track layered underneath it, each toggled + volume-controlled
independently in the backdrop picker.

## CC0 / public domain — no attribution required

| File | Role | Title — Author | License | Source |
| --- | --- | --- | --- | --- |
| `music_ambient_drift.ogg` | ambient | Heavenly Loop — isaiah658 | CC0 1.0 | https://opengameart.org/content/heavenly-loop |
| `forest_ambience.mp3` | ambient | Forest Ambience — TinyWorlds | CC0 1.0 | https://opengameart.org/content/forest-ambience |
| `music_midnight.ogg` | ambient | Project Utopia (seamless loop) — Cong Xu (congusbongus) | CC0 1.0 | https://opengameart.org/content/project-utopia-seamless-loop |
| `music_lofi.mp3` | ambient | Calm Loop — wipics | CC0 1.0 | https://opengameart.org/content/calm-loop |
| `music_deep_focus.ogg` | ambient | Ambient Relaxing Loop — isaiah658 | CC0 1.0 | https://opengameart.org/content/ambient-relaxing-loop |
| `rain_window.m4a` | ambient | Rain on Window Loop — OpenGameArt uploader | CC0 1.0 | https://opengameart.org/content/rain-on-window-loop |
| `snowfall_wind.m4a` | ambient | wind1 — Luke.RUSTLTD | CC0 1.0 | https://opengameart.org/content/wind1 |
| `music_snowfall.ogg` | music | Snowfall (Looped ver.) — Kistol | CC0 1.0 | https://opengameart.org/content/snowfall |
| `music_vampires_piano.ogg` | music | Vampire's Piano — TAD | CC0 1.0 | https://opengameart.org/content/vampires-piano |
| `music_chill_lofi.ogg` | music | Chill lofi inspired — omfgdude | CC0 1.0 | https://opengameart.org/content/chill-lofi-inspired |
| `music_ocean.ogg` | music | "Into the Oceans and the Air" — U.S. Gov / NOAA | Public domain | https://commons.wikimedia.org/wiki/File:%22Into_the_Oceans_and_the_Air%22.ogg |

## CC BY — attribution required (surfaced in the picker footer)

| File | Role | Title — Author | License | Source |
| --- | --- | --- | --- | --- |
| `seaside_waves.ogg` | ambient | Oceanwavescrushing — Luftrum | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:Oceanwavescrushing.ogg |
| `library_fireplace.ogg` | ambient | Fire of the forge crackling — Work With Sounds / La Fonderie | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:WWS_Fireoftheforge.ogg |
| `music_calm_bgm.ogg` | music | calm bgm — syncopika | CC BY 3.0 | https://opengameart.org/content/calm-bgm |
| `music_long_dark.ogg` | music | The Long Dark (Ambient Neoclassical Piano) — Scott Buckley | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Scott_Buckley_%E2%80%93_The_Long_Dark_%28Ambient_Neoclassical_Piano%29.ogg |

The credit text for these four is rendered under the backdrop picker in
`Settings & Stats` (`BackgroundPicker.tsx`). If a CC-BY file is removed, drop
its credit there too.

## Per-scene music mapping

| Backdrop | Music layer | Why |
| --- | --- | --- |
| Minimal Flowers / Blush Meadow / Rain on Glass | `music_chill_lofi.ogg` | jazzy one-take lo-fi piano |
| Wildflower Stems / Terracotta Field / Fireside Library | `music_calm_bgm.ogg` | warm piano & guitar |
| Nocturne Bloom / Ink Garden | `music_vampires_piano.ogg` | sparse dark piano |
| Snowfield Birches | `music_snowfall.ogg` | seamless winter piano waltz |
| Ridgelines | `music_long_dark.ogg` | expansive neoclassical |
| Seaside Horizon | `music_ocean.ogg` | ocean-themed PD piece |

## Transcodes

- `rain_window.m4a` / `snowfall_wind.m4a`: AAC via `afconvert` from the
  original WAVs (mono, ~5× smaller; loop points unchanged).
- All `music_*.ogg` files beyond the originals: re-encoded with a temporary
  static `ffmpeg` 7.1 build (`imageio-ffmpeg` wheel in `/tmp`) to Vorbis
  q≈4–5; non-looping sources got a 2.5–3 s end-over-begin fade so the repeat
  seam breathes instead of clicking. `music_snowfall.ogg` is the author's own
  seamless "Looped ver.".
- Two backdrops intentionally share a loop where the mood fits — the audio
  engine matches voices on file, so switching between them never restarts the
  track.

## Offline

Most paths are listed in `ASSETS_TO_CACHE` in `public/sw.js` and are therefore
precached. `seaside_waves.ogg` (2.8 MB) and `music_long_dark.ogg` (3.9 MB) are
deliberately **not** precached; the service worker's stale-while-revalidate
handler caches them on first playback, so they work offline from then on.

## Adding a loop

1. Drop the file in this folder (keep it small: a seamless loop, `ogg`/`mp3`
   preferred over `wav`; transcode big sources with ffmpeg — a temporary
   static build lives at `/tmp/pylibs/imageio_ffmpeg/binaries/`).
2. Reference it from a backdrop option: `audio: { src: '/themes/audio/<file>',
   volume: 0.14 }` (or `music: { … }` for the layered track) and add the path
   to `ASSETS_TO_CACHE` in `public/sw.js` unless it's large.
3. If the license is anything other than CC0/PD, record the exact credit text
   here **and** surface it in the `BackgroundPicker.tsx` footer.

Licensing rules for this project: prefer CC0; CC-BY is acceptable only with its
credit reproduced in-app; avoid CC-BY-NC and marketplaces whose terms forbid
redistribution inside a shipped bundle (Pixabay, Mixkit, Zapsplat). Freesound
links are hotlink-gated (serve HTML) — unusable here. Full sourcing notes:
`research/01-audio-assets.md`.
