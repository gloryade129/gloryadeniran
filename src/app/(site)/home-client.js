'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import HeroBackgroundVideo from '@/components/HeroBackgroundVideo';
import { TextRotate } from '@/components/TextRotate';
import styles from './home.module.css';

const isVideoUrl = (url) => {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.ogg');
};

const HoverVideo = ({ src, className }) => {
  const videoRef = useRef(null);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.warn('Video play failed:', e));
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      muted
      playsInline
      loop
      preload="metadata"
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );
};

// Google Material Motion curves
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.2, 0, 0, 1] } }
};

const slideUpLine = {
  hidden: { y: '100%' },
  show:   { y: 0, transition: { duration: 0.8, ease: [0.2, 0, 0, 1] } }
};

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1 } }
};

export default function HomeClient({ initialProjects = {}, initialSettings = {} }) {
  const projectsData = initialProjects;
  const settingsData = initialSettings;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const categoriesList = settingsData.categories || [
    { key: 'graphic_design',  label: 'Graphic Design',  tag: '01', sub: 'Logo · Flyers · Print · Branding' },
    { key: 'website_design',  label: 'Website Design',  tag: '02', sub: 'Shopify · WordPress · Wix' },
    { key: 'apps',            label: 'Apps',             tag: '03', sub: 'Mobile UI/UX · Prototyping' },
    { key: 'vibe_coding',     label: 'Vibe Coding',     tag: '04', sub: 'Next.js · React · Three.js' },
  ];

  const allProjects = categoriesList
    .flatMap(cat => projectsData[cat.key] || [])
    .slice(0, 4);

  return (
    <>
      <div className="grain" aria-hidden="true" />

      {/* ── HERO SECTION ── */}
      <section className={styles.hero}>
        {/* Google-Style Ambient Hero Video Background */}
        <HeroBackgroundVideo />

        {/* Subtle Watermark Background Title */}
        <div className={styles.bgTitle} aria-hidden="true">
          GLORY<br />ADENIRAN
        </div>

        <div className={styles.heroInner}>
          {/* LEFT — Text content */}
          <motion.div
            className={styles.heroText}
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            {/* Google Pill Eyebrow Chip */}
            <motion.div variants={fadeUp} className={styles.eyebrowChip}>
              <span className={styles.pulseDot} aria-hidden="true" />
              <span className={styles.eyebrowTag}>[01]</span>
              <span>{settingsData.profile.title} · 2026</span>
            </motion.div>

            <h1 className={styles.headline}>
              <div className={styles.lineClip}>
                <motion.span variants={slideUpLine}>{settingsData.hero.headline_1}</motion.span>
              </div>
              <div className={styles.lineClip}>
                <motion.div variants={slideUpLine} className={styles.rotateWrap}>
                  <TextRotate
                    texts={settingsData.hero.rotate_1}
                    staggerFrom="last"
                    staggerDuration={isMobile ? 0 : 0.02}
                    splitBy={isMobile ? "words" : "characters"}
                    rotationInterval={3400}
                    transition={{ type: "spring", damping: 28, stiffness: 380 }}
                    elementLevelClassName={styles.rotateTextBrand}
                  />
                </motion.div>
              </div>
              <div className={styles.lineClip}>
                <motion.span variants={slideUpLine}>{settingsData.hero.headline_2}</motion.span>
              </div>
              <div className={styles.lineClip}>
                <motion.div variants={slideUpLine} className={styles.rotateWrap}>
                  <TextRotate
                    texts={settingsData.hero.rotate_2}
                    staggerFrom="first"
                    staggerDuration={isMobile ? 0 : 0.02}
                    splitBy={isMobile ? "words" : "characters"}
                    rotationInterval={3400}
                    transition={{ type: "spring", damping: 28, stiffness: 380 }}
                    elementLevelClassName={styles.rotateTextItalic}
                  />
                </motion.div>
              </div>
            </h1>

            <motion.p variants={fadeUp} className={styles.lede}>
              {settingsData.profile.bio.split('. ')[0]}.
            </motion.p>

            {/* Google Material Quick Stats Cards */}
            <motion.div variants={fadeUp} className={styles.quickFacts}>
              {settingsData.hero.stats.map((stat) => (
                <div key={stat.label} className={styles.qfCard}>
                  <span className={styles.qfVal}>{stat.val}</span>
                  <span className={styles.qfLabel}>{stat.label}</span>
                </div>
              ))}
            </motion.div>

            {/* Google Pill Action Buttons */}
            <motion.div variants={fadeUp} className={styles.actions}>
              <Link href="/contact" className="shiny-cta">
                <span>Start a Project</span>
                <span aria-hidden="true" style={{ fontSize: '15px' }}>→</span>
              </Link>
              <Link href="/work" className="btn-secondary">
                <span className="btn-dot" aria-hidden="true" />
                <span>Explore Work</span>
              </Link>
            </motion.div>
          </motion.div>

          {/* RIGHT — Studio Profile Card */}
          <motion.div
            className={styles.heroImage}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.2, 0, 0, 1], delay: 0.15 }}
          >
            <div className={styles.imgGlow} />

            <div className={styles.imgFrame}>
              <Image
                src={settingsData.profile.image}
                alt={settingsData.profile.name}
                fill
                priority
                quality={85}
                style={{
                  objectFit: 'cover',
                  objectPosition: 'top center',
                }}
              />
              
              {/* Google-Style Floating Role Chip */}
              <div className={styles.floatingRoleBadge}>
                <span className={styles.roleBadgeDot} />
                <span>Creative Lead · Global Graphics</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FACTS / SERVICES BAR ── */}
      <section className={styles.facts}>
        <div className="container">
          <dl className={styles.factsInner}>
            {[
              { label: 'Designer',  value: settingsData.profile.name },
              { label: 'Specialty', value: settingsData.profile.title },
              { label: 'Year',      value: '2026' },
              { label: 'Services',  value: 'Graphic · Web · Apps · Code' },
              { label: 'Location',  value: settingsData.profile.location },
            ].map(({ label, value }) => (
              <div key={label} className={styles.fact}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── SELECTED WORK (Google Material 3 Cards) ── */}
      <section className={styles.workSection}>
        <div className="container">
          <header className={styles.sectionHead}>
            <div className="eyebrow">
              <span className="eyebrow-bar" aria-hidden="true" />
              <span className="eyebrow-tag">[03]</span>
              <span>Selected Work</span>
            </div>
            <h2>From the Studio.</h2>
          </header>

          <motion.div
            className={styles.gallery}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            {allProjects.map((p, i) => (
              <motion.figure
                key={p.id}
                className={`${styles.shot} card`}
                variants={fadeUp}
              >
                <Link href={`/work/${p.id}`} className={styles.shotLink}>
                  <div className={styles.shotImg}>
                    {/* Category Chip Badge floating top-left */}
                    <div className={styles.categoryBadge}>
                      {p.subcategory || 'Design'}
                    </div>

                    {isVideoUrl(p.image) ? (
                      <HoverVideo src={p.image} className={styles.img} />
                    ) : (
                      <Image 
                        src={p.image} 
                        alt={p.title} 
                        fill 
                        sizes="(max-width: 768px) 100vw, 50vw" 
                        className={styles.img} 
                      />
                    )}
                    <div className={styles.shotGradient} />
                  </div>

                  <figcaption className={styles.shotCaption}>
                    <div>
                      <span className="mono" style={{ color: 'var(--gray-2)', fontSize: '11px' }}>
                        {String(i + 1).padStart(2, '0')} / {p.subcategory}
                      </span>
                      <p>{p.title}</p>
                    </div>
                    {/* Google circular action arrow */}
                    <div className={styles.arrowCircle}>
                      <span className={styles.arrow}>↗</span>
                    </div>
                  </figcaption>
                </Link>
              </motion.figure>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── BOTTOM CTA BANNER (Google Material 3) ── */}
      <section className={styles.cta}>
        <div className="container">
          <div className={styles.ctaCard}>
            <div className="eyebrow" style={{ marginBottom: '16px' }}>
              <span className="eyebrow-bar" aria-hidden="true" />
              <span className="eyebrow-tag">[04]</span>
              <span>Let's Work Together</span>
            </div>
            <h2>
              {settingsData.cta.heading.split('?')[0]}
              <br />
              <em style={{ fontStyle: 'normal', color: 'var(--lime)' }}>
                {settingsData.cta.heading.includes('?') 
                  ? settingsData.cta.heading.split('?')[0].includes('project') 
                    ? 'own project?' 
                    : 'in mind?' 
                  : ''}
              </em>
            </h2>
            <p className={styles.ctaText}>{settingsData.cta.text}</p>
            <div className={styles.ctaActions}>
              <Link href="/contact" className="shiny-cta">
                <span>Start a Project</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link href="/work" className="btn-secondary">
                <span className="btn-dot" aria-hidden="true" />
                <span>More Work</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
