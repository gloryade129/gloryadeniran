'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import settingsData from '@/data/settings.json';
import styles from './about.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const { skills, tools, profile } = settingsData;

export default function AboutClient() {
  return (
    <>
      <div className="grain" aria-hidden="true" />

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <motion.div className={styles.heroText} initial="hidden" animate="show" variants={stagger}>
            <motion.p variants={fadeUp} className="eyebrow">
              <span className="eyebrow-bar" aria-hidden="true" />
              <span className="eyebrow-tag">[01]</span>
              About · {profile.name}
            </motion.p>
            <motion.h1 variants={fadeUp}>
              Designer.<br />
              <em style={{ fontStyle: 'normal', color: 'var(--lime)' }}>Coder.</em><br />
              Creator.
            </motion.h1>
            <motion.p variants={fadeUp} className={styles.lede}>
              {profile.bio}
            </motion.p>
          </motion.div>

          <motion.figure
            className={styles.portrait}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          >
            <div className={styles.aboutImg}>
              <Image
                src={profile.image}
                alt={profile.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 40vw"
                quality={90}
                style={{ 
                  objectFit: 'cover', 
                  objectPosition: 'top center',
                  filter: 'contrast(1.05) saturate(1.1) drop-shadow(0px 10px 30px rgba(201, 226, 101, 0.15))'
                }}
              />
            </div>
            <figcaption className={styles.portraitTag} aria-hidden="true">
              <span>{profile.name}</span>
              <span>{profile.location} · 2025</span>
            </figcaption>
          </motion.figure>
        </div>
      </section>

      {/* ── FACTS BAR ── */}
      <section className={styles.facts}>
        <div className="container">
          <dl className={styles.factsInner}>
            {[
              { label: 'Name',     value: profile.name },
              { label: 'Role',     value: profile.title.split(' · ')[0] },
              { label: 'Also',     value: profile.title.split(' · ')[1] || 'Vibe Coder' },
              { label: 'Based',    value: profile.location },
              { label: 'Status',   value: profile.availability === 'Available for Work' ? 'Available ✦' : 'Busy' },
            ].map(({ label, value }) => (
              <div key={label} className={styles.fact}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── SKILLS GRID ── */}
      <section className={styles.section}>
        <div className="container">
          <header className={styles.sectionHead}>
            <p className="eyebrow">
              <span className="eyebrow-bar" aria-hidden="true" />
              <span className="eyebrow-tag">[02]</span>
              Disciplines
            </p>
            <h2>What I Do.</h2>
          </header>

          <motion.div
            className={styles.skillsGrid}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            variants={stagger}
          >
            {skills.map(({ cat, items }) => (
              <motion.div key={cat} variants={fadeUp} className={`${styles.skillCard} card`}>
                <p className="mono" style={{ color: 'var(--lime)', marginBottom: '20px', fontSize: '11px' }}>{cat}</p>
                <ul className={styles.skillList}>
                  {items.map(item => (
                    <li key={item} className={styles.skillItem}>
                      <span className={styles.skillDot} />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── TOOLS ── */}
      <section className={styles.section} style={{ paddingTop: 0 }}>
        <div className="container">
          <header className={styles.sectionHead}>
            <p className="eyebrow">
              <span className="eyebrow-bar" aria-hidden="true" />
              <span className="eyebrow-tag">[03]</span>
              Tools &amp; Stack
            </p>
            <h2>My Arsenal.</h2>
          </header>

          <motion.div
            className={styles.toolsWrap}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
          >
            {tools.map(tool => (
              <motion.span key={tool} variants={fadeUp} className={styles.tool}>
                {tool}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.cta}>
        <div className="container">
          <div className={styles.ctaInner}>
            <p className="eyebrow">
              <span className="eyebrow-bar" aria-hidden="true" />
              <span className="eyebrow-tag">[04]</span>
              Let's Work Together
            </p>
            <h2>Got a project<br /><em>in mind?</em></h2>
            <div className={styles.ctaActions}>
              <Link href="/contact" className="shiny-cta"><span>Start a Project &nbsp;→</span></Link>
              <Link href="/work" className="btn-secondary">
                <span className="btn-dot" aria-hidden="true" />
                <span>View Work</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
