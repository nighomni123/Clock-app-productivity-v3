/**
 * Backdrop picker: thumbnail grid (full) or scroller (`compact`) plus the
 * ambient-sound toggle and level slider.
 *
 * Reused unchanged by the Settings tab and the fullscreen-focus quick switcher,
 * which is why it takes a controller rather than reaching for context. Thumbnail
 * PNGs are generated offscreen and cached (see `thumbnails.ts`); until they
 * resolve, each tile falls back to its registry `swatch` gradient so the grid
 * never reflows or flashes.
 */
import React, { useEffect, useState } from 'react';
import { Check, Sparkles, Volume2, VolumeX } from 'lucide-react';
import {
  FOCUS_BACKGROUND_OPTIONS,
  NONE_BACKGROUND_ID,
  type FocusBackgroundOption,
} from './backgroundConfig';
import { getFocusThumbnails, type ThumbnailMap } from './thumbnails';
import type { FocusBackgroundController } from './useFocusBackground';

const NONE_SWATCH = 'linear-gradient(160deg, #18181b 0%, #27272a 100%)';

interface Tile {
  id: string;
  label: string;
  mood: string;
  swatch: string;
}

const buildTiles = (): Tile[] => [
  { id: NONE_BACKGROUND_ID, label: 'No Backdrop', mood: 'Plain dark mode', swatch: NONE_SWATCH },
  ...FOCUS_BACKGROUND_OPTIONS.map((option: FocusBackgroundOption) => ({
    id: option.id,
    label: option.label,
    mood: option.mood,
    swatch: option.swatch,
  })),
];

interface BackgroundPickerProps {
  controller: FocusBackgroundController;
  /** Horizontal scroller sized for the fullscreen-focus popover. */
  compact?: boolean;
}

export const BackgroundPicker: React.FC<BackgroundPickerProps> = ({
  controller,
  compact = false,
}) => {
  const [thumbs, setThumbs] = useState<ThumbnailMap>({});
  const tiles = buildTiles();
  const selectedOption = controller.option;
  const selectedLabel =
    tiles.find((tile) => tile.id === controller.id)?.label ?? 'No Backdrop';

  // Lazy by design: p5 is only fetched once this component actually mounts
  // (i.e. the user opened the picker or a focus backdrop exists).
  useEffect(() => {
    let cancelled = false;
    getFocusThumbnails()
      .then((map) => {
        if (!cancelled) setThumbs(map);
      })
      .catch(() => {
        /* swatches already cover this */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pick = (id: string) => controller.setId(id);

  const tileImage = (tile: Tile): string | undefined => {
    const src = thumbs[tile.id];
    if (!src) return undefined;
    return src.startsWith('data:') || src.startsWith('/') ? src : undefined;
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Focus backdrops">
          {tiles.map((tile) => {
            const selected = tile.id === controller.id;
            const image = tileImage(tile);
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => pick(tile.id)}
                aria-pressed={selected}
                aria-label={tile.label}
                title={tile.label}
                className={`min-h-[44px] rounded-2xl border p-1 text-left transition ${
                  selected
                    ? 'border-zinc-300 ring-2 ring-zinc-400/60'
                    : 'border-zinc-800/80 hover:border-zinc-600'
                }`}
              >
                <span
                  className="block h-11 w-full rounded-xl bg-cover bg-[center_72%]"
                  style={image ? { backgroundImage: `url("${image}")` } : { backgroundImage: tile.swatch }}
                />
                <span className="mt-1 block px-0.5 pb-0.5 text-[10px] leading-tight text-zinc-300">
                  {tile.label}
                </span>
              </button>
            );
          })}
        </div>
        <AudioControls controller={controller} selectedLabel={selectedLabel} selectedOption={selectedOption} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Focus backdrops">
        {tiles.map((tile) => {
          const selected = tile.id === controller.id;
          const image = tileImage(tile);
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => pick(tile.id)}
              aria-pressed={selected}
              className={`group relative overflow-hidden rounded-3xl border p-2 text-left min-h-[44px] transition ${
                selected
                  ? 'border-zinc-300 ring-2 ring-zinc-400/50'
                  : 'border-zinc-800/80 bg-zinc-900/55 backdrop-blur-sm hover:border-zinc-600'
              }`}
            >
              <span
                className="block h-20 w-full rounded-2xl bg-cover bg-[center_72%]"
                style={image ? { backgroundImage: `url("${image}")` } : { backgroundImage: tile.swatch }}
              />
              <span className="mt-2 block px-1 pb-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-100">{tile.label}</span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-zinc-200" />}
                </span>
                <span className="block text-xs text-zinc-400">{tile.mood}</span>
              </span>
            </button>
          );
        })}
      </div>
      <AudioControls controller={controller} selectedLabel={selectedLabel} selectedOption={selectedOption} />
    </div>
  );
};

/** Shared tail of both layouts: ambient on/off plus the level slider. */
const AudioControls: React.FC<{
  controller: FocusBackgroundController;
  selectedLabel: string;
  selectedOption: FocusBackgroundOption | null;
}> = ({ controller, selectedLabel, selectedOption }) => {
  const hasAudio = Boolean(selectedOption?.audio);
  const percent = Math.round(controller.volume * 100);

  return (
    <div className="rounded-2xl border border-zinc-800/70 bg-black/30 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
          <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
          Ambient sound
        </span>
        <button
          type="button"
          onClick={controller.toggleAudio}
          aria-pressed={controller.audioEnabled}
          disabled={!hasAudio}
          className={`rounded-full px-3 py-1 min-h-[28px] text-[11px] font-medium transition disabled:opacity-40 ${
            controller.audioEnabled && hasAudio
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'
          }`}
        >
          {hasAudio ? (controller.audioEnabled ? 'On' : 'Off') : 'None'}
        </button>
      </div>

      {!hasAudio ? (
        <p className="text-[11px] text-zinc-500">
          {selectedLabel} has no paired audio. Pick a backdrop to hear its ambient loop.
        </p>
      ) : (
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              {controller.volume === 0 || !controller.audioEnabled ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
              Ambient volume
            </span>
            <span className="tabular-nums">{percent}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={controller.volume}
            onChange={(event) => controller.setVolume(Number(event.target.value))}
            className="w-full accent-zinc-400"
            aria-label="Ambient volume"
          />
          {!controller.active && (
            <p className="mt-1 text-[11px] text-zinc-500">
              Plays automatically while a focus block is running.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BackgroundPicker;
