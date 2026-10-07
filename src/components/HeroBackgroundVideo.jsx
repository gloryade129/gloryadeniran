'use client';

import { useRef, useState, useEffect } from 'react';

export default function HeroBackgroundVideo() {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    // Attempt automatic playback
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }

    // Respect reduced motion preference if active
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
      {/* Background HTML5 Video — Evident, Sharp, High Contrast & High Performance */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/videos/hero-bg-poster.jpg"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: 0.92,
        }}
      >
        <source src="/videos/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Subtle Google Scrim — Leaves video crisp and visible while ensuring text contrast */}
      <div
        className="hero-video-scrim"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: 'var(--video-scrim-dark, linear-gradient(180deg, rgba(10, 14, 23, 0.18) 0%, rgba(10, 14, 23, 0.38) 55%, var(--bg) 100%))',
        }}
      />

      {/* Seamless bottom transition */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100px',
          background: 'linear-gradient(to bottom, transparent, var(--bg))',
          pointerEvents: 'none',
        }}
      />

      {/* Google-Style Motion Toggle Chip */}
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
            padding: '6px 14px',
            borderRadius: '9999px',
            background: 'var(--chip-bg, rgba(255, 255, 255, 0.08))',
            border: '1px solid var(--chip-border, rgba(255, 255, 255, 0.14))',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: 'var(--gray-1, #CBD5E1)',
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
            e.currentTarget.style.color = 'var(--gray-1, #CBD5E1)';
            e.currentTarget.style.borderColor = 'var(--chip-border, rgba(255, 255, 255, 0.14))';
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
