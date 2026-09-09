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
- **Audio:** seamless loops in OGG (and/or MP3), 30–60 s, ~500 KB–1 MB.
  Royalty-free sources: Freesound (CC0), Zapsplat, Pixabay.
- Paths are same-origin (`/themes/...`), so they are cached by the service
  worker on first use and work offline afterwards.

Folder layout:
- `images/` — scene background images
- `audio/` — ambient loops
