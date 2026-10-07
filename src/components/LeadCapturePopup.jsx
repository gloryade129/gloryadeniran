'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import confetti from 'canvas-confetti';

export default function LeadCapturePopup() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Don't show on admin or it-dept pages
  const isExcludedPage = pathname?.startsWith('/admin') || pathname?.startsWith('/it-dept');

  useEffect(() => {
    if (isExcludedPage) return;

    // Check if already subscribed in this browser
    const existingSub = localStorage.getItem('glory_subscriber_email');
    if (existingSub) return;

    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem('glory_lead_popup_dismissed');
    if (dismissed) return;

    let hasTriggered = false;

    const handleScroll = () => {
      if (hasTriggered) return;

      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      // When scrolled >= 50% of page height
      const scrollFraction = (scrollTop + windowHeight) / documentHeight;
      if (scrollFraction >= 0.5) {
        hasTriggered = true;
        setIsOpen(true);
        window.removeEventListener('scroll', handleScroll);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname, isExcludedPage]);

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem('glory_lead_popup_dismissed', 'true');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          source: 'scroll_popup_50',
          page: pathname,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Subscription failed');
      }

      // Mark locally as subscribed
      localStorage.setItem('glory_subscriber_email', email.trim().toLowerCase());
      if (name) localStorage.setItem('glory_subscriber_name', name.trim());

      setIsSuccess(true);

      // Trigger happy confetti burst!
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#2563EB', '#38BDF8', '#60A5FA', '#FBBF24'],
        });
      } catch (e) {}

      // Close modal after 2.5s of success
      setTimeout(() => {
        setIsOpen(false);
      }, 2500);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isExcludedPage) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: 'rgba(10, 14, 23, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 'min(460px, calc(100vw - 32px))',
              background: 'var(--bg-card, rgba(16, 24, 44, 0.95))',
              border: '1px solid var(--border-md, rgba(255, 255, 255, 0.14))',
              borderRadius: '24px',
              padding: 'clamp(28px, 6vw, 36px) clamp(18px, 5vw, 32px) clamp(22px, 5vw, 28px)',
              boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
              color: 'var(--white, #F8FAFC)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              type="button"
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--chip-bg, rgba(255, 255, 255, 0.06))',
                border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                color: 'var(--gray-2, #94A3B8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--white, #fff)';
                e.currentTarget.style.borderColor = 'var(--lime, #3B82F6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--gray-2, #94A3B8)';
                e.currentTarget.style.borderColor = 'var(--border, rgba(255, 255, 255, 0.1))';
              }}
            >
              ✕
            </button>

            {/* Happy Smiling Face Mascot */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <motion.div
                animate={{
                  y: [0, -6, 0],
                  rotate: [0, 4, -4, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #FDE047 0%, #EAB308 65%, #CA8A04 100%)',
                  boxShadow: '0 12px 30px rgba(234, 179, 8, 0.35), 0 0 0 4px rgba(253, 224, 71, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {/* Smiling Face SVG */}
                <svg width="60" height="60" viewBox="0 0 100 100" fill="none">
                  {/* Cheerful Eyes */}
                  <motion.ellipse 
                    cx="34" 
                    cy="38" 
                    rx="5" 
                    ry="7" 
                    fill="#1E293B" 
                    animate={{ scaleY: [1, 0.1, 1] }} 
                    transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.05, 0.1] }}
                  />
                  <motion.ellipse 
                    cx="66" 
                    cy="38" 
                    rx="5" 
                    ry="7" 
                    fill="#1E293B" 
                    animate={{ scaleY: [1, 0.1, 1] }} 
                    transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.05, 0.1] }}
                  />
                  
                  {/* Rosy Cheeks */}
                  <circle cx="24" cy="50" r="6" fill="#F87171" opacity="0.6" />
                  <circle cx="76" cy="50" r="6" fill="#F87171" opacity="0.6" />

                  {/* Big Happy Smile */}
                  <path 
                    d="M 30,52 Q 50,78 70,52" 
                    stroke="#1E293B" 
                    strokeWidth="6" 
                    strokeLinecap="round" 
                    fill="none" 
                  />
                </svg>
              </motion.div>
            </div>

            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ padding: '16px 0' }}
              >
                <div style={{ fontSize: '13px', color: 'var(--lime, #3B82F6)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  ✓ CONNECTED TO GLORY
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 600, margin: '0 0 8px' }}>
                  You're in the Inner Circle! 🎉
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--gray-2, #94A3B8)', lineHeight: '1.6', margin: 0 }}>
                  Thanks for connecting. You'll receive early looks at newly launched designs and updates directly in your inbox.
                </p>
              </motion.div>
            ) : (
              <>
                <div 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '4px 12px', 
                    borderRadius: '9999px', 
                    background: 'var(--chip-bg, rgba(255, 255, 255, 0.06))', 
                    border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                    fontSize: '11px',
                    fontFamily: 'var(--mono, monospace)',
                    color: 'var(--lime, #3B82F6)',
                    marginBottom: '12px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--lime, #3B82F6)' }} />
                  Stay Updated
                </div>

                <h3 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                  Loving the Work? Let's Connect! ✨
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--gray-2, #94A3B8)', lineHeight: '1.6', margin: '0 0 24px' }}>
                  Drop your email to receive early project releases, design breakdowns, and creative updates from Glory.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name (Optional)"
                    style={{
                      width: '100%',
                      padding: '13px 18px',
                      borderRadius: '16px',
                      background: 'var(--chip-bg, rgba(255, 255, 255, 0.05))',
                      border: '1px solid var(--border-md, rgba(255, 255, 255, 0.14))',
                      color: 'var(--white, #F8FAFC)',
                      fontSize: '16px',
                      fontFamily: 'var(--font, sans-serif)',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--lime, #3B82F6)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-md, rgba(255, 255, 255, 0.14))'}
                  />

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your Email Address"
                    style={{
                      width: '100%',
                      padding: '13px 18px',
                      borderRadius: '16px',
                      background: 'var(--chip-bg, rgba(255, 255, 255, 0.05))',
                      border: '1px solid var(--border-md, rgba(255, 255, 255, 0.14))',
                      color: 'var(--white, #F8FAFC)',
                      fontSize: '16px',
                      fontFamily: 'var(--font, sans-serif)',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--lime, #3B82F6)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-md, rgba(255, 255, 255, 0.14))'}
                  />

                  {error && (
                    <div style={{ color: '#EF4444', fontSize: '12px', textAlign: 'left', padding: '0 4px' }}>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="shiny-cta"
                    style={{
                      width: '100%',
                      marginTop: '6px',
                      height: '46px',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    <span>{submitting ? 'Connecting...' : 'Keep Me Updated →'}</span>
                  </button>

                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={handleDismiss}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--gray-2, #94A3B8)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: '4px',
                        fontFamily: 'var(--font, sans-serif)',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--white, #fff)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gray-2, #94A3B8)'}
                    >
                      Maybe later
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
