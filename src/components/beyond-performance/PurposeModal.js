'use client';

/**
 * Component: PurposeModal.js
 * 3-Slide Interactive Onboarding Modal:
 * - Slide 1: Glory Adeniran's (God's Virtue) heart & spiritual leading (Matthew 11:28)
 * - Slide 2: What this space is (safe, pressure-free, genuine fellowship)
 * - Slide 3: Reading Theme preference selection (Light vs Dark mode)
 *
 * Strictly zero emojis. High contrast, large readable typography.
 */

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './purpose-modal.module.css';

export default function PurposeModal({
  isOpen,
  onClose,
  currentTheme = 'dark',
  onSelectTheme = () => {},
}) {
  const [currentSlide, setCurrentSlide] = useState(1);
  const totalSlides = 3;

  const handleNext = () => {
    if (currentSlide < totalSlides) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 1) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleThemePick = (theme) => {
    onSelectTheme(theme);
  };

  const slideVariants = {
    enter: (direction) => ({
      opacity: 0,
      x: direction > 0 ? 24 : -24,
    }),
    center: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
    },
    exit: (direction) => ({
      opacity: 0,
      x: direction > 0 ? -24 : 24,
      transition: { duration: 0.18, ease: 'easeIn' },
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.backdrop} onClick={onClose}>
          <motion.div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            data-modal-theme={currentTheme}
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, scale: 0.96, y: 12, transition: { duration: 0.2, ease: 'easeIn' } }}
          >
            {/* Header / Host Aura */}
            <div className={styles.modalHeader}>
              <div className={styles.hostBadge}>
                <div className={styles.imageFrame}>
                  <Image
                    src="/images/Put_an_I_watch_to_202606282357.jpeg"
                    alt="Glory Adeniran (God's Virtue)"
                    fill
                    sizes="80px"
                    style={{ objectFit: 'cover', objectPosition: 'top center' }}
                  />
                </div>
                <div>
                  <div className={styles.eyebrow}>
                    <span className={styles.eyebrowBar} />
                    <span>A SPIRITUAL INITIATIVE &middot; GOD'S VIRTUE</span>
                  </div>
                  <h2 className={styles.hostName}>Glory Adeniran</h2>
                  <div className={styles.hostTitle}>Product Designer &amp; Lead Creative</div>
                </div>
              </div>

              <div className={styles.headerRight}>
                <div className={styles.slideCounter}>
                  Slide {currentSlide} of {totalSlides}
                </div>
                <button
                  type="button"
                  className={styles.btnClose}
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  [CLOSE]
                </button>
              </div>
            </div>

            {/* Slide Progress Indicator */}
            <div className={styles.slideProgressBar}>
              <div
                className={styles.slideProgressFill}
                style={{ width: `${(currentSlide / totalSlides) * 100}%` }}
              />
            </div>

            {/* Modal Body Slides */}
            <div className={styles.modalBody}>
              <AnimatePresence mode="wait" custom={1}>
                {/* ─── SLIDE 1: THE HEART & THE LEADING ─── */}
                {currentSlide === 1 && (
                  <motion.div
                    key="slide-1"
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    custom={1}
                  >
                    <div className={styles.scriptureBanner}>
                      <div className={styles.scriptureText}>
                        "Come to me, all you who are weary and burdened, and I will give you rest."
                      </div>
                      <div className={styles.scriptureRef}>Matthew 11:28</div>
                    </div>

                    <h3 className={styles.slideTitle}>Why I Am Doing This</h3>

                    <p className={styles.paragraphLarge}>
                      I felt a deep and persistent leading in my spirit to create this safe, honest space. Across our churches, fellowships, and private quiet times, countless believers are silently carrying exhaustion and guilt around their prayer lives.
                    </p>

                    <p className={styles.paragraphLarge}>
                      Somewhere along the journey, talking with our Heavenly Father turned into a stressful performance test against a stopwatch: forcing 1-hour quotas, battling tiredness with condemnation, and wondering why God feels distant.
                    </p>

                    <div className={styles.calloutCard}>
                      <span className={styles.calloutLabel}>THE CORE MESSAGE</span>
                      <p className={styles.calloutText}>
                        You do not need to perform for God. He desires your honest heart, not an exhausting ritual.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* ─── SLIDE 2: WHAT THIS SPACE IS & ISN'T ─── */}
                {currentSlide === 2 && (
                  <motion.div
                    key="slide-2"
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    custom={1}
                  >
                    <div className={styles.badgeTopic}>WHAT TO EXPECT</div>
                    <h3 className={styles.slideTitle}>A Safe, Pressure-Free Space</h3>

                    <p className={styles.paragraphLarge}>
                      This is not a survey to test or judge your spirituality. It is an opportunity to reflect openly on your walk.
                    </p>

                    <div className={styles.pillarsGrid}>
                      <div className={styles.pillarItem}>
                        <div className={styles.pillarIndex}>01</div>
                        <div>
                          <div className={styles.pillarTitle}>Zero Stopwatch Pressure</div>
                          <div className={styles.pillarDesc}>
                            No quotas, no legalism, and no scorecards. Just genuine truth about how prayer feels right now.
                          </div>
                        </div>
                      </div>

                      <div className={styles.pillarItem}>
                        <div className={styles.pillarIndex}>02</div>
                        <div>
                          <div className={styles.pillarTitle}>Tailored Bible Study Pathways</div>
                          <div className={styles.pillarDesc}>
                            Receive custom YouVersion reading plans matched to your exact area of struggle or growth.
                          </div>
                        </div>
                      </div>

                      <div className={styles.pillarItem}>
                        <div className={styles.pillarIndex}>03</div>
                        <div>
                          <div className={styles.pillarTitle}>Direct Pastoral Prayer Support</div>
                          <div className={styles.pillarDesc}>
                            Access to 1-on-1 personal prayer support via WhatsApp with Glory Adeniran whenever you need a brother to stand with you.
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ─── SLIDE 3: CHOOSE YOUR READING THEME ─── */}
                {currentSlide === 3 && (
                  <motion.div
                    key="slide-3"
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    custom={1}
                  >
                    <div className={styles.badgeTopic}>READING EXPERIENCE</div>
                    <h3 className={styles.slideTitle}>Choose Your Preferred Theme</h3>

                    <p className={styles.paragraphLarge}>
                      Choose how you would like this survey to appear. Your selection is automatically remembered every time you return.
                    </p>

                    <div className={styles.themeSelectorGrid}>
                      {/* Dark Mode Card */}
                      <div
                        className={`${styles.themeOptionCard} ${currentTheme === 'dark' ? styles.themeActive : ''}`}
                        onClick={() => handleThemePick('dark')}
                        role="button"
                        tabIndex={0}
                      >
                        <div className={styles.themePreviewDark}>
                          <div className={styles.themePreviewHeaderDark}>
                            <span className={styles.themeDot} />
                            <span className={styles.themeDot} />
                          </div>
                          <div className={styles.themePreviewLineDark} />
                          <div className={styles.themePreviewLineDarkShort} />
                        </div>
                        <div className={styles.themeMeta}>
                          <div className={styles.themeName}>
                            Dark Theme {currentTheme === 'dark' ? '[ACTIVE]' : ''}
                          </div>
                          <div className={styles.themeDetail}>
                            Deep obsidian matte, glowing cyan/emerald accents, easy on the eyes.
                          </div>
                        </div>
                      </div>

                      {/* Light Mode Card */}
                      <div
                        className={`${styles.themeOptionCard} ${currentTheme === 'light' ? styles.themeActive : ''}`}
                        onClick={() => handleThemePick('light')}
                        role="button"
                        tabIndex={0}
                      >
                        <div className={styles.themePreviewLight}>
                          <div className={styles.themePreviewHeaderLight}>
                            <span className={styles.themeDotLight} />
                            <span className={styles.themeDotLight} />
                          </div>
                          <div className={styles.themePreviewLineLight} />
                          <div className={styles.themePreviewLineLightShort} />
                        </div>
                        <div className={styles.themeMeta}>
                          <div className={styles.themeName}>
                            Light Theme {currentTheme === 'light' ? '[ACTIVE]' : ''}
                          </div>
                          <div className={styles.themeDetail}>
                            Crisp white &amp; soft ivory background, deep royal navy text, high contrast.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.themeNote}>
                      You can also switch themes at any time using the toggle in the header.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Modal Footer Controls */}
            <div className={styles.modalFooter}>
              {currentSlide > 1 ? (
                <button
                  type="button"
                  className={styles.btnBack}
                  onClick={handlePrev}
                >
                  &larr; Previous Slide
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.btnSkip}
                  onClick={onClose}
                >
                  Skip Intro
                </button>
              )}

              {currentSlide < totalSlides ? (
                <button
                  type="button"
                  className={styles.btnNext}
                  onClick={handleNext}
                >
                  <span>Next Slide ({currentSlide + 1}/{totalSlides}) &rarr;</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.shinyCta}
                  onClick={onClose}
                >
                  <span>Save Preference &amp; Begin Reflection &rarr;</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

