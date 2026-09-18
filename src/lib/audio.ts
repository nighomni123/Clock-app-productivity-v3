import { CustomSound } from '../types';

const SOUNDS: Record<string, Array<{ frequency: number; delay: number; duration: number; type: OscillatorType }>> = {
  'Soft Bell': [
    { frequency: 523.25, delay: 0, duration: 1.6, type: 'sine' },
    { frequency: 659.25, delay: 0.1, duration: 1.5, type: 'sine' },
    { frequency: 783.99, delay: 0.2, duration: 1.4, type: 'sine' }
  ],
  'Temple Chime': [
    { frequency: 392, delay: 0, duration: 2.4, type: 'sine' },
    { frequency: 587.33, delay: 0.18, duration: 2.1, type: 'sine' },
    { frequency: 783.99, delay: 0.36, duration: 1.8, type: 'sine' }
  ],
  'Bright Ping': [
    { frequency: 880, delay: 0, duration: 0.7, type: 'sine' },
    { frequency: 1318.51, delay: 0.08, duration: 0.65, type: 'sine' }
  ],
  'Digital Pulse': [
    { frequency: 660, delay: 0, duration: 0.18, type: 'square' },
    { frequency: 880, delay: 0.25, duration: 0.18, type: 'square' },
    { frequency: 1100, delay: 0.5, duration: 0.25, type: 'square' }
  ],
  'Deep Gong': [
    { frequency: 146.83, delay: 0, duration: 2.8, type: 'sine' },
    { frequency: 220, delay: 0.08, duration: 2.4, type: 'sine' },
    { frequency: 293.66, delay: 0.18, duration: 2, type: 'sine' }
  ]
};

let sharedAudioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextClass();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
};

export const playSound = (soundName: string, volume = 0.55, customSounds?: CustomSound[]) => {
  try {
    // Check if it's a custom sound first
    const customSound = customSounds?.find(s => s.name === soundName);
    if (customSound && customSound.url) {
      playCustomSound(customSound.url, volume);
      return;
    }

    const context = getAudioContext();
    if (!context) return;
    const sequence = SOUNDS[soundName] || SOUNDS['Soft Bell'];
    const now = context.currentTime;
    const safeVolume = Math.min(1, Math.max(0, Number(volume) || 0));

    sequence.forEach((tone) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + tone.delay;
      const end = start + tone.duration;

      oscillator.type = tone.type;
      oscillator.frequency.setValueAtTime(tone.frequency, start);

      gain.gain.setValueAtTime(Math.max(0.0001, safeVolume * 0.25), start);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(start);
      oscillator.stop(end + 0.05);
    });
  } catch (error) {
    console.error('Unable to play audio chime:', error);
  }
};

// Play custom sound from URL (file or data URI)
const playCustomSound = (url: string, volume = 0.55) => {
  try {
    const audio = new Audio(url);
    audio.volume = Math.min(1, Math.max(0, Number(volume) || 0));
    audio.play().catch(err => {
      console.warn('Custom sound playback failed:', err);
    });
  } catch (error) {
    console.error('Unable to play custom sound:', error);
  }
};

export const SOUND_NAMES = Object.keys(SOUNDS);

/**
 * Add a custom sound to the available sounds
 */
export const addCustomSound = async (
  file: File,
  name: string
): Promise<CustomSound | null> => {
  try {
    // Convert file to base64 data URI for localStorage storage
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const customSound: CustomSound = {
      id: `custom_${Date.now()}`,
      name,
      url: dataUri,
      createdAt: Date.now()
    };

    return customSound;
  } catch (error) {
    console.error('Failed to add custom sound:', error);
    return null;
  }
};

/**
 * Get all available sound names including custom sounds
 */
export const getAllSoundNames = (customSounds?: CustomSound[]): string[] => {
  const builtIn = SOUND_NAMES;
  const custom = customSounds?.map(s => s.name) || [];
  return [...builtIn, ...custom];
};
