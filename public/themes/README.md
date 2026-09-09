# Themes / Scenes assets

This folder holds the real artwork and audio loops for the "Scenes" feature.
The app ships with **placeholder** scenes (CSS gradients + runtime-synthesized
ambient audio), so it runs with zero binary assets. To upgrade a scene to real
art/audio, drop files here and edit the matching entry in `src/lib/scenes.ts`:

```ts
// src/lib/scenes.ts
{
  id: 'quiet-meadow',
  // ...
  background: { type: 'image', value: '/themes/images/meadow.webp' },
  audio:      { kind: 'file',  src: '/themes/audio/meadow.ogg' },
}
```

## Guidelines
- **Images:** optimized WebP, ~200–400 KB, any aspect (rendered with
  `bg-cover bg-center`). Use original "Painted Worlds" art — no third-party IP.
- **Audio:** seamless loops in OGG / MP3 / WAV, referenced from
  `src/lib/scenes.ts`. Royalty-free sources: OpenGameArt (CC0/CC-BY),
  Wikimedia Commons (CC0/CC-BY), Freesound (CC0). **Licensing is tracked in
  `audio/ATTRIBUTIONS.md` — read it before adding or removing a loop.** No
  Pixabay / Mixkit / Zapsplat assets (their "no standalone redistribution"
  clause is incompatible with bundling the files in the app).
- Paths are same-origin (`/themes/...`), so they are cached by the service
  worker on first use and work offline afterwards.

### Current audio loops (all royalty-free)
| File | Scene(s) | License |
|------|----------|---------|
| `rain_window.wav` | Rainy Window | CC0 |
| `meadow_wind.ogg` | Quiet Meadow | CC-BY 3.0 |
| `forest_ambience.mp3` | Forest Grove | CC0 |
| `library_fireplace.ogg` | Cozy Library | CC-BY 4.0 |
| `snowfall_wind.wav` | Snowfall at Dusk | CC0 |
| `seaside_waves.ogg` | Seaside Cliff | CC-BY 3.0 |
| `music_lofi.mp3` | Lo-Fi Lounge | CC0 |
| `music_piano.wav` | Neo-Classical Piano | CC0 |
| `music_ambient_drift.ogg` | Ambient Drift | CC0 |
| `music_deep_focus.ogg` | Deep Focus | CC0 |
| `music_midnight.ogg` | Midnight Drift | CC0 |

To add a scene, drop a loop here, add the `Scene` entry in `src/lib/scenes.ts`,
and (if CC-BY) add the credit to `audio/ATTRIBUTIONS.md`.

Folder layout:
- `images/` — scene background images
- `audio/` — ambient loops + `ATTRIBUTIONS.md`
