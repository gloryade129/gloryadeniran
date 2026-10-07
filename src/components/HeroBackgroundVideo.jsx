'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function HeroBackgroundVideo() {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  useEffect(() => {
    // Respect user's reduced-motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlayback = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div 
      className="hero-video-wrapper"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* Background HTML5 Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/videos/hero-bg-poster.jpg"
        onLoadedData={() => setIsVideoLoaded(true)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: isVideoLoaded ? 0.38 : 0,
          transition: 'opacity 1.2s cubic-bezier(0.2, 0, 0, 1)',
          transform: 'scale(1.04)',
        }}
      >
        <source src="/videos/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Google-Style Ambient Scrim (Dark & Light Mode Adaptive) */}
      <div
        className="hero-video-scrim"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          background: 'var(--video-scrim-dark, radial-gradient(ellipse at 50% 30%, rgba(10, 14, 23, 0.65) 0%, rgba(10, 14, 23, 0.90) 80%, #0A0E17 100%))',
        }}
      />

      {/* Bottom fade blending seamlessly into the next page section */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '160px',
          background: 'linear-gradient(to bottom, transparent, var(--bg))',
          pointerEvents: 'none',
        }}
      />

      {/* Google-Style Motion Toggle Chip (Floating Pill in Corner) */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '32px',
          zIndex: 10,
          pointerEvents: 'auto',
        }}
      >
        <button
          onClick={togglePlayback}
          type="button"
          aria-label={isPlaying ? "Pause background animation" : "Play background animation"}
          title={isPlaying ? "Pause background video" : "Play background video"}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '9999px',
            background: 'var(--chip-bg, rgba(255, 255, 255, 0.08))',
            border: '1px solid var(--chip-border, rgba(255, 255, 255, 0.12))',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: 'var(--gray-2, #94A3B8)',
            fontSize: '11px',
            fontFamily: 'var(--mono, monospace)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--lime)';
            e.currentTarget.style.borderColor = 'var(--lime)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--gray-2, #94A3B8)';
            e.currentTarget.style.borderColor = 'var(--chip-border, rgba(255, 255, 255, 0.12))';
          }}
        >
          <span 
            style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: isPlaying ? 'var(--lime, #3B82F6)' : 'var(--gray-3, #64748B)',
              boxShadow: isPlaying ? '0 0 6px var(--lime, #3B82F6)' : 'none'
            }} 
          />
          {isPlaying ? 'Motion ON' : 'Motion PAUSED'}
        </button>
      </div>
    </div>
  );
}
