'use client';

/**
 * Component: SurveyWizard.js
 * Multi-step spiritual survey client: "Beyond Performance: Redefining Prayer & Bible Connection"
 * Host: Glory Adeniran (God's Virtue)
 * Features:
 * - Light and Dark Theme selector & persistent storage
 * - 3-Slide Interactive Purpose Modal with theme choice
 * - Single submission per user tracked through email
 * - High-readability, large typography, zero emojis
 */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import PurposeModal from './PurposeModal';
import styles from './survey.module.css';

const LOCAL_STORAGE_KEY = 'ga_beyond_performance_draft';
const PURPOSE_MODAL_SHOWN_KEY = 'ga_purpose_modal_shown';
const SUBMITTED_EMAIL_KEY = 'ga_beyond_performance_submitted_email';

const INITIAL_STATE = {
  privacy_accepted: false,
  full_name: '',
  email: '',
  faith_status: '',
  church_name: '',
  prayer_reality: '',
  prayer_friction_points: [],
  openness_rating: 3,
  bible_reading_status: '',
  preferred_formats: [],
  open_reflection: '',
};

// Step 1: Faith Walk Options (Direct & Relatable)
const FAITH_OPTIONS = [
  'Walking with Christ passionately (Born Again)',
  'Still exploring the faith / Have sincere questions about God',
  'Used to be very active, but feeling spiritually dry, distant, or tired right now',
  'Prefer not to put a label on it',
];

// Step 2: Daily Prayer Realities
const PRAYER_REALITIES = [
  'Consistent, peaceful, and genuinely refreshing',
  'Maintained mostly as a religious routine, but lacking personal sweetness',
  'Inconsistent: Starting with big goals (like 1 hour daily), but ending up exhausted and guilty',
  'Inactive right now due to frustration, tiredness, or feeling like God is silent',
];

// Step 2: Friction Points (Multi-select)
const FRICTION_POINTS = [
  'Struggling to find words or keep my mind from wandering',
  'The pressure that prayers must last a long duration (stopwatch timing pressure)',
  'Heavy physical tiredness, sleepiness, or mental burnout',
  'Feeling as though God is silent, uninterested, or far away',
  'Fear of being inadequate or not praying the "right" spiritual way',
];

// Step 3: Bible Reading Status
const BIBLE_STATUS_OPTIONS = [
  'Consistent personal study with clarity, joy, and practical life application',
  'Reading out of routine or checklist obligation just to finish a chapter',
  'Infrequent reading because I find Scripture hard, confusing, or abstract to understand',
  'Relying almost entirely on sermon clips, devotionals, and church teachings',
];

// Step 3: Preferred Formats (Multi-select)
const PREFERRED_FORMATS = [
  'Structured reading plans via the YouVersion Bible App',
  'Topical studies addressing specific emotional, mental, and spiritual hurdles',
  'Simple verse-by-verse expository study guides with real-life application',
  'Audio scriptures and quiet reflection exercises',
];

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export default function SurveyWizard() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [alreadySubmittedEmail, setAlreadySubmittedEmail] = useState('');

  // 2. Check if user already submitted with an email on this browser
  useEffect(() => {
    try {
      const prevEmail = localStorage.getItem(SUBMITTED_EMAIL_KEY);
      if (prevEmail) {
        setAlreadySubmittedEmail(prevEmail);
      }
    } catch (e) {}
  }, []);

  // 3. Auto-open Purpose Modal once gently if not shown
  useEffect(() => {
    try {
      const shown = sessionStorage.getItem(PURPOSE_MODAL_SHOWN_KEY);
      if (!shown) {
        const timer = setTimeout(() => {
          setShowPurposeModal(true);
          sessionStorage.setItem(PURPOSE_MODAL_SHOWN_KEY, 'true');
        }, 700);
        return () => clearTimeout(timer);
      }
    } catch (e) {}
  }, []);

  // 4. Restore draft from localStorage on mount (unless already submitted)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {}
  }, []);

  // 5. Persist draft to localStorage on change
  useEffect(() => {
    if (!submissionResult && !alreadySubmittedEmail) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
      } catch (e) {}
    }
  }, [formData, submissionResult, alreadySubmittedEmail]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationError('');
  };

  const handleToggleMulti = (field, item) => {
    setFormData((prev) => {
      const currentList = prev[field] || [];
      const exists = currentList.includes(item);
      const updated = exists
        ? currentList.filter((x) => x !== item)
        : [...currentList, item];
      return { ...prev, [field]: updated };
    });
    setValidationError('');
  };

  const validateStep = (currentStep) => {
    setValidationError('');

    if (currentStep === 0) {
      if (!formData.privacy_accepted) {
        setValidationError('Please confirm the privacy and data confidentiality agreement to proceed.');
        return false;
      }
      return true;
    }

    if (currentStep === 1) {
      if (!formData.full_name || formData.full_name.trim().length < 2) {
        setValidationError('Please enter your full name (at least 2 characters).');
        return false;
      }
      const email = (formData.email || '').trim().toLowerCase();
      if (!email || !EMAIL_REGEX.test(email)) {
        setValidationError('Please enter a valid email address so we can deliver your personalized next steps.');
        return false;
      }
      if (!formData.faith_status) {
        setValidationError('Please select where you currently find yourself in your walk with God.');
        return false;
      }
      return true;
    }

    if (currentStep === 2) {
      if (!formData.prayer_reality) {
        setValidationError('Please select your current reality with daily prayer.');
        return false;
      }
      if (!formData.prayer_friction_points || formData.prayer_friction_points.length === 0) {
        setValidationError('Please select at least one primary source of friction or pressure.');
        return false;
      }
      return true;
    }

    if (currentStep === 3) {
      if (!formData.bible_reading_status) {
        setValidationError('Please select how your personal Bible study is going.');
        return false;
      }
      if (!formData.preferred_formats || formData.preferred_formats.length === 0) {
        setValidationError('Please select at least one preferred format for spiritual growth.');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setValidationError('');
    setStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setIsSubmitting(true);
    setValidationError('');

    try {
      const response = await fetch('/api/beyond-performance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit reflection. Please try again.');
      }

      setSubmissionResult(data);
      const cleanEmail = (formData.email || '').trim().toLowerCase();
      
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        if (cleanEmail) {
          localStorage.setItem(SUBMITTED_EMAIL_KEY, cleanEmail);
          setAlreadySubmittedEmail(cleanEmail);
        }
      } catch (e) {}

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setValidationError(err.message || 'A network error occurred. Please check your connection and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const slideVariants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: 'easeIn' } },
  };

  // ─── COMPLETION OR DUPLICATE SUBMISSION STATE ───
  if (submissionResult || (alreadySubmittedEmail && step === 0 && !formData.email)) {
    const isDuplicate = submissionResult?.isDuplicate || Boolean(alreadySubmittedEmail);
    const displayEmail = formData.email || alreadySubmittedEmail;
    const namePart = formData.full_name ? formData.full_name.split(' ')[0] : 'Friend';

    return (
      <div className={styles.pageWrapper}>
        <div className={styles.card}>
          <div className={styles.completionCard}>
            <div className={styles.successBadge}>
              {isDuplicate ? '[!] SUBMISSION_RECORDED' : '[✓] REFLECTION_RECEIVED'}
            </div>

            <h2 className={styles.completionTitle}>
              {isDuplicate ? 'Welcome Back, ' + namePart : 'Your Heart Has Been Heard.'}
            </h2>

            <p className={styles.completionSubtitle}>
              {isDuplicate
                ? `You have already completed this reflection with ${displayEmail}. Your responses are securely preserved, and you do not need to submit another response.`
                : `Thank you, ${namePart}. Your honest reflections have been securely recorded. You do not have to perform for God.`}
            </p>

            {isDuplicate && (
              <div className={styles.alreadySubmittedBanner}>
                <strong>One Submission Policy:</strong> To protect your privacy and ensure personalized follow-up, each participant submits once per email. If your situation has changed or you need urgent pastoral counsel, connect directly via WhatsApp below.
              </div>
            )}

            <div className={styles.scriptureCompletion}>
              <p className={styles.scriptureCompletionText}>
                "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."
              </p>
              <div className={styles.scriptureCompletionRef}>Philippians 4:6-7</div>
            </div>

            <div className={styles.hostNoteCard} style={{ textAlign: 'left', marginBottom: '24px' }}>
              <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--lime, #0091FF)', fontWeight: '700', marginBottom: '8px' }}>
                // YOUR RECOMMENDED PATHWAY
              </div>
              <h3 style={{ fontSize: '20px', color: 'var(--white, #FAFAFA)', fontWeight: '700', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                {submissionResult?.segmentTitle || 'Spiritual Renewal & Rest'}
              </h3>
              <p style={{ fontSize: '15.5px', color: 'var(--gray-1, #C8C7C2)', margin: 0, lineHeight: 1.65 }}>
                {submissionResult?.segmentSubtitle || 'Tailored insights and YouVersion reading plans designed to move you from exhausting performance into sweet, genuine communion with God.'}
              </p>
            </div>

            <div className={styles.emailNoticeCard}>
              Personal follow-up insights from Glory Adeniran (God's Virtue) with curated YouVersion study plans are available for <strong>{displayEmail}</strong>.
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '32px' }}>
              <a
                href="https://wa.me/2349168047236"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.shinyCta}
              >
                <span>Connect with Glory on WhatsApp &nbsp;&rarr;</span>
              </a>
              <Link href="/" className={styles.btnSecondary}>
                <span className={styles.btnDot} />
                <span>Return to Portfolio</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = step === 0 ? 0 : Math.round((step / 4) * 100);

  return (
    <div className={styles.pageWrapper}>
      <PurposeModal
        isOpen={showPurposeModal}
        onClose={() => setShowPurposeModal(false)}
      />

      {/* Header Bar */}
      <div className={styles.headerBar}>
        <div className={styles.topControlRow}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowBar} />
            <span className={styles.eyebrowTag}>01 / SPIRITUAL SURVEY</span>
            <span>GLORY ADENIRAN (GOD'S VIRTUE)</span>
          </div>

          <div className={styles.topActions}>
            <button
              type="button"
              className={styles.btnSecondary}
              style={{ height: '38px', padding: '0 18px', fontSize: '12px' }}
              onClick={() => setShowPurposeModal(true)}
            >
              <span className={styles.btnDot} />
              <span>Why I Am Doing This (3 Slides)</span>
            </button>
          </div>
        </div>

        <h1 className={styles.mainTitle}>
          Beyond <em>Performance.</em>
        </h1>
        <p className={styles.subTitle}>
          Redefining Prayer &amp; Bible Connection &middot; A safe space to share where our daily spiritual practices get burdened by pressure, and how to return to genuine rest.
        </p>
      </div>

      {/* Progress Bar (Visible on Steps 1 to 4) */}
      {step > 0 && (
        <div className={styles.progressContainer}>
          <div className={styles.progressMeta}>
            <span className={styles.stepIndicator}>
              STEP 0{step} / 04 &middot; {step === 1 ? 'ABOUT YOU' : step === 2 ? 'HONEST PRAYER REALITY' : step === 3 ? 'BIBLE CONNECTION' : 'OBSERVATIONS & REVIEW'}
            </span>
            <span className={styles.stepPercentage}>{progressPercent}%</span>
          </div>
          <div className={styles.trackBar}>
            <div className={styles.trackFill} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {/* Main Card Container */}
      <div className={styles.card}>
        {validationError && (
          <div className={styles.errorBanner}>
            [ERROR] {validationError}
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* STEP 0: WELCOME & PRIVACY COMMITMENT */}
          {step === 0 && (
            <motion.div
              key="step-0"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {/* Host Note with Glory's Picture */}
              <div className={styles.hostNoteCard}>
                <div className={styles.hostHeader}>
                  <div className={styles.hostAvatar}>
                    <Image
                      src="/images/Put_an_I_watch_to_202606282357.jpeg"
                      alt="Glory Adeniran"
                      fill
                      sizes="46px"
                      style={{ objectFit: 'cover', objectPosition: 'top' }}
                    />
                  </div>
                  <div className={styles.hostInfo}>
                    <div className={styles.hostName}>Glory Adeniran</div>
                    <div className={styles.hostRole}>GOD'S VIRTUE &middot; HOST &amp; CREATIVE LEAD</div>
                  </div>
                </div>
                <p className={styles.hostQuote}>
                  "Prayer was never designed to be an exhausting performance, a rigid routine, or an endurance test against a stopwatch. It is fundamentally an honest, unhurried conversation with God. This survey exists to explore where our daily practices get weighed down by pressure, and how we can return to genuine fellowship."
                </p>
              </div>

              {/* Scripture Anchor */}
              <div className={styles.scriptureAnchorBox}>
                <div className={styles.scriptureVerse}>
                  "Come to me, all you who are weary and burdened, and I will give you rest."
                </div>
                <div className={styles.scriptureRef}>Matthew 11:28</div>
              </div>

              {/* Privacy Transparency Box */}
              <div className={styles.privacyBox}>
                <div className={styles.privacyHeading}>
                  <span className={styles.privacyHeadingDot} />
                  DATA PRIVACY &amp; CONFIDENTIALITY POLICY
                </div>
                <ul className={styles.privacyList}>
                  <li>
                    <strong>Why your information is requested:</strong> Your name and email are collected solely to deliver your personalized reflection guide, tailored Scripture study plans, and 1-on-1 assistance.
                  </li>
                  <li>
                    <strong>Complete Confidentiality:</strong> Your answers and spiritual struggles remain completely private and confidential. Data will never be sold, rented, or made public.
                  </li>
                  <li>
                    <strong>Zero Spam Guarantee:</strong> You will only receive direct, relevant reflections relating to this study.
                  </li>
                </ul>

                <label className={styles.consentContainer}>
                  <input
                    type="checkbox"
                    className={styles.consentCheckbox}
                    checked={formData.privacy_accepted}
                    onChange={(e) => handleChange('privacy_accepted', e.target.checked)}
                  />
                  <span className={styles.consentText}>
                    I understand how my information will be used to send my personalized reflection resources and agree to proceed.
                  </span>
                </label>
              </div>

              <div className={styles.buttonRow}>
                <button
                  type="button"
                  className={styles.shinyCta}
                  disabled={!formData.privacy_accepted}
                  onClick={handleNext}
                >
                  <span>Proceed to Reflection &nbsp;&rarr;</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 1: PARTICIPANT IDENTITY */}
          {step === 1 && (
            <motion.div
              key="step-1"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className={styles.stepTitle}>About You</h2>
              <p className={styles.stepDescription}>
                Tell us a little bit about yourself so we can address you personally in your follow-up guide.
              </p>

              {/* Full Name */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="full_name">
                  Full Name <span className={styles.requiredTag}>[REQUIRED]</span>
                </label>
                <input
                  id="full_name"
                  type="text"
                  className={styles.textInput}
                  placeholder="e.g. Samuel Ade"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  autoFocus
                />
              </div>

              {/* Email */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="email">
                  Email Address <span className={styles.requiredTag}>[REQUIRED]</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className={styles.textInput}
                  placeholder="e.g. samuel@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
                <div className={styles.fieldHint}>
                  // Your personalized study tracks and recommendations will be sent here. One submission per email.
                </div>
              </div>

              {/* Faith Walk */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Where are you currently in your walk with God? <span className={styles.requiredTag}>[REQUIRED]</span>
                </label>
                <div className={styles.optionsGrid}>
                  {FAITH_OPTIONS.map((opt, idx) => {
                    const isSelected = formData.faith_status === opt;
                    return (
                      <div
                        key={opt}
                        className={`${styles.optionCard} ${isSelected ? styles.optionCardActive : ''}`}
                        onClick={() => handleChange('faith_status', opt)}
                      >
                        <input
                          type="radio"
                          name="faith_status"
                          className={styles.optionInput}
                          checked={isSelected}
                          onChange={() => handleChange('faith_status', opt)}
                        />
                        <span className={styles.optionIndex}>[0{idx + 1}]</span>
                        <span className={styles.optionLabel}>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Local Church */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="church_name">
                  Local Assembly, Fellowship, or Campus Community (Optional)
                </label>
                <input
                  id="church_name"
                  type="text"
                  className={styles.textInput}
                  placeholder="e.g. The King's Chamber / Campus Fellowship / RCCG (if applicable)"
                  value={formData.church_name}
                  onChange={(e) => handleChange('church_name', e.target.value)}
                />
              </div>

              <div className={styles.buttonRow}>
                <button type="button" className={styles.btnSecondary} onClick={handleBack}>
                  <span className={styles.btnDot} />
                  <span>Back</span>
                </button>
                <button type="button" className={styles.shinyCta} onClick={handleNext}>
                  <span>Next Step &nbsp;&rarr;</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: HONEST REALITY IN PRAYER */}
          {step === 2 && (
            <motion.div
              key="step-2"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className={styles.stepTitle}>The Real Truth About Your Prayer Life</h2>
              <p className={styles.stepDescription}>
                Be 100% candid. Nobody is grading you. Honest vulnerability is where true freedom starts.
              </p>

              {/* Daily Prayer Reality */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  What does your daily prayer life honestly look like right now? <span className={styles.requiredTag}>[REQUIRED]</span>
                </label>
                <div className={styles.optionsGrid}>
                  {PRAYER_REALITIES.map((opt, idx) => {
                    const isSelected = formData.prayer_reality === opt;
                    return (
                      <div
                        key={opt}
                        className={`${styles.optionCard} ${isSelected ? styles.optionCardActive : ''}`}
                        onClick={() => handleChange('prayer_reality', opt)}
                      >
                        <input
                          type="radio"
                          name="prayer_reality"
                          className={styles.optionInput}
                          checked={isSelected}
                          onChange={() => handleChange('prayer_reality', opt)}
                        />
                        <span className={styles.optionIndex}>[0{idx + 1}]</span>
                        <span className={styles.optionLabel}>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Friction Points (Multi-select) */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  What causes you the most pressure or headache when trying to pray? (Select all that apply) <span className={styles.requiredTag}>[REQUIRED]</span>
                </label>
                <div className={styles.optionsGrid}>
                  {FRICTION_POINTS.map((opt, idx) => {
                    const isSelected = (formData.prayer_friction_points || []).includes(opt);
                    return (
                      <div
                        key={opt}
                        className={`${styles.optionCard} ${isSelected ? styles.optionCardActive : ''}`}
                        onClick={() => handleToggleMulti('prayer_friction_points', opt)}
                      >
                        <input
                          type="checkbox"
                          className={styles.optionInput}
                          checked={isSelected}
                          onChange={() => handleToggleMulti('prayer_friction_points', opt)}
                        />
                        <span className={styles.optionIndex}>[0{idx + 1}]</span>
                        <span className={styles.optionLabel}>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Openness Scale (1-5) */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  When talking to God, how open and unfiltered are you? (Scale 1 to 5) <span className={styles.requiredTag}>[REQUIRED]</span>
                </label>
                <div className={styles.scaleContainer}>
                  <div className={styles.scaleNumbers}>
                    {[1, 2, 3, 4, 5].map((num) => {
                      const isActive = Number(formData.openness_rating) === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          className={`${styles.scaleButton} ${isActive ? styles.scaleButtonActive : ''}`}
                          onClick={() => handleChange('openness_rating', num)}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                  <div className={styles.scaleLabels}>
                    <span className={styles.scaleLabelLeft}>
                      1: Very guarded; formal phrasing or repeating words
                    </span>
                    <span className={styles.scaleLabelRight}>
                      5: Completely transparent; pouring out heart without filters
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.buttonRow}>
                <button type="button" className={styles.btnSecondary} onClick={handleBack}>
                  <span className={styles.btnDot} />
                  <span>Back</span>
                </button>
                <button type="button" className={styles.shinyCta} onClick={handleNext}>
                  <span>Next Step &nbsp;&rarr;</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: SCRIPTURAL ENGAGEMENT & BIBLE STUDY */}
          {step === 3 && (
            <motion.div
              key="step-3"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className={styles.stepTitle}>Connecting with God's Word (Bible Study)</h2>
              <p className={styles.stepDescription}>
                How you currently connect with the Scriptures and what formats would make reading enjoyable.
              </p>

              {/* Bible Reading Status */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  How is your personal Bible reading going? <span className={styles.requiredTag}>[REQUIRED]</span>
                </label>
                <div className={styles.optionsGrid}>
                  {BIBLE_STATUS_OPTIONS.map((opt, idx) => {
                    const isSelected = formData.bible_reading_status === opt;
                    return (
                      <div
                        key={opt}
                        className={`${styles.optionCard} ${isSelected ? styles.optionCardActive : ''}`}
                        onClick={() => handleChange('bible_reading_status', opt)}
                      >
                        <input
                          type="radio"
                          name="bible_reading_status"
                          className={styles.optionInput}
                          checked={isSelected}
                          onChange={() => handleChange('bible_reading_status', opt)}
                        />
                        <span className={styles.optionIndex}>[0{idx + 1}]</span>
                        <span className={styles.optionLabel}>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preferred Formats (Multi-select) */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  What format would help you enjoy and grow in the Word the most? (Select all that apply) <span className={styles.requiredTag}>[REQUIRED]</span>
                </label>
                <div className={styles.optionsGrid}>
                  {PREFERRED_FORMATS.map((opt, idx) => {
                    const isSelected = (formData.preferred_formats || []).includes(opt);
                    return (
                      <div
                        key={opt}
                        className={`${styles.optionCard} ${isSelected ? styles.optionCardActive : ''}`}
                        onClick={() => handleToggleMulti('preferred_formats', opt)}
                      >
                        <input
                          type="checkbox"
                          className={styles.optionInput}
                          checked={isSelected}
                          onChange={() => handleToggleMulti('preferred_formats', opt)}
                        />
                        <span className={styles.optionIndex}>[0{idx + 1}]</span>
                        <span className={styles.optionLabel}>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.buttonRow}>
                <button type="button" className={styles.btnSecondary} onClick={handleBack}>
                  <span className={styles.btnDot} />
                  <span>Back</span>
                </button>
                <button type="button" className={styles.shinyCta} onClick={handleNext}>
                  <span>Next Step &nbsp;&rarr;</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: OPEN OBSERVATIONS & REVIEW */}
          {step === 4 && (
            <motion.div
              key="step-4"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className={styles.stepTitle}>Your Honest Observations &amp; Final Review</h2>
              <p className={styles.stepDescription}>
                Share your personal perspective in your own words before completing your reflection.
              </p>

              {/* Misconception Textarea */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="open_reflection">
                  In your own words, what is the biggest lie or misconception about talking with God that you think discourages believers the most? (Optional)
                </label>
                <textarea
                  id="open_reflection"
                  className={styles.textArea}
                  placeholder="e.g. Believing that prayers are only valid if they last a specific number of minutes, or feeling that God is angry when we don't know what to say..."
                  value={formData.open_reflection}
                  onChange={(e) => handleChange('open_reflection', e.target.value)}
                />
              </div>

              {/* Review Summary Box */}
              <div className={styles.reviewBox}>
                <div className={styles.reviewTitle}>// SUMMARY OF YOUR REFLECTION</div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewKey}>PARTICIPANT</span>
                  <span className={styles.reviewValue}>{formData.full_name}</span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewKey}>DELIVERY_EMAIL</span>
                  <span className={styles.reviewValue}>{formData.email}</span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewKey}>FAITH_WALK</span>
                  <span className={styles.reviewValue}>{formData.faith_status}</span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewKey}>FRICTION_POINTS</span>
                  <span className={styles.reviewValue}>
                    {(formData.prayer_friction_points || []).length} items selected
                  </span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewKey}>OPENNESS_SCORE</span>
                  <span className={styles.reviewValue}>{formData.openness_rating} / 5</span>
                </div>
              </div>

              <div className={styles.buttonRow}>
                <button type="button" className={styles.btnSecondary} onClick={handleBack}>
                  <span className={styles.btnDot} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  className={styles.shinyCta}
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                >
                  <span>{isSubmitting ? 'RECORDING REFLECTION...' : 'COMPLETE & SEND REFLECTION →'}</span>
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

