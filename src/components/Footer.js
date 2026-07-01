'use client';

import { useEffect, useState } from 'react';
import settingsData from '@/data/settings.json';
import styles from './Footer.module.css';

export default function Footer() {
  const { profile } = settingsData;
  const [year, setYear] = useState(2025);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.grid}>

          {/* Brand */}
          <div className={styles.brand}>
            <span className={styles.logo}>{profile.name.split(' ')[0].toUpperCase()}<span className={styles.dot}>.</span></span>
            <p className={styles.tagline}>
              {profile.title.split(' · ')[0]}<br />Designer &amp;<br /><em>{profile.title.split(' · ')[1] || 'Vibe Coder'}.</em>
            </p>
          </div>

          {/* Nav cols */}
          <nav className={styles.cols} aria-label="Footer Navigation">
            <div className={styles.col}>
              <p className={styles.colTitle}>Contact</p>
              <ul className={styles.list}>
                <li><a href={`mailto:${profile.email}`}>{profile.email}</a></li>
              </ul>
            </div>
            <div className={styles.col}>
              <p className={styles.colTitle}>Navigate</p>
              <ul className={styles.list}>
                <li><a href="/work">Work</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/contact">Contact</a></li>
              </ul>
            </div>
            <div className={styles.col}>
              <p className={styles.colTitle}>Disciplines</p>
              <ul className={styles.list}>
                <li><a href="/work">Graphic Design</a></li>
                <li><a href="/work">Website Design</a></li>
                <li><a href="/work">Apps</a></li>
                <li><a href="/work">Vibe Coding</a></li>
              </ul>
            </div>
            <div className={styles.col}>
              <p className={styles.colTitle}>Social</p>
              <ul className={styles.list}>
                <li>
                  <a href={profile.instagram} target="_blank" rel="noreferrer me">
                    Instagram ↗
                  </a>
                </li>
                <li>
                  <a href={profile.facebook} target="_blank" rel="noreferrer me">
                    Facebook ↗
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className={styles.bottom}>
          <p className="mono">© {year} {profile.name}</p>
          <p className="mono" style={{ color: 'var(--gray-2)' }}>Designed &amp; Built with Passion</p>
        </div>
      </div>
    </footer>
  );
}
