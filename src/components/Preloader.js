'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Preloader() {
  const [loading, setLoading] = useState(true);
  const [hasVisited, setHasVisited] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    // Check if user already saw the preloader in this tab session
    try {
      const visited = sessionStorage.getItem('preloader-shown');
      if (visited) {
        setHasVisited(true);
        setLoading(false);
        return;
      }
    } catch (e) {
      // Ignore sessionStorage exceptions
    }

    // Detect theme for preloader surface
    const currentTheme = document.documentElement.getAttribute('data-theme') || 
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    setIsLightMode(currentTheme === 'light');

    // Prevent body scroll during initial reveal
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      setLoading(false);
      document.body.style.overflow = '';
      try {
        sessionStorage.setItem('preloader-shown', 'true');
      } catch (e) {}
    }, 1500);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, []);

  if (hasVisited) return null;

  // Google 4-dots brand palette (Royal blue, electric cyan, deep cobalt, sky cyan)
  const googleBrandDots = [
    { color: '#2563EB', glow: 'rgba(37, 99, 235, 0.45)', delay: 0 },
    { color: '#0091FF', glow: 'rgba(0, 145, 255, 0.45)', delay: 0.12 },
    { color: '#1D4ED8', glow: 'rgba(29, 78, 216, 0.45)', delay: 0.24 },
    { color: '#38BDF8', glow: 'rgba(56, 189, 248, 0.45)', delay: 0.36 },
  ];

  return (
    <AnimatePresence mode="wait">
      {loading && (
        <motion.div
          key="google-preloader"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 1.02,
            transition: { duration: 0.6, ease: [0.2, 0, 0, 1] } 
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: isLightMode ? '#F8FAFC' : '#0A0E17',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            pointerEvents: 'all'
          }}
        >
          {/* Subtle Google ambient radial spotlight */}
          <div 
            style={{
              position: 'absolute',
              width: '420px',
              height: '420px',
              background: isLightMode 
                ? 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(37, 99, 235, 0.16) 0%, transparent 70%)',
              filter: 'blur(70px)',
              pointerEvents: 'none',
            }} 
          />

          {/* Central Google-style loading cluster */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
              zIndex: 1
            }}
          >
            {/* Iconic Google 4-Dot Harmonic Bounce */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', height: '40px' }}>
              {googleBrandDots.map((dot, index) => (
                <motion.span
                  key={index}
                  animate={{
                    y: [-8, 8, -8],
                    scale: [1, 1.15, 1],
                  }}
                  transition={{
                    duration: 1.1,
                    repeat: Infinity,
                    ease: [0.4, 0, 0.2, 1],
                    delay: dot.delay,
                  }}
                  style={{
                    display: 'block',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: dot.color,
                    boxShadow: `0 4px 14px ${dot.glow}`,
                  }}
                />
              ))}
            </div>

            {/* Typography */}
            <div style={{ textAlign: 'center' }}>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.2, 0, 0, 1] }}
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: isLightMode ? '#0F172A' : '#F8FAFC',
                  fontFamily: 'var(--font, sans-serif)',
                  margin: 0,
                }}
              >
                Glory Adeniran
              </motion.h2>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '10px',
                  padding: '4px 14px',
                  borderRadius: '9999px',
                  background: isLightMode ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
                  border: isLightMode ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '10px',
                  fontFamily: 'var(--mono, monospace)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: isLightMode ? '#64748B' : '#94A3B8',
                }}
              >
                <span 
                  style={{ 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    backgroundColor: '#2563EB',
                    boxShadow: '0 0 6px #2563EB' 
                  }} 
                />
                Product Designer &amp; Vibe Coder
              </motion.div>
            </div>
          </motion.div>

          {/* Google Material Indeterminate Linear Progress Bar */}
          <div 
            style={{
              position: 'absolute',
              bottom: '48px',
              width: '180px',
              height: '3px',
              borderRadius: '9999px',
              background: isLightMode ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ x: '-100%', width: '40%' }}
              animate={{ 
                x: ['-100%', '200%'],
                width: ['30%', '60%', '30%']
              }}
              transition={{ 
                duration: 1.4, 
                repeat: Infinity, 
                ease: [0.4, 0, 0.2, 1] 
              }}
              style={{
                height: '100%',
                borderRadius: '9999px',
                background: 'linear-gradient(90deg, #2563EB, #0091FF, #38BDF8)',
                boxShadow: '0 0 8px rgba(37, 99, 235, 0.6)',
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
