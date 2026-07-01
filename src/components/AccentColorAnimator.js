'use client';

import { useEffect } from 'react';

export default function AccentColorAnimator() {
  useEffect(() => {
    let frameId;
    let startTime = Date.now();
    const duration = 12000; // 12-second full cycle (6s to morph, 6s to return)

    const updateAccent = () => {
      const elapsed = (Date.now() - startTime) % duration;
      const progress = elapsed / duration;
      
      // Smooth sine wave interpolation (0 to 1 to 0)
      const t = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5;

      const isDark = document.documentElement.classList.contains('dark') || 
                     (!document.documentElement.classList.contains('light') && 
                      window.matchMedia('(prefers-color-scheme: dark)').matches);

      let h, s, l, glowA, dimA;
      if (isDark) {
        // Dark theme: Electric Blue HSL(206, 100%, 50%) <-> Lemon HSL(72, 70%, 64%)
        h = 206 + (72 - 206) * t;
        s = 100 + (70 - 100) * t;
        l = 50 + (64 - 50) * t;
        glowA = 0.25;
        dimA = 0.12;
      } else {
        // Light theme: Accent Blue HSL(212, 100%, 38%) <-> Accent Green/Lemon HSL(72, 70%, 40%)
        h = 212 + (72 - 212) * t;
        s = 100 + (70 - 100) * t;
        l = 38 + (40 - 38) * t;
        glowA = 0.25;
        dimA = 0.10;
      }

      document.documentElement.style.setProperty('--lime', `hsl(${h}, ${s}%, ${l}%)`);
      document.documentElement.style.setProperty('--lime-glow', `hsla(${h}, ${s}%, ${l}%, ${glowA})`);
      document.documentElement.style.setProperty('--lime-dim', `hsla(${h}, ${s}%, ${l}%, ${dimA})`);

      frameId = requestAnimationFrame(updateAccent);
    };

    frameId = requestAnimationFrame(updateAccent);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return null;
}
