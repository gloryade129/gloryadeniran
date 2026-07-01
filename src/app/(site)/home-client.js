'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import dynamic_import from 'next/dynamic';
import projectsData from '@/data/projects.json';
import settingsData from '@/data/settings.json';
import styles from './home.module.css';
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

const allProjects = [
  ...projectsData.graphic_design,
  ...projectsData.website_design,
  ...projectsData.apps,
  ...projectsData.vibe_coding,
].slice(0, 4);

export default function HomeClient() {
  return (
    <>
      <div className="grain" aria-hidden="true" />

      {/* ── HERO ── */}
      <section className={styles.hero}>
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
                    staggerDuration={0.025}
                    splitBy="characters"
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
                    staggerDuration={0.025}
                    splitBy="characters"
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
              <Link href="/work" className="shiny-cta">
                <span>View Work &nbsp;↗</span>
              </Link>
              <Link href="/about" className="btn-secondary">
                <span className="btn-dot" aria-hidden="true" />
                <span>About Me</span>
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
                quality={90}
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
                <Link href={p.link} className={styles.shotLink}>
                  <div className={styles.shotImg}>
                    <Image src={p.image} alt={p.title} fill sizes="(max-width: 768px) 100vw, 50vw" className={styles.img} />
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
