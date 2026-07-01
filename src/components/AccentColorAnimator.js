'use client';

import { useEffect } from 'react';

export default function AccentColorAnimator() {
  useEffect(() => {
    let timeoutId;
    let isBlue = true;

    const switchColor = () => {
      isBlue = !isBlue;

      // Jump instantly between Blue HSL(206, 100%, 50%) and Lemon HSL(72, 70%, 64%)
      const h = isBlue ? 206 : 72;
      const s = isBlue ? 100 : 70;
      const l = isBlue ? 50 : 64;
      const glowA = 0.25;
      const dimA = 0.12;

      document.documentElement.style.setProperty('--lime', `hsl(${h}, ${s}%, ${l}%)`);
      document.documentElement.style.setProperty('--lime-glow', `hsla(${h}, ${s}%, ${l}%, ${glowA})`);
      document.documentElement.style.setProperty('--lime-dim', `hsla(${h}, ${s}%, ${l}%, ${dimA})`);

      // Set random interval between 4 to 8 seconds for the next switch
      const nextDelay = 4000 + Math.random() * 4000;
      timeoutId = setTimeout(switchColor, nextDelay);
    };

    // First switch delay
    const initialDelay = 4000 + Math.random() * 4000;
    timeoutId = setTimeout(switchColor, initialDelay);

    return () => clearTimeout(timeoutId);
  }, []);

  return null;
}
