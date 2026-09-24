'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './project.module.css';
const isVideoUrl = (url) => {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.ogg');
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 320 : -320,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.25 },
      scale: { type: 'spring', stiffness: 300, damping: 25 },
    },
  },
  exit: (direction) => ({
    x: direction < 0 ? 320 : -320,
    opacity: 0,
    scale: 0.95,
    transition: {
      x: { type: 'spring', stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  }),
};

export default function ProjectClient({ project }) {
  const allMedia = [project.image, ...(project.images || [])].filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [direction, setDirection] = useState(1);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);
  const [toast, setToast] = useState('');

  // Synchronize deep links in URL
  const updateUrlParam = (index) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (index !== null && index >= 0) {
      url.searchParams.set('asset', (index + 1).toString());
    } else {
      url.searchParams.delete('asset');
    }
    window.history.replaceState({}, '', url.toString());
  };

  // Initial check for ?asset= query param
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const assetParam = params.get('asset');
    if (assetParam) {
      const parsed = parseInt(assetParam, 10) - 1;
      if (!isNaN(parsed) && parsed >= 0 && parsed < allMedia.length) {
        setActiveIndex(parsed);
      }
    }
  }, [allMedia.length]);

  const openLightbox = (index) => {
    setDirection(1);
    setActiveIndex(index);
    setZoomScale(1);
    setIsSlideshow(false);
    updateUrlParam(index);
  };

  const closeLightbox = () => {
    setActiveIndex(null);
    setZoomScale(1);
    setIsSlideshow(false);
    updateUrlParam(null);
  };

  const nextMedia = () => {
    setDirection(1);
    setActiveIndex((prev) => {
      const nextIdx = prev === null ? 0 : (prev + 1) % allMedia.length;
      updateUrlParam(nextIdx);
      return nextIdx;
    });
    setZoomScale(1);
  };

  const prevMedia = () => {
    setDirection(-1);
    setActiveIndex((prev) => {
      const prevIdx = prev === null ? 0 : (prev - 1 + allMedia.length) % allMedia.length;
      updateUrlParam(prevIdx);
      return prevIdx;
    });
    setZoomScale(1);
  };

  const zoomIn = () => {
    setZoomScale((prev) => Math.min(4, Math.round((prev + 0.5) * 10) / 10));
  };

  const zoomOut = () => {
    setZoomScale((prev) => Math.max(1, Math.round((prev - 0.5) * 10) / 10));
  };

  const resetZoom = () => {
    setZoomScale(1);
  };

  const toggleSlideshow = () => {
    setIsSlideshow((prev) => !prev);
  };

  const handleShare = async (e) => {
    if (e) e.stopPropagation();
    const currentIdx = activeIndex !== null ? activeIndex : 0;
    const shareUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/work/${project.id}?asset=${currentIdx + 1}`
      : `/work/${project.id}?asset=${currentIdx + 1}`;

    const shareData = {
      title: `${project.title} - Asset ${currentIdx + 1}`,
      text: `Check out this design asset from "${project.title}" by Glory Adeniran`,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Native share error, falling back to copy:', err);
        } else {
          return;
        }
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setToast('Asset link copied to clipboard!');
        setTimeout(() => setToast(''), 2800);
      } catch (err) {
        setToast('Failed to copy link.');
        setTimeout(() => setToast(''), 2800);
      }
    }
  };

  // Slideshow auto advance
  useEffect(() => {
    if (!isSlideshow || activeIndex === null) return;
    const interval = setInterval(() => {
      setDirection(1);
      setActiveIndex((prev) => {
        const nextIdx = prev === null ? 0 : (prev + 1) % allMedia.length;
        updateUrlParam(nextIdx);
        return nextIdx;
      });
      setZoomScale(1);
    }, 3500);
    return () => clearInterval(interval);
  }, [isSlideshow, activeIndex, allMedia.length]);

  // Keyboard navigation
  useEffect(() => {
    if (activeIndex === null) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextMedia();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevMedia();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsSlideshow((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, allMedia.length]);

  const handleWheel = (e) => {
    if (e.deltaY < 0) {
      setZoomScale((prev) => Math.min(4, Math.round((prev + 0.25) * 100) / 100));
    } else {
      setZoomScale((prev) => Math.max(1, Math.round((prev - 0.25) * 100) / 100));
    }
  };

  const handleTouchStart = (e) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const diffX = touchStartX - touchEndX;
    const minSwipeDistance = 45;
    if (diffX > minSwipeDistance) {
      nextMedia();
    } else if (diffX < -minSwipeDistance) {
      prevMedia();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const currentMedia = activeIndex !== null ? allMedia[activeIndex] : null;

  return (
    <>
      <div className="grain" aria-hidden="true" />

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={styles.toastNotification}
          >
            <span>✨ {toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <section className={styles.section}>
        <div className="container">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            
            {/* Nav Back */}
            <motion.div variants={fadeUp} className={styles.backNav}>
              <Link href="/work" className={styles.backBtn}>
                <span className={styles.backArrow}>←</span> BACK TO WORK
              </Link>
            </motion.div>

            {/* Title / Subheader */}
            <header className={styles.header}>
              <motion.p variants={fadeUp} className="eyebrow">
                <span className="eyebrow-bar" aria-hidden="true" />
                <span className="eyebrow-tag">[{project.subcategory.toUpperCase()}]</span>
                Project Overview
              </motion.p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <motion.h1 variants={fadeUp} className={styles.title}>
                  {project.title}
                </motion.h1>
                <motion.button 
                  variants={fadeUp} 
                  className={styles.projectShareBtn}
                  onClick={handleShare}
                  title="Share Project & Asset Link"
                >
                  <span style={{ fontSize: '14px' }}></span> SHARE PROJECT
                </motion.button>
              </div>
            </header>

            {/* Content Grid */}
            <div className={styles.grid}>
              
              {/* Left: Gallery & Main Image */}
              <div className={styles.galleryCol}>
                <motion.div 
                  variants={fadeUp} 
                  className={`${styles.mainImageWrap} card`}
                  onClick={() => openLightbox(0)}
                >
                  <div className={styles.imageInner}>
                    {isVideoUrl(project.image) ? (
                      <video
                        src={project.image}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        className={styles.mainImg}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Image
                        src={project.image}
                        alt={project.title}
                        fill
                        priority
                        className={styles.mainImg}
                        unoptimized={project.image.startsWith('https://images.unsplash.com')}
                      />
                    )}
                    <div className={styles.zoomOverlay}>
                      <span className={styles.zoomIcon}>Click to expand & preview</span>
                    </div>
                  </div>
                </motion.div>

                {/* Sub-gallery of flyers */}
                {(project.images && project.images.length > 0) && (
                  <motion.div variants={fadeUp} className={styles.subGallery}>
                    <p className="mono" style={{ fontSize: '11px', color: 'var(--gray-2)', width: '100%', marginBottom: '12px' }}>
                      PROJECT_GALLERY ({project.images.length + 1}_ASSETS)
                    </p>
                    <div className={styles.subGrid}>
                      {project.images.map((imgUrl, idx) => (
                        <div 
                          key={idx} 
                          className={`${styles.subImageWrap} card`}
                          onClick={() => openLightbox(idx + 1)}
                        >
                          {isVideoUrl(imgUrl) ? (
                            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                              <video
                                src={imgUrl}
                                muted
                                playsInline
                                preload="metadata"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', fontSize: '20px' }}>▶</div>
                            </div>
                          ) : (
                            <Image
                              src={imgUrl}
                              alt=""
                              fill
                              className={styles.subImg}
                              unoptimized={imgUrl.startsWith('https://images.unsplash.com')}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right: Info Sidebar */}
              <div className={styles.infoCol}>
                <motion.div variants={fadeUp} className={`${styles.infoCard} card`}>
                  <h3 className="mono" style={{ color: 'var(--lime)', fontSize: '13px', marginBottom: '16px' }}>METADATA</h3>
                  <div className={styles.metaRow}>
                    <span className="mono">ROLE</span>
                    <span>Lead Creative Designer</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className="mono">TIMELINE</span>
                    <span>2026 Edition</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className="mono">DISCIPLINE</span>
                    <span>{project.subcategory}</span>
                  </div>
                </motion.div>

                <motion.div variants={fadeUp} className={styles.storyWrap}>
                  <h2 className="mono" style={{ fontSize: '14px', color: 'var(--lime)', marginBottom: '16px' }}>PROJECT_STORY</h2>
                  <p className={styles.description}>
                    {project.description}
                  </p>
                  {project.details && (
                    <p className={styles.detailsText}>
                      {project.details}
                    </p>
                  )}
                </motion.div>

                {/* Attachments & Links */}
                {((project.links && project.links.length > 0) || project.link) && (
                  <motion.div variants={fadeUp} className={styles.linksSection}>
                    <h3 className="mono" style={{ fontSize: '13px', color: 'var(--lime)', marginBottom: '16px' }}>DOCUMENTS_&_LINKS</h3>
                    <div className={styles.linksGrid}>
                      {/* Main action link */}
                      {project.link && (
                        <a 
                          href={project.link} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="shiny-cta" 
                          style={{ textDecoration: 'none', display: 'block', textAlign: 'center', width: '100%', marginBottom: '12px' }}
                        >
                          <span>Visit Live Project &nbsp;→</span>
                        </a>
                      )}
                      
                      {/* Other uploaded resources */}
                      {project.links && project.links.map((lnk, idx) => (
                        <a 
                          key={idx} 
                          href={lnk.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className={`${styles.attachmentCard} card`}
                        >
                          <div className={styles.attachInfo}>
                            <span className={styles.attachIcon}></span>
                            <span className={styles.attachLabel}>{lnk.label}</span>
                          </div>
                          <span className={styles.attachArrow}>↗</span>
                        </a>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

            </div>

          </motion.div>
        </div>
      </section>

      {/* Lightbox Overlay */}
      <AnimatePresence>
        {activeIndex !== null && currentMedia && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.lightboxOverlay}
            onClick={closeLightbox}
          >
            {/* Top Toolbar */}
            <div className={styles.lightboxHeader} onClick={(e) => e.stopPropagation()}>
              <div className={styles.lightboxCounter}>
                <span className="mono">ASSET {String(activeIndex + 1).padStart(2, '0')} / {String(allMedia.length).padStart(2, '0')}</span>
              </div>

              {/* Zoom Controls */}
              <div className={styles.lightboxZoomControls}>
                <button 
                  className={styles.lightboxToolBtn} 
                  onClick={zoomOut} 
                  disabled={zoomScale <= 1}
                  title="Zoom Out (-)"
                >
                  −
                </button>
                <span className={`${styles.zoomValue} mono`}>{Math.round(zoomScale * 100)}%</span>
                <button 
                  className={styles.lightboxToolBtn} 
                  onClick={zoomIn} 
                  disabled={zoomScale >= 4}
                  title="Zoom In (+)"
                >
                  +
                </button>
                {zoomScale !== 1 && (
                  <button className={styles.lightboxResetBtn} onClick={resetZoom} title="Reset Zoom">
                    Reset
                  </button>
                )}
              </div>

              {/* Actions Right */}
              <div className={styles.lightboxActions}>
                <button 
                  className={styles.shareHeaderBtn}
                  onClick={handleShare}
                  title="Share Direct Asset Link"
                >
                  SHARE
                </button>
                <button 
                  className={`${styles.slideshowBtn} ${isSlideshow ? styles.slideshowActive : ''}`} 
                  onClick={toggleSlideshow}
                  title="Toggle Automatic Slideshow"
                >
                  {isSlideshow ? '⏸ PAUSE' : '▶ SLIDESHOW'}
                </button>
                <button className={styles.lightboxClose} onClick={closeLightbox} title="Close (Esc)">✕</button>
              </div>
            </div>

            {/* Left Nav Arrow */}
            {allMedia.length > 1 && (
              <button 
                className={`${styles.navBtn} ${styles.navBtnPrev}`} 
                onClick={(e) => { e.stopPropagation(); prevMedia(); }}
                title="Previous (Left Arrow)"
              >
                ‹
              </button>
            )}

            {/* Right Nav Arrow */}
            {allMedia.length > 1 && (
              <button 
                className={`${styles.navBtn} ${styles.navBtnNext}`} 
                onClick={(e) => { e.stopPropagation(); nextMedia(); }}
                title="Next (Right Arrow)"
              >
                ›
              </button>
            )}

            {/* Media Container */}
            <div 
              className={styles.lightboxImgContainer} 
              onClick={(e) => e.stopPropagation()}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onDoubleClick={() => setZoomScale((prev) => (prev > 1 ? 1 : 2.5))}
            >
              <AnimatePresence custom={direction} mode="wait">
                <motion.div
                  key={activeIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <motion.div
                    animate={{ scale: zoomScale }}
                    transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                    drag={zoomScale > 1}
                    dragConstraints={false}
                    dragElastic={0.12}
                    dragMomentum={true}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: zoomScale > 1 ? 'grab' : 'default',
                      touchAction: 'none',
                    }}
                  >
                    {isVideoUrl(currentMedia) ? (
                      <video
                        src={currentMedia}
                        controls
                        autoPlay
                        key={currentMedia}
                        className={styles.lightboxImg}
                        style={{ width: '100%', height: '100%', maxHeight: '80vh', objectFit: 'contain', background: 'transparent' }}
                      />
                    ) : (
                      <div style={{ position: 'relative', width: '100%', height: '80vh' }}>
                        <Image 
                          src={currentMedia} 
                          alt="" 
                          fill 
                          priority
                          className={styles.lightboxImg}
                          unoptimized={currentMedia.startsWith('https://images.unsplash.com')}
                        />
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
