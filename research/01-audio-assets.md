# Royalty-Free Endless-Loop Audio for the Scenes Subsystem — Research & Sourcing

**Date:** 2025-09-09
**Author:** deep-research pass (4 parallel background subagents + verification)
**Scope:** Find, license-vet, and bundle royalty-free / free-to-use **seamless
looping audio** for the Focus Study Clock "Scenes" feature, accounting for the
six existing scenes (`src/lib/scenes.ts`) and the newly added background
creation functions (`InfiniteShaderBackground` shader + `AmbienceContext` /
`ambientAudio` engine).

---

## 1. Objective & constraints

The app's audio engine (`src/lib/ambientAudio.ts`) plays a single looping voice
via `<audio loop>` pointed at a same-origin URL under `public/themes/audio/`.
The existing `SCENES` catalog shipped with **runtime-synthesized** (`'synth'`)
noise only — no binary assets. The task was to upgrade to real, licensed,
endlessly-looping audio and make the files available in the project.

Hard constraints applied to every candidate:
- **Free to bundle in a shipped web app** — prefer **CC0 (public domain)** or
  clearly **CC-BY**. Avoid **non-commercial (CC-BY-NC)** and avoid
  **Pixabay / Mixkit / Zapsplat**, whose "no standalone redistribution" clauses
  are incompatible with embedding the files in the app bundle.
- **Direct, hotlink-friendly download URL** `curl` can fetch (no click-through,
  no auth). Preferred hosts: OpenGameArt (`opengameart.org`), Wikimedia Commons
  (`upload.wikimedia.org`), Freesound (CC0 only).
- **Verified, not guessed** — every URL was actually fetched and confirmed to
  return audio bytes before being accepted. No fabricated links.
- **Seamless / loopable** where possible, so the hard `el.loop = true` has no
  audible seam.

## 2. Methodology (deep-research fan-out)

Per the deep-research protocol, the objective was decomposed into 4 independent
research angles and executed by parallel background subagents:

| Subagent | Angle | Result |
|----------|-------|--------|
| 29 | Nature loops A — rain, ocean, wind/meadow | 6 verified candidates (OGA + Wikimedia) |
| 30 | Nature loops B — forest birds, night/crickets, library/indoor | 6 verified candidates |
| 31 | Music — lo-fi / chillhop / ambient electronic | 4 CC0 seamless loops (OGA) |
| 32 | Music — neo-classical piano / pads / drones | 3 CC0 seamless loops (OGA) |

Each subagent returned a structured mini-report (direct URL, format, exact
license, license URL, required attribution text, seamless-loop confidence,
duration). The parent (this pass) verified each chosen URL by downloading it
with `curl`, validated the bytes with `file`, and confirmed licensing.

> Note: the working tree already contained 5 of the 6 soundscape loops from a
> prior session (`rain_window.wav`, `snowfall_wind.wav`, `meadow_wind.ogg`,
> `forest_ambience.mp3`, `library_fireplace.ogg`) but `scenes.ts` still
> referenced `'synth'`, so they were unused. They were re-verified and kept; the
> missing `seaside_waves.ogg` was added.

## 3. Selected assets (final bundle)

All files live in `public/themes/audio/` and are wired in `src/lib/scenes.ts`.

### 3a. Scene soundscapes (one loop per existing scene)

| Scene | File | Title / Author | License | Source |
|-------|------|---------------|---------|--------|
| Rainy Window | `rain_window.wav` | Rain on Window Loop (CC0 uploader) | CC0 | opengameart.org/content/rain-on-window-loop |
| Quiet Meadow | `meadow_wind.ogg` | Wind Loop — InspectorJ (Jonathan Shaw) | **CC-BY 3.0** | opengameart.org/content/wind-loop |
| Forest Grove | `forest_ambience.mp3` | Forest Ambience — TinyWorlds | CC0 | opengameart.org/content/forest-ambience |
| Cozy Library | `library_fireplace.ogg` | Fire of the forge crackling — Work With Sounds / La Fonderie | **CC-BY 4.0** | commons.wikimedia.org/wiki/File:WWS_Fireoftheforge.ogg |
| Snowfall at Dusk | `snowfall_wind.wav` | wind1 — Luke.RUSTLTD | CC0 | opengameart.org/content/wind1 |
| Seaside Cliff | `seaside_waves.ogg` | Oceanwavescrushing — Luftrum | **CC-BY 3.0** | commons.wikimedia.org/wiki/File:Oceanwavescrushing.ogg |

### 3b. Royalty-free music scenes (new, selectable in the gallery)

| Scene | File | Title / Author | License | Source |
|-------|------|---------------|---------|--------|
| Lo-Fi Lounge | `music_lofi.mp3` | Calm Loop — wipics | CC0 | opengameart.org/content/calm-loop |
| Neo-Classical Piano | `music_piano.wav` | Emotional Piano Loop — extenz | CC0 | opengameart.org/content/emotional-piano-loop |
| Ambient Drift | `music_ambient_drift.ogg` | Heavenly Loop — isaiah658 | CC0 | opengameart.org/content/heavenly-loop |
| Deep Focus | `music_deep_focus.ogg` | Ambient Relaxing Loop — isaiah658 | CC0 | opengameart.org/content/ambient-relaxing-loop |
| Midnight Drift | `music_midnight.ogg` | Project Utopia (seamless loop) — congusbongus (Cong Xu) | CC0 | opengameart.org/content/project-utopia-seamless-loop |

**License summary:** 8 of 11 loops are **CC0** (no attribution required). The 3
**CC-BY** loops (meadow wind, library fireplace, seaside waves) require the
credit text recorded in `public/themes/audio/ATTRIBUTIONS.md`. All are
redistribution-safe for bundling.

## 4. Engineering notes & caveats

- **No `ffmpeg`/encoder in the environment**, so WAVs could not be transcoded to
  OGG/MP3. The three `*.wav` loops were instead downsampled in-place with
  Python's `wave` module (stereo→mono, 44.1 kHz→22.05 kHz) to keep the repo
  lean (~14 MB total for the 11 files). They remain fully functional in
  browsers. Re-encode to OGG for further savings when `ffmpeg` is available.
- **Wikimedia downloads were slow** (the ocean file is ~2.9 MB and throttled);
  resolved with `curl -C -` resume + extended timeouts in the background job.
- **Loop seam:** all sources are described as seamless/loopable. The engine does
  a hard loop; if any seam is audible at certain volumes, lower the scene
  volume or add a short crossfade in `ambientAudio.ts`.
- **Offline:** because the URLs are same-origin (`/themes/...`), the service
  worker caches them on first play and they work offline afterwards.

## 5. How to extend

1. Drop a new loop into `public/themes/audio/`.
2. Add a `Scene` entry in `src/lib/scenes.ts` (`audio: { kind: 'file', src: '/themes/audio/<file>' }`).
3. If the license is CC-BY, add the required credit to `audio/ATTRIBUTIONS.md`
   and surface it in an in-app Credits screen.
4. (Optional) add a matching `background: { type: 'image', value: '/themes/images/<id>.webp' }`
   per `public/themes/README.md`.

## 6. Sources

- OpenGameArt (CC0/CC-BY game audio, direct CDN download): https://opengameart.org/
- Wikimedia Commons (CC0/CC-BY recordings, direct `upload.wikimedia.org`): https://commons.wikimedia.org/
- Creative Commons licenses: https://creativecommons.org/licenses/
- CC0 1.0: http://creativecommons.org/publicdomain/zero/1.0/
