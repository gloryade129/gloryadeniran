'use client';

/**
 * Component: SurveyWizard.js
 * Multi-step survey client for "Beyond Performance: Redefining Prayer & Bible Connection"
 * Design System: Matches gloryadeniran.cv native aesthetic
 * Strictly zero emojis.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import styles from './survey.module.css';

const LOCAL_STORAGE_KEY = 'ga_beyond_performance_draft';

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

// Step 1: Faith Walk Options
const FAITH_OPTIONS = [
  'Committed follower of Christ (Born Again)',
  'Exploring the Christian faith / Asking questions',
  'Previously active, but currently feeling distant or dry',
  'Prefer not to define',
];

// Step 2: Daily Prayer Realities
const PRAYER_REALITIES = [
  'Consistent, peaceful, and life-giving',
  'Maintained as a religious duty, but lacking personal intimacy',
  'Inconsistent: Starting with ambitious goals (e.g., one hour daily) followed by exhaustion and guilt',
  'Currently inactive due to frustration, fatigue, or perceived distance from God',
];

// Step 2: Friction Points (Multi-select)
const FRICTION_POINTS = [
  'Struggling to find words or maintain meaningful focus',
  'The expectation that prayers must meet specific duration targets',
  'Physical tiredness, sleepiness, or mental burnout',
  'Feeling as though God is silent or uninterested in my requests',
  'Fear of being inadequate or performing the act incorrectly',
];

// Step 3: Bible Reading Status
const BIBLE_STATUS_OPTIONS = [
  'Consistent personal study with clarity and application',
  'Reading out of obligation or checklist completion',
  'Infrequent reading due to difficulty understanding the text',
  'Relying almost entirely on sermon summaries and devotionals',
];

// Step 3: Preferred Formats (Multi-select)
const PREFERRED_FORMATS = [
  'Structured reading plans via the YouVersion Bible App',
  'Topical studies addressing specific emotional and spiritual hurdles',
  'Verse-by-verse expository study guides',
  'Audio scriptures and quiet reflection exercises',
];

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export default function SurveyWizard() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // 1. Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // 2. Persist draft to localStorage on change (except when completed)
  useEffect(() => {
    if (!submissionResult) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
      } catch (e) {
        // Ignore quota errors
      }
    }
  }, [formData, submissionResult]);

  // Handle simple input change
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationError('');
  };

  // Handle multi-select toggle
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

  // Step Validation logic
  const validateStep = (currentStep) => {
    setValidationError('');

    if (currentStep === 0) {
      if (!formData.privacy_accepted) {
        setValidationError('Please review and confirm the privacy acknowledgment to proceed.');
        return false;
      }
      return true;
    }

    if (currentStep === 1) {
      if (!formData.full_name || formData.full_name.trim().length < 2) {
        setValidationError('Please enter your full name (at least 2 characters).');
        return false;
      }
      const email = (formData.email || '').trim();
      if (!email || !EMAIL_REGEX.test(email)) {
        setValidationError('Please enter a valid email address so we can send your reflection resources.');
        return false;
      }
      if (!formData.faith_status) {
        setValidationError('Please select where you currently find yourself in your faith walk.');
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
        setValidationError('Please select at least one primary source of friction or pressure in prayer.');
        return false;
      }
      return true;
    }

    if (currentStep === 3) {
      if (!formData.bible_reading_status) {
        setValidationError('Please select your current experience with reading Scripture.');
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

  // Final Form Submission
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

      // Success
      setSubmissionResult(data);
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (e) {}

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setValidationError(err.message || 'A network error occurred. Please check your connection and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animation variants
  const slideVariants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: 'easeIn' } },
  };

  // Render Confirmation Screen upon completion
  if (submissionResult) {
    return (
      <div className={styles.card}>
        <div className={styles.completionCard}>
          <div className={styles.successBadge}>
            [✓] SUBMISSION_RECORDED
          </div>
          <h2 className={styles.completionTitle}>Reflection Received.</h2>
          <p className={styles.completionSubtitle}>
            Thank you, {formData.full_name.split(' ')[0]}. Your candid reflections have been securely recorded.
          </p>

          {/* Scripture Anchor */}
          <div className={styles.scriptureCompletion}>
            <p className={styles.scriptureCompletionText}>
              "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."
            </p>
            <div className={styles.scriptureCompletionRef}>Philippians 4:6-7</div>
          </div>

          {/* Segment Identification */}
          <div className={styles.hostNoteCard} style={{ textAlign: 'left', marginBottom: '24px' }}>
            <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--lime)', fontWeight: '700', marginBottom: '6px' }}>
              [FOCUS_PATHWAY]
            </div>
            <h3 style={{ fontSize: '17px', color: 'var(--white)', fontWeight: '600', marginBottom: '6px', letterSpacing: '-0.02em' }}>
              {submissionResult.segmentTitle || 'Spiritual Renewal & Growth'}
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--gray-1)', margin: 0, lineHeight: 1.55 }}>
              {submissionResult.segmentSubtitle || 'Tailored insights designed to take you beyond religious performance and into genuine rest.'}
            </p>
          </div>

          {/* Email Dispatch Notice */}
          <div className={styles.emailNoticeCard}>
            A comprehensive follow-up guide, personal encouragement, and direct links to curated YouVersion Bible App reading plans have been dispatched to <strong>{formData.email}</strong>.
          </div>

          <div style={{ marginTop: '28px' }}>
            <Link href="/" className={styles.shinyCta}>
              <span>Return to Portfolio &nbsp;→</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate progress percentage
  const progressPercent = step === 0 ? 0 : Math.round((step / 4) * 100);

  return (
    <>
      {/* Header Bar */}
      <div className={styles.headerBar}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowBar} />
          <span className={styles.eyebrowTag}>01 / SPIRITUAL SURVEY</span>
          <span>RESEARCH &amp; REFLECTION</span>
        </div>
        <h1 className={styles.mainTitle}>
          Beyond <em>Performance.</em>
        </h1>
        <p className={styles.subTitle}>
          Redefining Prayer &amp; Bible Connection · Exploring honest rhythms free from performance pressure.
        </p>
      </div>

      {/* Progress Bar (Visible on Steps 1 to 4) */}
      {step > 0 && (
        <div className={styles.progressContainer}>
          <div className={styles.progressMeta}>
            <span className={styles.stepIndicator}>
              STEP 0{step} / 04 · {step === 1 ? 'IDENTITY' : step === 2 ? 'PRAYER REALITY' : step === 3 ? 'SCRIPTURAL STUDY' : 'REVIEW & OBSERVATIONS'}
            </span>
            <span className={styles.stepPercentage}>{progressPercent}%</span>
          </div>
          <div className={styles.trackBar}>
            <div
              className={styles.trackFill}
              style={{ width: `${progressPercent}%` }}
            />
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
              {/* Host Note */}
              <div className={styles.hostNoteCard}>
                <div className={styles.hostHeader}>
                  <div className={styles.hostAvatar}>GA</div>
                  <div className={styles.hostInfo}>
                    <div className={styles.hostName}>Glory Adeniran</div>
                    <div className={styles.hostRole}>HOST &amp; CREATIVE LEAD</div>
                  </div>
                </div>
                <p className={styles.hostQuote}>
                  "Prayer was never designed to be an exhausting performance, a rigid routine, or an endurance test against a stopwatch. It is fundamentally an honest conversation with God. This survey exists to explore where our daily practices get burdened by pressure, and how we can return to genuine fellowship."
                </p>
              </div>

              {/* Scripture Anchor */}
              <div className={styles.scriptureAnchorBox}>
                <div className={styles.scriptureVerse}>
                  "Come to me, all you who are weary and burdened, and I will give you rest."
                </div>
                <div className={styles.scriptureRef}>Matthew 11:28</div>
              </div>

              {/* Privacy & Data Use Transparency Container */}
              <div className={styles.privacyBox}>
                <div className={styles.privacyHeading}>
                  <span className={styles.privacyHeadingDot} />
                  DATA TRANSPARENCY &amp; CONFIDENTIALITY POLICY
                </div>
                <ul className={styles.privacyList}>
                  <li>
                    <strong>Purpose of Data Collection:</strong> Your name and email address are collected solely to deliver your personalized reflection summary, tailored study recommendations, and optional follow-up resources.
                  </li>
                  <li>
                    <strong>Strict Confidentiality:</strong> Your individual responses, spiritual reflections, and personal answers remain confidential and will never be shared, sold, rented, or made public.
                  </li>
                  <li>
                    <strong>Zero Spam Commitment:</strong> We respect your inbox. You will only receive direct, relevant materials relating to this study.
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
                    I understand how my information will be used and agree to proceed.
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
                  <span>Proceed to Reflection &nbsp;→</span>
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
              <h2 className={styles.stepTitle}>Participant Identity</h2>
              <p className={styles.stepDescription}>
                Provide your contact details so we can deliver your personalized next steps.
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
                  placeholder="e.g. John Doe"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  autoFocus
                />
              </div>

              {/* Email Address */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="email">
                  Email Address <span className={styles.requiredTag}>[REQUIRED]</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className={styles.textInput}
                  placeholder="e.g. yourname@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
                <div className={styles.fieldHint}>
                  // Personalized study recommendations will be dispatched to this inbox.
                </div>
              </div>

              {/* Faith Walk */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Current Faith Journey <span className={styles.requiredTag}>[REQUIRED]</span>
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
                  Local Assembly or Fellowship Community (Optional)
                </label>
                <input
                  id="church_name"
                  type="text"
                  className={styles.textInput}
                  placeholder="Name of your local church, fellowship, or student assembly (if applicable)"
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
                  <span>Next Step &nbsp;→</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: HONEST REFLECTIONS ON PRAYER */}
          {step === 2 && (
            <motion.div
              key="step-2"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <h2 className={styles.stepTitle}>Honest Reality in Prayer</h2>
              <p className={styles.stepDescription}>
                Be completely candid. There are no right or wrong answers.
              </p>

              {/* Daily Prayer Reality */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Current Reality with Daily Prayer <span className={styles.requiredTag}>[REQUIRED]</span>
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

              {/* Points of Friction (Multi-select) */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Primary Points of Friction or Pressure (Select all that apply) <span className={styles.requiredTag}>[REQUIRED]</span>
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
                  Conversational Transparency with God (Scale 1 to 5) <span className={styles.requiredTag}>[REQUIRED]</span>
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
                      1: Completely guarded; relying on formal or scripted phrasing
                    </span>
                    <span className={styles.scaleLabelRight}>
                      5: Completely vulnerable; speaking openly without filters
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
                  <span>Next Step &nbsp;→</span>
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
              <h2 className={styles.stepTitle}>Scriptural Engagement &amp; Bible Study</h2>
              <p className={styles.stepDescription}>
                How you currently connect with Scripture and what formats serve you best.
              </p>

              {/* Bible Reading Status */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Current Approach to Reading Scripture <span className={styles.requiredTag}>[REQUIRED]</span>
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
                  Preferred Formats for Spiritual Growth (Select all that apply) <span className={styles.requiredTag}>[REQUIRED]</span>
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
                  <span>Next Step &nbsp;→</span>
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
              <h2 className={styles.stepTitle}>Open Observations &amp; Final Review</h2>
              <p className={styles.stepDescription}>
                Share your personal perspective before completing the reflection.
              </p>

              {/* Misconception Textarea */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="open_reflection">
                  In your own words, what is the single biggest misconception about talking with God that you believe causes people to give up? (Optional)
                </label>
                <textarea
                  id="open_reflection"
                  className={styles.textArea}
                  placeholder="e.g. Believing that prayers are only valid if they last a certain number of minutes, or thinking God is easily offended by our questions..."
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
                  <span>{isSubmitting ? 'RECORDING REFLECTION...' : 'COMPLETE & SUBMIT →'}</span>
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </>
  );
}
