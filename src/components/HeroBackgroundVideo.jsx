'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import useNetworkQuality from '@/hooks/useNetworkQuality';

export default function HeroBackgroundVideo() {
  const videoRef = useRef(null);
  const progressBarRef = useRef(null);
  const network = useNetworkQuality();

  // Playback & Interaction States
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(22);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 35 });
  const [isHovered, setIsHovered] = useState(false);
  
  // Adaptive Network State
  const [userWantsVideo, setUserWantsVideo] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // If network is detected as weak / 2G / 3G / saveData, stay in Lite Mode unless explicitly requested
  const isLiteMode = network.isDetected && network.isSlowNetwork && !userWantsVideo;

  // Auto-play when video element is mounted and allowed
  useEffect(() => {
    if (!isLiteMode && videoRef.current) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isLiteMode]);

  // Update time tracker
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  // Google Flow: Scroll-Linked Synchronization
  useEffect(() => {
    let scrollTimeout;

    const handleScroll = () => {
      const heroHeight = window.innerHeight || 800;
      const currentScroll = window.scrollY;
      const progress = Math.min(Math.max(currentScroll / heroHeight, 0), 1);
      setScrollProgress(progress);
      setIsScrolling(true);

      // Accelerate playback slightly during active scroll (Google Flow experience)
      if (videoRef.current && isPlaying && !isLiteMode) {
        const dynamicRate = Math.min(playbackSpeed * 1.35, 2.5);
        videoRef.current.playbackRate = dynamicRate;
      }

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
        if (videoRef.current && isPlaying && !isLiteMode) {
          videoRef.current.playbackRate = playbackSpeed;
        }
      }, 180);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isPlaying, playbackSpeed, isLiteMode]);

  // Google Flow: Interactive Mouse Proximity Lighting
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x: Math.round(x), y: Math.round(y) });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Toggle Play / Pause
  const togglePlay = useCallback((e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Toggle Speed (1.0x -> 1.5x -> 2.0x -> 1.0x)
  const cycleSpeed = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!videoRef.current) return;

    let nextSpeed = 1.0;
    if (playbackSpeed === 1.0) nextSpeed = 1.5;
    else if (playbackSpeed === 1.5) nextSpeed = 2.0;
    else nextSpeed = 1.0;

    setPlaybackSpeed(nextSpeed);
    videoRef.current.playbackRate = nextSpeed;
  };

  // Interactive Timeline Scrub
  const handleScrub = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!progressBarRef.current || !videoRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = fraction * duration;

    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const formatTime = (secs) => {
    const s = Math.floor(secs % 60);
    const m = Math.floor(secs / 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressFraction = duration > 0 ? (currentTime / duration) * 100 : 0;

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
      {/* ── LITE MODE POSTER (INSTANT PAINT FOR WEAK NETWORKS / 49KB) ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          backgroundImage: 'url(/videos/hero-bg-poster.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: `scale(${1.02 + scrollProgress * 0.08}) translateY(${scrollProgress * 24}px)`,
          transition: 'transform 0.15s ease-out',
          opacity: isLiteMode ? 0.95 : videoLoaded ? 0 : 0.95,
          zIndex: 0,
        }}
      />

      {/* ── HIGH PERFORMANCE HTML5 VIDEO (STREAMED ONLY ON STRONG CONNECTION) ── */}
      {!isLiteMode && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/videos/hero-bg-poster.jpg"
          onTimeUpdate={handleTimeUpdate}
          onLoadedData={() => setVideoLoaded(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: 0.92,
            transform: `scale(${1.02 + scrollProgress * 0.08}) translateY(${scrollProgress * 24}px)`,
            transition: 'transform 0.15s ease-out, opacity 0.5s ease',
            zIndex: 1,
          }}
        >
          <source src="/videos/hero-bg.mp4" type="video/mp4" />
        </video>
      )}

      {/* Google Flow: Dynamic Interactive Cursor Lighting Scrim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(37, 99, 235, 0.14) 0%, transparent 55%)`,
          pointerEvents: 'none',
          transition: 'background 0.2s ease',
          zIndex: 2,
        }}
      />

      {/* Base Google Ambient Scrim */}
      <div
        className="hero-video-scrim"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: 'var(--video-scrim-dark, linear-gradient(180deg, rgba(10, 14, 23, 0.18) 0%, rgba(10, 14, 23, 0.38) 55%, var(--bg) 100%))',
          zIndex: 3,
        }}
      />

      {/* Bottom fade blending seamlessly into the next page section */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '120px',
          background: 'linear-gradient(to bottom, transparent, var(--bg))',
          pointerEvents: 'none',
          zIndex: 4,
        }}
      />

      {/* ── GOOGLE FLOW: INTERACTIVE FLOATING CONTROL DOCK ── */}
      <div
        style={{
          position: 'absolute',
          bottom: network.isMobile ? '84px' : '28px',
          right: network.isMobile ? '16px' : '36px',
          zIndex: 10,
          pointerEvents: 'auto',
          maxWidth: network.isMobile ? 'calc(100vw - 32px)' : 'none',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          animate={{ scale: isHovered ? 1.02 : 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: network.isMobile ? '8px' : '10px',
            padding: network.isMobile ? '6px 14px' : '7px 16px',
            borderRadius: '9999px',
            background: 'rgba(10, 14, 23, 0.82)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.06)',
            color: '#F8FAFC',
            fontFamily: 'var(--mono, monospace)',
            fontSize: network.isMobile ? '10px' : '11px',
            flexWrap: 'nowrap',
          }}
        >
          {isLiteMode ? (
            /* Lite Mode Badge & 1-Click Load Video Option */
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#38BDF8',
                  boxShadow: '0 0 8px #38BDF8',
                }}
              />
              <span style={{ color: '#94A3B8', fontSize: '10px' }}>
                LITE (DATA SAVER)
              </span>
              <button
                type="button"
                onClick={() => setUserWantsVideo(true)}
                title="Download and stream full background video"
                style={{
                  background: 'rgba(37, 99, 235, 0.25)',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  borderRadius: '9999px',
                  color: '#93C5FD',
                  padding: '3px 9px',
                  fontSize: '9.5px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
              >
                LOAD VIDEO ▷
              </button>
            </div>
          ) : (
            /* Full Google Flow Interactive Video Controls */
            <>
              {/* Play / Pause Toggle Button */}
              <button
                onClick={togglePlay}
                type="button"
                aria-label={isPlaying ? "Pause background video" : "Play background video"}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isPlaying ? '#38BDF8' : '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  padding: '2px',
                }}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              {/* Timeline Scrubber Bar */}
              <div
                ref={progressBarRef}
                onClick={handleScrub}
                title="Click to seek"
                style={{
                  width: network.isMobile ? '46px' : '75px',
                  height: '4px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  position: 'relative',
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${progressFraction}%`,
                    background: 'linear-gradient(90deg, #2563EB, #38BDF8)',
                    borderRadius: '9999px',
                    transition: 'width 0.1s linear',
                  }}
                />
              </div>

              {/* Time Display */}
              <span style={{ fontSize: '10px', color: '#94A3B8', minWidth: '28px' }}>
                {formatTime(currentTime)}
              </span>

              {/* Speed Toggle Pill (1.0x / 1.5x / 2.0x) */}
              <button
                onClick={cycleSpeed}
                type="button"
                title="Click to change playback speed"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '9999px',
                  padding: '2px 7px',
                  color: '#F8FAFC',
                  fontSize: '9.5px',
                  cursor: 'pointer',
                }}
              >
                {playbackSpeed.toFixed(1)}x
              </button>

              {/* Google Flow Synchronized Indicator Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  paddingLeft: '4px',
                  borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: isScrolling ? '#22C55E' : '#3B82F6',
                    boxShadow: isScrolling ? '0 0 8px #22C55E' : '0 0 6px #3B82F6',
                    transition: 'all 0.2s ease',
                  }}
                />
                <span style={{ fontSize: '9.5px', color: isScrolling ? '#86EFAC' : '#94A3B8' }}>
                  {isScrolling ? 'Syncing...' : 'Flow Synced'}
                </span>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
