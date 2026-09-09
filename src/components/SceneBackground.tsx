import React from 'react';
import { useAmbience } from '../context/AmbienceContext';

/**
 * Full-viewport background layer for the active Scene. Mount it inside any
 * view (app shell, focus fullscreen, clock) — it reads the active scene from
 * context and renders nothing when ambience is disabled.
 */
export const SceneBackground: React.FC<{ variant?: 'app' | 'focus' | 'clock' }> = ({
  variant = 'app',
}) => {
  const { scene, enabled } = useAmbience();
  if (!enabled || !scene) return null;

  const scrim =
    variant === 'focus'
      ? 'bg-black/55'
      : variant === 'clock'
        ? 'bg-black/45'
        : 'bg-black/40';

  const style =
    scene.background.type === 'image'
      ? { backgroundImage: `url(${scene.background.value})` }
      : { backgroundImage: scene.background.value };

  return (
    <div className="fixed inset-0 -z-10" aria-hidden="true">
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 motion-reduce:transition-none"
        style={style}
      />
      <div className={`absolute inset-0 ${scrim}`} />
    </div>
  );
};
