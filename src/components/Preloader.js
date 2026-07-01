'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Preloader() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Play animation then hide
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2800); // 2.8s total loading experience

    return () => clearTimeout(timer);
  }, []);

  // An elegant SVG path resembling a fast handwritten "G" and swoop
  const signaturePath = "M 30,70 C 10,70 10,30 30,30 C 50,30 60,50 40,70 C 20,90 10,100 30,100 C 60,100 80,60 90,60 C 100,60 110,70 120,60 C 130,50 140,50 150,60 C 160,70 170,80 190,60 M 30,110 C 100,110 150,110 250,100";

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            y: '-100%',
            transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } 
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#080706',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {/* Animated Signature SVG */}
          <svg width="300" height="150" viewBox="0 0 300 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <motion.path
              d={signaturePath}
              stroke="#C9E265"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { duration: 1.5, ease: "easeInOut", delay: 0.2 },
                opacity: { duration: 0.1 }
              }}
            />
          </svg>

          {/* Fading in the real text slightly after the squiggle starts */}
          <motion.div
            initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 1, delay: 1.2, ease: "easeOut" }}
            style={{
              position: 'absolute',
              color: '#FAFAFA',
              fontSize: '2rem',
              letterSpacing: '0.15em',
              fontWeight: 300,
              textTransform: 'uppercase',
              marginTop: '40px'
            }}
          >
            Glory
          </motion.div>

          {/* Loading Progress Bar */}
          <div style={{
            position: 'absolute',
            bottom: '40px',
            width: '200px',
            height: '2px',
            background: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
            borderRadius: '2px'
          }}>
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.2, ease: "circOut" }}
              style={{
                height: '100%',
                background: '#C9E265'
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
