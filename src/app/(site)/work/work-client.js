'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './work.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const categories = [
  { key: 'graphic_design',  label: 'Graphic Design',  tag: '01', sub: 'Logo · Flyers · Print · Branding' },
  { key: 'website_design',  label: 'Website Design',  tag: '02', sub: 'Shopify · WordPress · Wix' },
  { key: 'apps',            label: 'Apps',             tag: '03', sub: 'Mobile UI/UX · Prototyping' },
  { key: 'vibe_coding',     label: 'Vibe Coding',     tag: '04', sub: 'Next.js · React · Three.js' },
];

function CategorySection({ cat, tag, label, sub, data, index }) {
  return (
    <motion.section
      className={styles.catSection}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={stagger}
    >
      <motion.header variants={fadeUp} className={styles.catHeader}>
        <p className="eyebrow">
          <span className="eyebrow-bar" aria-hidden="true" />
          <span className="eyebrow-tag">[{tag}]</span>
          {sub}
        </p>
        <h2>{label}</h2>
      </motion.header>

      <div className={styles.gallery}>
        {data.map((project, i) => (
          <motion.figure
            key={project.id}
            className={`${styles.shot} card`}
            variants={fadeUp}
            style={{ '--i': i }}
          >
            <Link href={`/work/${project.id}`} className={styles.shotLink}>
              <div className={styles.shotImg}>
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className={styles.img}
                  unoptimized={project.image.startsWith('https://images.unsplash.com')}
                />
              </div>
              <figcaption className={styles.shotCaption}>
                <div>
                  <span className="mono" style={{ color: 'var(--gray-2)', fontSize: '10px' }}>
                    {String(i + 1).padStart(2, '0')} / {project.subcategory}
                  </span>
                  <p className={styles.shotTitle}>{project.title}</p>
                </div>
                <span className={styles.arrow}>↗</span>
              </figcaption>
            </Link>
          </motion.figure>
        ))}
      </div>
    </motion.section>
  );
}

export default function WorkClient({ initialData }) {
  const projectsData = initialData || {};
  return (
    <>
      <div className="grain" aria-hidden="true" />

      {/* ── PAGE HERO ── */}
      <section className={styles.hero}>
        <div className="container">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.p variants={fadeUp} className="eyebrow">
              <span className="eyebrow-bar" aria-hidden="true" />
              <span className="eyebrow-tag">[WORK]</span>
              Selected Projects
            </motion.p>
            <motion.h1 variants={fadeUp}>
              Categorized<br /><em style={{ color: 'var(--lime)', fontStyle: 'normal' }}>Disciplines.</em>
            </motion.h1>
          </motion.div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <div className={styles.categoriesWrap}>
        <div className="container">
          {categories.map((cat, idx) => {
            const { key: catKey, ...restCat } = cat;
            return (
              projectsData[catKey]?.length > 0 && (
                <CategorySection
                  key={catKey}
                  {...restCat}
                  data={projectsData[catKey]}
                  index={idx}
                />
              )
            );
          })}
        </div>
      </div>

      {/* ── BOTTOM CTA ── */}
      <section className={styles.cta}>
        <div className="container">
          <div className={styles.ctaInner}>
            <p className="eyebrow">
              <span className="eyebrow-bar" aria-hidden="true" />
              <span className="eyebrow-tag">[NEXT]</span>
              Ready for Your Project?
            </p>
            <h2>Let's build<br /><em>something great.</em></h2>
            <p className="mono" style={{ color: 'var(--gray-2)', marginTop: '16px', fontSize: '12px' }}>
              Taking select projects. Response within 24 hours.
            </p>
            <div className={styles.ctaActions}>
              <Link href="/contact" className="shiny-cta"><span>Start a Project &nbsp;→</span></Link>
              <Link href="/about" className="btn-secondary">
                <span className="btn-dot" aria-hidden="true" />
                <span>About Me</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
