import React from 'react';
import { Check } from 'lucide-react';
import { SCENES, NONE_SCENE_ID } from '../lib/scenes';
import { useAmbience } from '../context/AmbienceContext';

interface GalleryItem {
  id: string;
  name: string;
  mood: string;
  grad: string;
}

const buildItems = (): GalleryItem[] => [
  {
    id: NONE_SCENE_ID,
    name: 'No Scene',
    mood: 'Plain dark mode',
    grad: 'linear-gradient(160deg, #18181b 0%, #27272a 100%)',
  },
  ...SCENES.map((s) => ({
    id: s.id,
    name: s.name,
    mood: s.mood,
    grad: s.thumbnailGradient,
  })),
];

export const SceneGallery: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { scene, enabled, setSceneId } = useAmbience();
  const activeId = enabled ? scene?.id ?? NONE_SCENE_ID : NONE_SCENE_ID;
  const items = buildItems();

  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 max-w-[80vw]">
        {items.map((it) => {
          const selected = it.id === activeId;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setSceneId(it.id)}
              aria-pressed={selected}
              aria-label={it.name}
              className={`shrink-0 w-20 rounded-2xl border p-1 transition ${
                selected
                  ? 'border-zinc-300 ring-2 ring-zinc-400/60'
                  : 'border-zinc-800/80 hover:border-zinc-600'
              }`}
            >
              <div
                className="h-12 w-full rounded-xl"
                style={{ backgroundImage: it.grad, backgroundSize: 'cover' }}
              />
              <div className="mt-1 truncate text-[10px] text-zinc-300">{it.name}</div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((it) => {
        const selected = it.id === activeId;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => setSceneId(it.id)}
            aria-pressed={selected}
            className={`group relative overflow-hidden rounded-3xl border p-2 text-left transition ${
              selected
                ? 'border-zinc-300 ring-2 ring-zinc-400/50'
                : 'border-zinc-800/80 bg-zinc-900/55 backdrop-blur-sm hover:border-zinc-600'
            }`}
          >
            <div
              className="h-20 w-full rounded-2xl"
              style={{ backgroundImage: it.grad, backgroundSize: 'cover' }}
            />
            <div className="mt-2 px-1 pb-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-100">{it.name}</span>
                {selected && <Check className="h-4 w-4 text-zinc-200" />}
              </div>
              <p className="text-xs text-zinc-400">{it.mood}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
