'use client';

import { useState } from 'react';
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

export default function ProjectClient({ project }) {
  const [activeImage, setActiveImage] = useState(null);

  return (
    <>
      <div className="grain" aria-hidden="true" />

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
              <motion.h1 variants={fadeUp} className={styles.title}>
                {project.title}
              </motion.h1>
            </header>

            {/* Content Grid */}
            <div className={styles.grid}>
              
              {/* Left: Gallery & Main Image */}
              <div className={styles.galleryCol}>
                <motion.div 
                  variants={fadeUp} 
                  className={`${styles.mainImageWrap} card`}
                  onClick={() => setActiveImage(project.image)}
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
                      <span className={styles.zoomIcon}>🔍 Click to expand</span>
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
                          onClick={() => setActiveImage(imgUrl)}
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
                            <span className={styles.attachIcon}>📄</span>
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
        {activeImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.lightboxOverlay}
            onClick={() => setActiveImage(null)}
          >
            <button className={styles.lightboxClose} onClick={() => setActiveImage(null)}>✕</button>
            <div className={styles.lightboxImgContainer} onClick={(e) => e.stopPropagation()}>
              {isVideoUrl(activeImage) ? (
                <video
                  src={activeImage}
                  controls
                  autoPlay
                  className={styles.lightboxImg}
                  style={{ width: '100%', height: '100%', maxHeight: '85vh', objectFit: 'contain', background: 'transparent' }}
                />
              ) : (
                <Image 
                  src={activeImage} 
                  alt="" 
                  fill 
                  className={styles.lightboxImg}
                  unoptimized={activeImage.startsWith('https://images.unsplash.com')}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
