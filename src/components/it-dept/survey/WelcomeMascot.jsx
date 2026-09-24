'use client';
import React, { useState, useEffect } from 'react';
import { Sparkles, X, ChevronRight } from 'lucide-react';

export const WelcomeMascot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isWiggling, setIsWiggling] = useState(false);

  const tips = [
    "Welcome, 200L IT Scholar! Shape our class and make this semester legendary.",
    "Your honest feedback directly guides the Class Rep and Assistant Class Rep.",
    "Sign up for creative committees or volunteer roles to build real projects this session!",
  ];

  // Auto popup after 800ms on first mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleNextTip = () => {
    setIsWiggling(true);
    setQuoteIndex((prev) => (prev + 1) % tips.length);
    setTimeout(() => setIsWiggling(false), 500);
  };

  return (
    <>
      <style>{`
        @keyframes mascotFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes mascotWave {
          0%, 100% { transform: rotate(0deg); transform-origin: 82px 64px; }
          25% { transform: rotate(18deg); transform-origin: 82px 64px; }
          75% { transform: rotate(-10deg); transform-origin: 82px 64px; }
        }
        @keyframes eyeBlink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes popupSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .mascot-container {
          animation: mascotFloat 3.2s ease-in-out infinite;
        }
        .mascot-waving-arm {
          animation: mascotWave 1.8s ease-in-out infinite;
        }
        .mascot-eye {
          animation: eyeBlink 3.6s ease-in-out infinite;
          transform-origin: 50% 50%;
        }
        .it-mascot-popup {
          animation: popupSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Floating Pill / Trigger Button when minimized */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 60,
            background: 'rgba(17, 21, 36, 0.95)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6), 0 0 16px rgba(37, 99, 235, 0.25)',
            borderRadius: '9999px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#FFFFFF',
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.2s ease',
            fontFamily: 'Montserrat, sans-serif',
          }}
          className="it-btn-interactive"
          aria-label="Open Byte 200L Companion"
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#3B82F6',
              boxShadow: '0 0 8px #3B82F6',
            }}
          />
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#EDEDED' }}>
            Byte · 200L Companion
          </span>
        </button>
      )}

      {/* Interactive Pop-up Modal / Dialog */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 60,
            width: '340px',
            maxWidth: 'calc(100vw - 32px)',
            background: 'rgba(17, 21, 36, 0.96)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            borderRadius: '16px',
            boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(37, 99, 235, 0.2)',
            overflow: 'hidden',
            fontFamily: 'Montserrat, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
          className="it-mascot-popup"
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#3B82F6',
                  boxShadow: '0 0 6px #3B82F6',
                }}
              />
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#60A5FA',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Byte · 200L Companion
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
              }}
              aria-label="Close Byte pop-up"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 14px', textAlign: 'center' }}>
            {/* Animated SVG Byte Avatar with Blue Theme */}
            <div
              className="mascot-container"
              onClick={handleNextTip}
              style={{
                width: '76px',
                height: '76px',
                margin: '0 auto 12px',
                cursor: 'pointer',
                transform: isWiggling ? 'scale(1.1) rotate(5deg)' : 'scale(1)',
                transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Mortarboard Hat */}
                <path d="M50 14L84 27L50 40L16 27L50 14Z" fill="#1E293B" stroke="#3B82F6" strokeWidth="2.5" />
                <path d="M28 32V42C28 47 38 51 50 51C62 51 72 47 72 42V32" fill="#0F172A" stroke="#3B82F6" strokeWidth="2" />
                <path d="M78 30V48" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
                <circle cx="78" cy="50" r="2.5" fill="#FBBF24" />

                {/* Head Monitor */}
                <rect x="22" y="44" width="56" height="42" rx="14" fill="#0A0E1A" stroke="#3B82F6" strokeWidth="2.5" />

                {/* Blinking Cyber Eyes - Blue */}
                <g className="mascot-eye">
                  <ellipse cx="38" cy="62" rx="4.5" ry="6" fill="#60A5FA" />
                  <circle cx="36.5" cy="59.5" r="1.5" fill="#FFFFFF" />
                  <ellipse cx="62" cy="62" rx="4.5" ry="6" fill="#60A5FA" />
                  <circle cx="60.5" cy="59.5" r="1.5" fill="#FFFFFF" />
                </g>

                {/* Smiling Mouth */}
                <path d="M44 74C46.5 77 53.5 77 56 74" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />

                {/* 200L Badge on screen */}
                <rect x="41" y="80" width="18" height="5" rx="2.5" fill="rgba(37, 99, 235, 0.25)" />
                <text x="50" y="84" fontSize="4.2" fill="#93C5FD" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  200L
                </text>

                {/* Waving Right Hand */}
                <g className="mascot-waving-arm">
                  <path d="M78 65C83 60 88 56 90 51" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="91" cy="49" r="3.5" fill="#3B82F6" />
                </g>
              </svg>
            </div>

            {/* Speech Tip */}
            <div
              onClick={handleNextTip}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: '12px',
                cursor: 'pointer',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#E2E8F0', lineHeight: 1.45, fontWeight: 500 }}>
                "{tips[quoteIndex]}"
              </p>
              <span style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: '4px', display: 'block' }}>
                (Tap for another tip)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="it-btn-primary"
              style={{
                width: '100%',
                minHeight: '38px',
                fontSize: '0.8125rem',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 600,
              }}
            >
              <span>Got it! Let's Fill Survey</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
export default WelcomeMascot;
