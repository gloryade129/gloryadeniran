'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import dynamic_import from 'next/dynamic';
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

import { TextRotate } from '@/components/TextRotate';

const Scene3D = dynamic_import(() => import('@/components/Scene3D'), { ssr: false });

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] } }
};

const slideUpLine = {
  hidden: { y: '100%' },
  show:   { y: 0, transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] } }
};

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.11 } }
};

export default function HomeClient({ initialProjects = {}, initialSettings = {} }) {
  const projectsData = initialProjects;
  const settingsData = initialSettings;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
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

      {/* ── HERO ── */}
      <section className={styles.hero}>
        {/* Lightweight CSS Watermark Background Title */}
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
            <motion.p variants={fadeUp} className="eyebrow">
              <span className="eyebrow-bar" aria-hidden="true" />
              <span className="eyebrow-tag">[01]</span>
              {settingsData.profile.title} · 2026
            </motion.p>

            <h1 className={styles.headline}>
              <div className={styles.lineClip}>
                <motion.span variants={slideUpLine}>{settingsData.hero.headline_1}</motion.span>
              </div>
              <div className={styles.lineClip}>
                <motion.div variants={slideUpLine} className={styles.rotateWrap}>
                  <TextRotate
                    texts={settingsData.hero.rotate_1}
                    staggerFrom="last"
                    staggerDuration={isMobile ? 0 : 0.025}
                    splitBy={isMobile ? "words" : "characters"}
                    rotationInterval={3500}
                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                    elementLevelClassName={styles.rotateTextLime}
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
                    staggerDuration={isMobile ? 0 : 0.025}
                    splitBy={isMobile ? "words" : "characters"}
                    rotationInterval={3500}
                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                    elementLevelClassName={styles.rotateTextItalic}
                  />
                </motion.div>
              </div>
            </h1>

            <motion.p variants={fadeUp} className={styles.lede}>
              {settingsData.profile.bio.split('. ')[0]}.
            </motion.p>

            {/* Quick facts */}
            <motion.div variants={fadeUp} className={styles.quickFacts}>
              {settingsData.hero.stats.map((stat, i) => (
                <div key={stat.label} style={{ display: 'flex', alignItems: 'center' }}>
                  <div className={styles.qf}>
                    <span className={styles.qfVal}>{stat.val}</span>
                    <span className={styles.qfLabel}>{stat.label}</span>
                  </div>
                  {i < settingsData.hero.stats.length - 1 && <div className={styles.qfDivider} />}
                </div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className={styles.actions}>
              <Link href="/contact" className="shiny-cta">
                <span>Start a Project &nbsp;→</span>
              </Link>
              <Link href="/work" className="btn-secondary">
                <span className="btn-dot" aria-hidden="true" />
                <span>Explore Work</span>
              </Link>
            </motion.div>
          </motion.div>

          {/* RIGHT — Large profile image, half showing with gradient */}
          <motion.div
            className={styles.heroImage}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            {/* Lime glow behind photo */}
            <div className={styles.imgGlow} />

            <div className={styles.imgFrame}>
              <Image
                src={settingsData.profile.image}
                alt={settingsData.profile.name}
                fill
                priority
                quality={80}
                style={{
                  objectFit: 'cover',
                  objectPosition: 'top center',
                  filter: 'contrast(1.06) saturate(1.12)',
                }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FACTS BAR ── */}
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

      {/* ── SELECTED WORK ── */}
      <section className={styles.workSection}>
        <div className="container">
          <header className={styles.sectionHead}>
            <p className="eyebrow">
              <span className="eyebrow-bar" aria-hidden="true" />
              <span className="eyebrow-tag">[03]</span>
              Selected Work
            </p>
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
                    {isVideoUrl(p.image) ? (
                      <HoverVideo src={p.image} className={styles.img} />
                    ) : (
                      <Image src={p.image} alt={p.title} fill sizes="(max-width: 768px) 100vw, 50vw" className={styles.img} />
                    )}
                    <div className={styles.shotGradient} />
                  </div>
                  <figcaption className={styles.shotCaption}>
                    <div>
                      <span className="mono" style={{ color: 'var(--gray-2)' }}>
                        {String(i + 1).padStart(2, '0')} / {p.subcategory}
                      </span>
                      <p>{p.title}</p>
                    </div>
                    <span className={styles.arrow}>↗</span>
                  </figcaption>
                </Link>
              </motion.figure>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className={styles.cta}>
        <div className="container">
          <div className={styles.ctaInner}>
            <p className="eyebrow">
              <span className="eyebrow-bar" aria-hidden="true" />
              <span className="eyebrow-tag">[04]</span>
              Let's Work Together
            </p>
            <h2>{settingsData.cta.heading.split('?')[0]}<br /><em>{settingsData.cta.heading.includes('?') ? settingsData.cta.heading.split('?')[0].includes('project') ? 'own project?' : 'in mind?' : ''}</em></h2>
            <p className={styles.ctaText}>{settingsData.cta.text}</p>
            <div className={styles.ctaActions}>
              <Link href="/contact" className="shiny-cta">
                <span>Start a Project &nbsp;→</span>
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
