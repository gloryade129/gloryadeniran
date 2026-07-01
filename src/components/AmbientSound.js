'use client';

import { useEffect, useRef } from 'react';

export default function AmbientSound() {
  const audioCtxRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const startAudio = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      // Master Gain (Volume)
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0; // start silent
      masterGain.connect(ctx.destination);

      // Fade in smoothly over 10 seconds
      masterGain.gain.setTargetAtTime(0.04, ctx.currentTime, 5); // very quiet, trustable background pad

      // Oscillator 1: Root Note (Deep calm)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = 110; // A2
      
      const gain1 = ctx.createGain();
      gain1.gain.value = 0.5;
      osc1.connect(gain1).connect(masterGain);
      osc1.start();

      // Oscillator 2: Perfect Fifth (Harmonic resonance)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 164.81; // E3
      
      const gain2 = ctx.createGain();
      gain2.gain.value = 0.3;
      osc2.connect(gain2).connect(masterGain);
      osc2.start();

      // Low Frequency Oscillator to create a breathing/pulsing effect
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.1; // 1 cycle every 10 seconds

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.1; // Amplitude modulation depth
      lfo.connect(lfoGain);

      // Connect LFO to modulate the master volume slightly
      lfoGain.connect(masterGain.gain);
      lfo.start();

      // Clean up event listeners since we only need to start it once
      document.removeEventListener('click', startAudio);
      document.removeEventListener('keydown', startAudio);
    };

    document.addEventListener('click', startAudio);
    document.addEventListener('keydown', startAudio);

    return () => {
      document.removeEventListener('click', startAudio);
      document.removeEventListener('keydown', startAudio);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return null; // Invisible component
}
