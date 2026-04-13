import { useCallback, useRef } from 'react';

export const SOUNDS = {
  PLACE_COIN: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  SEQUENCE_COMPLETED: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  VICTORY: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
} as const;

export type SoundType = keyof typeof SOUNDS;

export function useSound() {
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const playSound = useCallback((type: SoundType) => {
    try {
      if (!audioRefs.current[type]) {
        audioRefs.current[type] = new Audio(SOUNDS[type]);
      }
      
      const audio = audioRefs.current[type];
      audio.currentTime = 0;
      audio.play().catch(error => {
        console.warn(`Audio playback failed for ${type}:`, error);
      });
    } catch (error) {
      console.error('Sound system error:', error);
    }
  }, []);

  return { playSound };
}
