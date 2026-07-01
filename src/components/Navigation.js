'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';
import settingsData from '@/data/settings.json';
import styles from './Navigation.module.css';

const DOCK_ITEMS = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    href: '/work',
    label: 'Work',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/about',
    label: 'About',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
  {
    href: '/experience',
    label: 'Experience',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/>
        <line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  {
    href: '/contact',
    label: 'Contact',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
];

function DockIcon({ item, mouseX, isActive }) {
  const ref = useRef(null);
  const distance = useMotionValue(999);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const unsub = mouseX.onChange((mx) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      distance.set(Math.abs(mx - (rect.left + rect.width / 2)));
    });
    return unsub;
  }, [mouseX, distance]);

  const scale = useTransform(distance, [0, 55, 110], [1.5, 1.2, 1]);
  const springScale = useSpring(scale, { stiffness: 420, damping: 28 });

  return (
    <div className={styles.iconWrap} ref={ref}>
      <AnimatePresence>
        {hovered && (
          <motion.div
            className={styles.tooltip}
            initial={{ opacity: 0, y: -6, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -3, scale: 0.9 }}
            transition={{ duration: 0.14 }}
          >
            {item.label}
          </motion.div>
        )}
      </AnimatePresence>

      <Link href={item.href} aria-label={item.label} className={styles.iconLink}>
        <motion.div
          className={`${styles.icon} ${isActive ? styles.iconActive : ''}`}
          style={{ scale: springScale }}
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          whileTap={{ scale: 0.85 }}
        >
          {/* Liquid glass layers */}
          <div className={styles.glassBlur} />
          <div className={styles.glassTint} />
          <div className={styles.glassRim} />
          {/* Icon content */}
          <span className={styles.iconSvg}>{item.icon}</span>
        </motion.div>
        <span className={`${styles.iconLabel} ${isActive ? styles.iconLabelActive : ''}`}>
          {item.label}
        </span>
        {isActive && <span className={styles.activeDot} />}
      </Link>
    </div>
  );
}

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const mouseX = useMotionValue(999);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}
      aria-label="Primary"
    >
      <div className={styles.inner}>
        {/* Left — Brand */}
        <Link href="/" className={styles.brand} aria-label={settingsData.profile.name}>
          {settingsData.profile.name.split(' ')[0].toUpperCase()}<span className={styles.dot}>.</span>
        </Link>

        {/* Center — Spacing Placeholder */}
        <div className={styles.dockPlaceholder} />

        {/* Right — CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifySelf: 'end' }}>
          <Link href="/contact" className={`shiny-cta shiny-cta--compact ${styles.cta}`}>
            <span>Start a Project &nbsp;→</span>
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Center — Liquid Glass Dock (decoupled from grid to ensure perfect viewport centering) */}
      <div
        className={styles.dock}
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(999)}
      >
        {/* Dock glass layers */}
        <div className={styles.dockGlassBlur} />
        <div className={styles.dockGlassTint} />
        <div className={styles.dockGlassRim} />

        <div className={styles.dockIcons}>
          {DOCK_ITEMS.map((item) => (
              <DockIcon
                key={item.href}
                item={item}
                mouseX={mouseX}
                isActive={pathname === item.href}
              />
            ))}
        </div>
      </div>
    </nav>
  );
}
