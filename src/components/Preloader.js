'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Preloader() {
  const [loading, setLoading] = useState(true);
  const [hasVisited, setHasVisited] = useState(false);

  useEffect(() => {
    // Check if user has already seen the preloader in this session
    try {
      const visited = sessionStorage.getItem('preloader-shown');
      if (visited) {
        setHasVisited(true);
        setLoading(false);
        return;
      }
    } catch (e) {
      // Ignore sessionStorage errors
    }

    // Lock body scroll while loading
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      setLoading(false);
      document.body.style.overflow = '';
      try {
        sessionStorage.setItem('preloader-shown', 'true');
      } catch (e) {}
    }, 1400);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, []);

  // If already visited, render nothing to avoid any flash
  if (hasVisited) return null;

  // An elegant SVG path resembling a fast handwritten "G" and swoop
  const signaturePath = "M 30,70 C 10,70 10,30 30,30 C 50,30 60,50 40,70 C 20,90 10,100 30,100 C 60,100 80,60 90,60 C 100,60 110,70 120,60 C 130,50 140,50 150,60 C 160,70 170,80 190,60 M 30,110 C 100,110 150,110 250,100";

  return (
    <AnimatePresence mode="wait">
      {loading && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            y: '-100%',
            transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } 
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: '#080706',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            pointerEvents: 'all'
          }}
        >
          {/* Subtle background glow */}
          <div 
            style={{
              position: 'absolute',
              width: '350px',
              height: '350px',
              background: 'radial-gradient(circle, rgba(0, 145, 255, 0.12) 0%, transparent 70%)',
              filter: 'blur(60px)',
              pointerEvents: 'none',
            }} 
          />

          {/* Animated Signature SVG */}
          <svg width="280" height="140" viewBox="0 0 300 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <motion.path
              d={signaturePath}
              stroke="var(--lime, #0091FF)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { duration: 0.85, ease: "easeInOut", delay: 0.1 },
                opacity: { duration: 0.15 }
              }}
            />
          </svg>

          {/* Fading in the name */}
          <motion.div
            initial={{ opacity: 0, filter: 'blur(8px)', y: 8 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
            style={{
              color: '#FAFAFA',
              fontSize: '1.25rem',
              letterSpacing: '0.25em',
              fontWeight: 500,
              textTransform: 'uppercase',
              fontFamily: 'var(--font, sans-serif)',
              marginTop: '16px'
            }}
          >
            Glory Adeniran
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ duration: 0.4, delay: 0.7 }}
            style={{
              fontFamily: 'var(--mono, monospace)',
              fontSize: '10px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--gray-2, #9A9994)',
              marginTop: '6px'
            }}
          >
            Product Designer &amp; Vibe Coder
          </motion.div>

          {/* Loading Progress Bar */}
          <div style={{
            position: 'absolute',
            bottom: '40px',
            width: '160px',
            height: '2px',
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}>
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              style={{
                height: '100%',
                background: 'var(--lime, #0091FF)'
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
