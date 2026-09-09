# Audio Attribution & Licenses

All loops in this folder are **royalty-free / free-to-use** and safe to bundle in a
shipped web app. They were sourced via the deep-research pass in
`research/01-audio-assets.md`. Preference was given to **CC0 (public domain)**
assets; the few **CC-BY** assets below require the credit shown. No Pixabay /
Mixkit / Zapsplat assets (which carry "no standalone redistribution" clauses)
were used.

Files are referenced from `src/lib/scenes.ts`. The app's audio engine
(`src/lib/ambientAudio.ts`) loops them seamlessly via `<audio loop>`.

## CC0 — public domain, no attribution required

| File | Title | Author | Source |
|------|-------|--------|--------|
| `rain_window.wav` | Rain on Window Loop | (OpenGameArt uploader, CC0) | https://opengameart.org/content/rain-on-window-loop |
| `snowfall_wind.wav` | wind1 | Luke.RUSTLTD | https://opengameart.org/content/wind1 |
| `forest_ambience.mp3` | Forest Ambience | TinyWorlds | https://opengameart.org/content/forest-ambience |
| `music_ambient_drift.ogg` | Heavenly Loop | isaiah658 | https://opengameart.org/content/heavenly-loop |
| `music_deep_focus.ogg` | Ambient Relaxing Loop | isaiah658 | https://opengameart.org/content/ambient-relaxing-loop |
| `music_lofi.mp3` | Calm Loop | wipics | https://opengameart.org/content/calm-loop |
| `music_piano.wav` | Emotional Piano Loop | extenz | https://opengameart.org/content/emotional-piano-loop |
| `music_midnight.ogg` | Project Utopia (seamless loop) | congusbongus (Cong Xu) | https://opengameart.org/content/project-utopia-seamless-loop |

License: [CC0 1.0 Universal](http://creativecommons.org/publicdomain/zero/1.0/).
Attribution is **not** required, but crediting the authors above is appreciated.

## CC-BY — attribution required

These files legally require the following credit in the app (e.g. a "Credits"
/ "Acknowledgements" screen or this file's contents surfaced in-app):

| File | Title | Author | License | Source |
|------|-------|--------|---------|--------|
| `meadow_wind.ogg` | Wind Loop | InspectorJ (Jonathan Shaw) | [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/) | https://opengameart.org/content/wind-loop (orig. https://freesound.org/people/InspectorJ/sounds/376415/) |
| `library_fireplace.ogg` | Fire of the forge crackling | Work With Sounds / La Fonderie | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | https://commons.wikimedia.org/wiki/File:WWS_Fireoftheforge.ogg |
| `seaside_waves.ogg` | Oceanwavescrushing | Luftrum (via Freesound, mirrored on Wikimedia Commons) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) | https://commons.wikimedia.org/wiki/File:Oceanwavescrushing.ogg |

### Required credit text (CC-BY)

> Wind Loop by InspectorJ (Jonathan Shaw), used under CC BY 3.0 —
> https://opengameart.org/content/wind-loop
>
> Fire of the forge crackling by Work With Sounds / La Fonderie, used under
> CC BY 4.0 — https://commons.wikimedia.org/wiki/File:WWS_Fireoftheforge.ogg
>
> Oceanwavescrushing by Luftrum, used under CC BY 3.0 —
> https://commons.wikimedia.org/wiki/File:Oceanwavescrushing.ogg

## Notes

- All files are seamless/loopable by design (per source descriptions). The app
  loops via `el.loop = true`; if any seam is audible, lower the scene volume or
  apply a short crossfade in `ambientAudio.ts`.
- `*.wav` files were downsampled to mono 22.05 kHz with Python's `wave` module
  to keep the repo lean (no `ffmpeg` available to produce OGG/MP3). They remain
  fully functional in browsers. Re-encode to OGG for further size savings when
  `ffmpeg` is available.
- For full provenance, methodology, and the rejected alternatives, see
  `research/01-audio-assets.md`.
