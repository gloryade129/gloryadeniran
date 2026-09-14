'use client';

/**
 * Component: PurposeModal.js
 * Heart Behind This Survey modal explaining why Glory Adeniran (God's Virtue)
 * was led to organize this survey, addressing spiritual burnout, and offering assistance.
 * Strictly zero emojis.
 */

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './purpose-modal.module.css';

export default function PurposeModal({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.backdrop} onClick={onClose}>
          <motion.div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, scale: 0.95, y: 12, transition: { duration: 0.2, ease: 'easeIn' } }}
          >
            {/* Header / Host Aura */}
            <div className={styles.modalHeader}>
              <div className={styles.hostBadge}>
                <div className={styles.imageFrame}>
                  <Image
                    src="/images/Put_an_I_watch_to_202606282357.jpeg"
                    alt="Glory Adeniran (God's Virtue)"
                    fill
                    sizes="72px"
                    style={{ objectFit: 'cover', objectPosition: 'top center' }}
                  />
                </div>
                <div>
                  <div className={styles.eyebrow}>
                    <span className={styles.eyebrowBar} />
                    <span>A PERSONAL LEADING BY THE SPIRIT</span>
                  </div>
                  <h2 className={styles.hostName}>Glory Adeniran</h2>
                  <div className={styles.hostTitle}>God's Virtue · Product Designer &amp; Lead Creative</div>
                </div>
              </div>

              <button
                type="button"
                className={styles.btnClose}
                onClick={onClose}
                aria-label="Close modal"
              >
                [ESC]
              </button>
            </div>

            {/* Modal Story Body */}
            <div className={styles.modalBody}>
              <div className={styles.scriptureBanner}>
                <div className={styles.scriptureText}>
                  "Come to me, all you who are weary and burdened, and I will give you rest."
                </div>
                <div className={styles.scriptureRef}>Matthew 11:28</div>
              </div>

              <h3 className={styles.sectionTitle}>Why I Organized This Survey &amp; Assistance</h3>

              <p className={styles.paragraph}>
                I felt a clear leading in my spirit to build this safe space. Across churches, fellowships, and private quiet times, countless believers are silently carrying exhaustion and guilt around their prayer and Bible reading lives.
              </p>

              <p className={styles.paragraph}>
                Somewhere along the way, prayer quietly turned into a performance test against a stopwatch: forcing ourselves to hit 1-hour marks, battling sleepiness with guilt, reciting empty phrases because we run out of words, or feeling like God is angry or distant when we don't feel 'deep'.
              </p>

              <div className={styles.highlightCard}>
                <div className={styles.highlightTitle}>// THE PURPOSE OF THIS PROJECT</div>
                <p className={styles.highlightText}>
                  1. To remove all pretense and allow believers to share their true, unfiltered struggles without judgment.<br />
                  2. To provide tailored Bible reading tracks and simple rhythms that shift you from religious duty into sweet, genuine fellowship.<br />
                  3. To offer 1-on-1 personal prayer support and guidance for anyone navigating dryness or questions.
                </p>
              </div>

              <p className={styles.paragraph}>
                You do not have to perform for God. He desires your honest heart far more than long scripted words. Thank you for opening your heart to reflect with me.
              </p>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.shinyCta}
                  onClick={onClose}
                >
                  <span>Begin My Honest Reflection &nbsp;→</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
