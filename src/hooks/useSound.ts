import { useCallback, useRef } from 'react';

export type SoundType = 'PLACE_COIN' | 'SEQUENCE_COMPLETED' | 'VICTORY';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3; // Soothing, ambient volume
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, startTimeOffset = 0) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.value = freq;
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    const startTime = this.ctx.currentTime + startTimeOffset;
    
    // Envelope for a smooth "bell/marimba" sound
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(1, startTime + Math.min(0.05, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  play(type: SoundType) {
    try {
      this.init();
      switch (type) {
        case 'PLACE_COIN':
          // Soft "plop" or "blip"
          this.playTone(600, 'sine', 0.15, 0);
          this.playTone(800, 'sine', 0.1, 0.05);
          break;
        case 'SEQUENCE_COMPLETED':
          // Magical rising arpeggio (C Major 7) for a 'soothing' reward
          [261.63, 329.63, 392.00, 493.88, 523.25].forEach((freq, i) => {
            this.playTone(freq, 'sine', 0.6, i * 0.1);
          });
          break;
        case 'VICTORY':
          // Triumphant soothing bell chords
          [261.63, 329.63, 392.00].forEach(f => this.playTone(f, 'sine', 0.5, 0)); // C Maj
          [349.23, 440.00, 523.25].forEach(f => this.playTone(f, 'sine', 0.5, 0.3)); // F Maj
          [261.63, 329.63, 392.00, 523.25, 659.25].forEach(f => this.playTone(f, 'sine', 2.0, 0.6)); // C Maj extended
          break;
      }
    } catch (e) {
      console.warn("Audio synthesis blocked or failed:", e);
    }
  }
}

export function useSound() {
  const engineRef = useRef<SoundEngine | null>(null);

  const playSound = useCallback((type: SoundType) => {
    if (!engineRef.current) {
      engineRef.current = new SoundEngine();
    }
    engineRef.current.play(type);
  }, []);

  return { playSound };
}
